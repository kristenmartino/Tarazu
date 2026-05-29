import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const makeRequest = (body) => ({ json: () => Promise.resolve(body) });
const okText = (obj) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text: JSON.stringify(obj) }] }),
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  process.env.ANTHROPIC_API_KEY = "sk-test";
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
