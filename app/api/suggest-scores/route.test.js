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
const assessment = score => ({ score, justification: "reason", evidence: [], assumptions: [], gaps: [], nextAction: "Validate audience", claimReviews: [], followUp: score === null ? {question:"How many eligible accounts are there?", whyItChangesScore:"The audience share determines the reach band.", claimIds:[]} : null });
const okText = (obj) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text: JSON.stringify(Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, { ...assessment(v.score), ...v }]))) }] }),
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
      reach: { score: 55, justification: "broad" },
      impact: { score: 75, justification: "meaningful" },
      confidence: { score: 50, justification: "some data" },
      effort: { score: 35, justification: "moderate" },
    }));
    const res = await POST(makeRequest({ featureName: "Search" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reach.score).toBe(55);
    expect(data.impact.justification).toBe("meaningful");
  });

  it("rejects out-of-range scores rather than silently clamping", async () => {
    fetch.mockResolvedValue(okText({ reach: assessment(250) }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach"] }));
    expect(res.status).toBe(502);
  });
  it("repairs arbitrary precision and sends the shared rubric with candidate answers", async () => {
    fetch.mockResolvedValueOnce(okText({reach:assessment(42)})).mockResolvedValueOnce(okText({reach:{...assessment(35), evidence:['scoring:rubric', 'candidate:unsaved']}}));
    const res = await POST(makeRequest({featureName:'Reminders', dimensions:['reach'], productContext:{scoring:{timeframe:'90 days', audience:'100 accounts'}}, scoringBasis:{reach:'30 accounts; estimate'}}));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reach.score).toBe(35);
    expect(data.context.candidate.scoringBasis.reach).toBe('30 accounts; estimate');
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('30 accounts; estimate');
    expect(prompt).toContain('About 30% of the workspace audience');
    expect(prompt).toContain('return reach:null');
    expect(JSON.parse(fetch.mock.calls[1][1].body).messages[2].content).toContain('Use a shared anchor score');
  });
  it("supports insufficient information without a default score", async () => {
    fetch.mockResolvedValue(okText({ reach: assessment(null) }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach"], productContext: { constraints: "No engineers", successMetrics: "Retention" } }));
    expect((await res.json()).reach.score).toBeNull();
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('No engineers'); expect(prompt).toContain('Retention');
  });
  it("rejects invented evidence references", async () => {
    fetch.mockResolvedValue(okText({ reach: { ...assessment(50), evidence: ['signal:invented'] } }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach"] }));
    expect(res.status).toBe(502);
  });

  it("repairs assessment narration before returning a score suggestion", async () => {
    fetch.mockResolvedValueOnce(okText({ confidence: { ...assessment(20), justification: 'The draft decision notes four of seven opportunity dimensions remain unassessed.' } }))
      .mockResolvedValueOnce(okText({ confidence: { ...assessment(20), justification: 'Synthetic interviews conflict on the cause of delays.' } }));
    const res = await POST(makeRequest({ featureName: 'Reminders', dimensions: ['confidence'] }));
    expect(res.status).toBe(200);
    expect((await res.json()).confidence.justification).toBe('Synthetic interviews conflict on the cause of delays.');
    expect(fetch).toHaveBeenCalledTimes(2);
    const messages = JSON.parse(fetch.mock.calls[1][1].body).messages;
    expect(messages[2].content).toContain('confidence.justification: Do not narrate validation assessment');
  });

  it("returns no suggestions if the repair still narrates assessment counts", async () => {
    fetch.mockResolvedValue(okText({ confidence: { ...assessment(20), gaps: ['4 of 7 dimensions unassessed.'] } }));
    const res = await POST(makeRequest({ featureName: 'Reminders', dimensions: ['confidence'] }));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ category: 'invalid_response' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("requires a feature name", async () => {
    const res = await POST(makeRequest({ featureName: "" }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends source-linked claims with checked provenance and rejects an invented claim review', async () => {
    const claim = {id:'c1',dimension:'reach',text:'30 accounts; forecast',kind:'estimate',sources:[{signalId:'s1',relation:'supports',quote:'30 accounts'}]};
    const body = {featureName:'Reminders',dimensions:['reach'],scoringBasis:{claims:[claim]},signals:[{id:'s1',body:'30 accounts'}]};
    fetch.mockResolvedValue(okText({reach:{...assessment(35),claimReviews:[{claimId:'made-up',status:'supported',explanation:'A source',evidence:['signal:s1']}]}}));
    expect((await POST(makeRequest(body))).status).toBe(502);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('Excerpt matches source');
    expect(prompt).toContain('30 accounts; forecast');
    expect(prompt).toContain('A complaint about a problem does not establish its prevalence');
  });

  it('rejects malformed scoring claims before billing AI', async () => {
    const response = await POST(makeRequest({featureName:'Reminders',scoringBasis:{claims:[{kind:'verified'}]}}));
    expect(response.status).toBe(400);
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
