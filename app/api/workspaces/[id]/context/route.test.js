import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("../../../../../lib/api-auth", () => ({
  withAuth: vi.fn((handler) => handler("test-user-id", mockSupabase)),
  verifyWorkspaceOwner: vi.fn(() => Promise.resolve(true)),
}));

import { GET, PUT } from "./route";
import { verifyWorkspaceOwner } from "../../../../../lib/api-auth";

const makeParams = (id) => ({ params: Promise.resolve({ id }) });
function makeRequest(body) {
  return { json: () => Promise.resolve(body) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workspaces/[id]/context", () => {
  it("returns context with camelCase keys", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              product_summary: "A tool",
              target_users: "PMs",
              strategic_priorities: "Growth",
              constraints: "Budget",
              assumptions: "Market fit",
              success_metrics: "DAU",
            },
            error: null,
          }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    const data = await response.json();

    expect(data.productSummary).toBe("A tool");
    expect(data.targetUsers).toBe("PMs");
    expect(data.strategicPriorities).toBe("Growth");
    expect(data.constraints).toBe("Budget");
    expect(data.assumptions).toBe("Market fit");
    expect(data.successMetrics).toBe("DAU");
  });

  it("returns empty strings for null values", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              product_summary: null,
              target_users: null,
              strategic_priorities: null,
              constraints: null,
              assumptions: null,
              success_metrics: null,
            },
            error: null,
          }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    const data = await response.json();

    expect(data.productSummary).toBe("");
    expect(data.targetUsers).toBe("");
    expect(data.strategicPriorities).toBe("");
    expect(data.constraints).toBe("");
    expect(data.assumptions).toBe("");
    expect(data.successMetrics).toBe("");
  });

  it("returns 404 when ownership fails", async () => {
    verifyWorkspaceOwner.mockResolvedValueOnce(false);
    const response = await GET({}, makeParams("ws-bad"));
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "DB error" },
          }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("DB error");
  });
});

describe("PUT /api/workspaces/[id]/context", () => {
  it("updates context and returns ok", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const request = makeRequest({
      productSummary: "Updated tool",
      targetUsers: "Engineers",
      strategicPriorities: "Retention",
      constraints: "Timeline",
      assumptions: "PMF",
      successMetrics: "NPS",
    });

    const response = await PUT(request, makeParams("ws-1"));
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      product_summary: "Updated tool",
      target_users: "Engineers",
      strategic_priorities: "Retention",
      constraints: "Timeline",
      assumptions: "PMF",
      success_metrics: "NPS",
    });
  });

  it("uses empty strings for missing values", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const response = await PUT(makeRequest({}), makeParams("ws-1"));
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      product_summary: "",
      target_users: "",
      strategic_priorities: "",
      constraints: "",
      assumptions: "",
      success_metrics: "",
    });
  });

  it("returns 404 when ownership fails", async () => {
    verifyWorkspaceOwner.mockResolvedValueOnce(false);
    const response = await PUT(makeRequest({}), makeParams("ws-bad"));
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "Update failed" } });
    mockSupabase.from.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

    const response = await PUT(makeRequest({}), makeParams("ws-1"));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Update failed");
  });
});


it("persists optional decision framing in scoring_settings and rejects oversized framing before a write", async () => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  mockSupabase.from.mockReturnValue({ update });
  const scoring = { decisionQuestion: "Which response should we test?", problem: "Request context is missing", audience: "Admins", timeframe: "30 days", impactMetric: "Completeness; baseline unknown", effortBands: { 35: "Five person-days" } };
  expect((await PUT(makeRequest({ constraints: "Keep existing constraints", scoring }), makeParams("ws-1"))).status).toBe(200);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ constraints: "Keep existing constraints", scoring_settings: scoring }));
  update.mockClear();
  expect((await PUT(makeRequest({ scoring: { decisionQuestion: "x".repeat(701) } }), makeParams("ws-1"))).status).toBe(400);
  expect(update).not.toHaveBeenCalled();
  mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { scoring_settings: scoring, constraints: "Keep existing constraints" }, error: null }) }) }) });
  const loaded = await (await GET({}, makeParams("ws-1"))).json();
  expect(loaded.scoring).toEqual(scoring);
  expect(loaded.constraints).toBe("Keep existing constraints");
});
