import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const makeRequest = (body) => ({ json: () => Promise.resolve(body) });

const validAnalysis = {
  summary: "Healthy backlog.",
  topPick: { name: "A", reason: "highest score", confidence: "high" },
  riskFlag: { name: "B", reason: "low confidence", confidence: "low" },
  quickWin: { name: "C", reason: "cheap and useful", confidence: "medium" },
  sprintPlan: ["A", "C", "B"],
  insight: "Validate the low-confidence items first.",
};
const okText = (obj) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text: JSON.stringify(obj) }] }),
});
const okRaw = (text) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text }] }),
});

const features = [
  { name: "A", reach: 80, impact: 70, confidence: 90, effort: 30, score: 1000 },
  { name: "B", reach: 40, impact: 40, confidence: 40, effort: 60, score: 100 },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  process.env.ANTHROPIC_API_KEY = "sk-test";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_MODEL_ANALYSIS;
});

describe("POST /api/analyze", () => {
  it("returns the analysis on success", async () => {
    fetch.mockResolvedValueOnce(okText(validAnalysis));
    const res = await POST(makeRequest({ features }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.topPick.name).toBe("A");
    expect(data.sprintPlan).toEqual(["A", "C", "B"]);
  });

  it("rejects fewer than 2 features with 400", async () => {
    const res = await POST(makeRequest({ features: [features[0]] }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects too many features with 413", async () => {
    const many = Array.from({ length: 201 }, (_, i) => ({ ...features[0], name: `F${i}` }));
    const res = await POST(makeRequest({ features: many }));
    expect(res.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps an upstream error to a categorized response", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });
    const res = await POST(makeRequest({ features }));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.category).toBe("upstream");
  });

  it("returns 500 config error when API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(makeRequest({ features }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.category).toBe("config");
  });

  it("sends the default model id to Anthropic when ANTHROPIC_MODEL_ANALYSIS is unset", async () => {
    delete process.env.ANTHROPIC_MODEL_ANALYSIS;
    fetch.mockResolvedValueOnce(okText(validAnalysis));
    const res = await POST(makeRequest({ features }));
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.model).toBe("claude-opus-4-8");
  });

  it("succeeds after one repair retry when the first response is malformed", async () => {
    fetch
      .mockResolvedValueOnce(okRaw("not json at all"))
      .mockResolvedValueOnce(okText(validAnalysis));
    const res = await POST(makeRequest({ features }));
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    const data = await res.json();
    expect(data.topPick.name).toBe("A");
    expect(data.sprintPlan).toEqual(["A", "C", "B"]);
  });
});
