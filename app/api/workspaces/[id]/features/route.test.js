import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("../../../../../lib/api-auth", () => ({
  withAuth: vi.fn((handler) => handler("test-user-id", mockSupabase)),
  verifyWorkspaceOwner: vi.fn(() => Promise.resolve(true)),
}));

import { GET, POST, PUT } from "./route";
import { verifyWorkspaceOwner } from "../../../../../lib/api-auth";

const makeParams = (id) => ({ params: Promise.resolve({ id }) });
function makeRequest(body, url) {
  return {
    json: () => Promise.resolve(body),
    url: url || "http://localhost/api/workspaces/ws-1/features",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workspaces/[id]/features", () => {
  it("returns features list with mapped fields", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: "f-1", name: "Auth", description: "Login", reach: 80, impact: 70, confidence: 90, effort: 30, owner: "Bob", theme: "Core", status: "active", position: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-02T00:00:00Z" },
              { id: "f-2", name: "Search", description: null, reach: 50, impact: 50, confidence: 50, effort: 50, owner: null, theme: null, status: null, position: 1, created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z" },
            ],
            error: null,
          }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    const data = await response.json();

    expect(data.features).toHaveLength(2);
    expect(data.features[0]).toEqual({
      id: "f-1", name: "Auth", description: "Login",
      reach: 80, impact: 70, confidence: 90, effort: 30,
      owner: "Bob", theme: "Core", status: "active",
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-02T00:00:00Z",
    });
    expect(data.features[1].owner).toBeNull();
    expect(data.manualOrder).toEqual(["f-1", "f-2"]);
  });

  it("returns created_at and updated_at timestamps", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: "f-1", name: "Auth", description: "", reach: 50, impact: 50, confidence: 50, effort: 50, owner: null, theme: null, status: null, position: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-02T00:00:00Z" },
            ],
            error: null,
          }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    const data = await response.json();
    expect(data.features[0].created_at).toBe("2026-01-01T00:00:00Z");
    expect(data.features[0].updated_at).toBe("2026-02-02T00:00:00Z");
  });

  it("returns empty arrays when no features", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    const data = await response.json();
    expect(data.features).toEqual([]);
    expect(data.manualOrder).toEqual([]);
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
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "DB failed" },
          }),
        }),
      }),
    });

    const response = await GET({}, makeParams("ws-1"));
    expect(response.status).toBe(500);
  });
});

describe("POST /api/workspaces/[id]/features", () => {
  it("inserts new feature and returns 201 with id", async () => {
    // Mock position lookup
    const fromCalls = [];
    mockSupabase.from.mockImplementation((table) => {
      if (table === "features" && fromCalls.length === 0) {
        fromCalls.push("position");
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ position: 2 }] }),
              }),
            }),
          }),
        };
      }
      if (table === "features") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ position: 2 }] }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "new-uuid" }, error: null }),
            }),
          }),
        };
      }
      if (table === "feature_revisions") {
        return { insert: vi.fn().mockResolvedValue({ error: null }), select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) }) };
      }
      return {};
    });

    const request = makeRequest({
      name: "New Feature",
      description: "Test",
      reach: 60, impact: 70, confidence: 80, effort: 40,
    });

    const response = await POST(request, makeParams("ws-1"));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBe("new-uuid");
  });

  it("returns 404 when ownership fails", async () => {
    verifyWorkspaceOwner.mockResolvedValueOnce(false);
    const response = await POST(makeRequest({ name: "Test" }), makeParams("ws-bad"));
    expect(response.status).toBe(404);
  });

  it("snapshots owner/theme/status in the created revision", async () => {
    const revisionInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table) => {
      if (table === "features") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ position: 0 }] }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "new-uuid" }, error: null }),
            }),
          }),
        };
      }
      if (table === "feature_revisions") {
        return {
          insert: revisionInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const request = makeRequest({
      name: "Owned Feature", description: "",
      reach: 60, impact: 70, confidence: 80, effort: 40,
      owner: "Alice", theme: "Growth", status: "active",
    });

    const response = await POST(request, makeParams("ws-1"));
    expect(response.status).toBe(201);
    expect(revisionInsert).toHaveBeenCalledTimes(1);
    expect(revisionInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_owner: "Alice",
        snapshot_theme: "Growth",
        snapshot_status: "active",
        change_type: "created",
      })
    );
  });
});

describe("PUT /api/workspaces/[id]/features (bulk positions)", () => {
  it("updates positions and returns ok", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const request = makeRequest({ orderedIds: ["f-2", "f-1", "f-3"] });
    const response = await PUT(request, makeParams("ws-1"));
    const data = await response.json();

    expect(data.ok).toBe(true);
  });

  it("returns 400 when orderedIds is not an array", async () => {
    const request = makeRequest({ orderedIds: "not-array" });
    const response = await PUT(request, makeParams("ws-1"));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("orderedIds required");
  });

  it("returns 404 when ownership fails", async () => {
    verifyWorkspaceOwner.mockResolvedValueOnce(false);
    const response = await PUT(makeRequest({ orderedIds: [] }), makeParams("ws-bad"));
    expect(response.status).toBe(404);
  });
});
