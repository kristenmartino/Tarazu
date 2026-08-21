import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// This route bills the Anthropic API per call, so it is gated behind Clerk
// AND a per-user daily quota (lib/api-auth.js's withUser), which needs
// Supabase. vi.mock intercepts the dynamic import inside getUserId() and the
// static import of lib/supabase. Both default to "authenticated, well under
// quota"; the describe blocks below override one or the other.
const { mockAuth, mockGetSupabase } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetSupabase: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("../../../lib/supabase", () => ({ getSupabase: mockGetSupabase }));

import { POST } from "./route";

/** Chainable Supabase stub: the quota count query always returns `count`, and insert is a no-op success. Mirrors fakeQuotaSupabase in lib/api-auth.test.js, which covers the quota mechanism itself exhaustively — this file only needs enough to keep the AI-response tests unblocked and to prove the route is actually wired to it. */
const fakeSupabase = (count = 0) => ({
  from: () => ({
    select: () => ({ eq: () => ({ gte: async () => ({ count, error: null }) }) }),
    insert: async () => ({ error: null }),
  }),
});

const makeRequest = (body) => ({ json: () => Promise.resolve(body) });
const okText = (obj) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text: JSON.stringify(obj) }] }),
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  process.env.ANTHROPIC_API_KEY = "sk-test";
  mockAuth.mockResolvedValue({ userId: "user_test" });
  mockGetSupabase.mockReturnValue(fakeSupabase(0));
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

describe("POST /api/suggest-scores", () => {
  it("returns scored dimensions on success", async () => {
    fetch.mockResolvedValueOnce(okText({
      reach: { score: 60, justification: "broad" },
      impact: { score: 75, justification: "meaningful" },
      confidence: { score: 50, justification: "some data" },
      effort: { score: 40, justification: "moderate" },
    }));
    const res = await POST(makeRequest({ featureName: "Search" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reach.score).toBe(60);
    expect(data.impact.justification).toBe("meaningful");
  });

  it("clamps out-of-range scores to 1-100", async () => {
    fetch.mockResolvedValueOnce(okText({
      reach: { score: 250, justification: "too high" },
      impact: { score: -5, justification: "too low" },
    }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach", "impact"] }));
    const data = await res.json();
    expect(data.reach.score).toBe(100);
    expect(data.impact.score).toBe(1);
  });

  it("requires a feature name", async () => {
    const res = await POST(makeRequest({ featureName: "" }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when no valid dimensions are requested", async () => {
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["bogus"] }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps a rate limit to a categorized 429", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) });
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.category).toBe("rate_limit");
  });
});

describe("POST /api/suggest-scores — auth gate", () => {
  it("rejects an anonymous caller with 401 and never calls the AI API", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("auth_required");
    // The point of the gate: an anonymous request must cost nothing upstream.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when Clerk is not configured at all (guest mode)", async () => {
    mockAuth.mockRejectedValue(new Error("Missing publishableKey"));
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("control: the same request succeeds once authenticated", async () => {
    // Guards against the 401s above passing for an unrelated reason (a bad
    // body, a defeated mock). If this fails, the gate tests prove nothing.
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/suggest-scores — quota gate", () => {
  // The quota mechanism itself (boundary, recording, fail-closed behavior) is
  // covered exhaustively in lib/api-auth.test.js. This just proves the route
  // is actually wired to it under the right name, and distinguishes it from
  // the OTHER 429 this route can return (Anthropic's own rate limit, tested
  // above as "maps a rate limit to a categorized 429" — that one carries
  // `category: "rate_limit"`, this one carries `code: "quota_exceeded"`).
  it("refuses with 429 once the caller is at the daily limit, and never calls the AI API", async () => {
    mockGetSupabase.mockReturnValue(fakeSupabase(50));
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("quota_exceeded");
    expect(fetch).not.toHaveBeenCalled();
  });
});
