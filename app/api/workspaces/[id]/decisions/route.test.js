import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("../../../../../lib/api-auth", () => ({
  withAuth: vi.fn((handler) => handler("test-user-id", mockSupabase)),
  verifyWorkspaceOwner: vi.fn(() => Promise.resolve(true)),
}));

import { GET, POST } from "./route";
import { verifyWorkspaceOwner } from "../../../../../lib/api-auth";

const makeParams = (id) => ({ params: Promise.resolve({ id }) });
function makeRequest(body, url) {
  return {
    json: () => Promise.resolve(body),
    url: url || "http://localhost/api/workspaces/ws-1/decisions",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workspaces/[id]/decisions", () => {
  it("returns decisions list", async () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "d-1", title: "Ship auth", status: "approved" },
          { id: "d-2", title: "Defer search", status: "draft" },
        ],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    const response = await GET(makeRequest(null, "http://localhost/api/workspaces/ws-1/decisions"), makeParams("ws-1"));
    const data = await response.json();

    expect(data.decisions).toHaveLength(2);
    expect(data.decisions[0].title).toBe("Ship auth");
  });

  it("filters by status query param", async () => {
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "d-1", title: "Ship auth", status: "approved" }],
      error: null,
    });
    const mockQuery = { eq: mockEq, order: mockOrder };
    // Chain: select -> eq(workspace_id) -> order -> eq(status)
    // The route does: query.eq("status", status) after order
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "d-1", title: "Ship auth", status: "approved" }],
              error: null,
            }),
          }),
        }),
      }),
    });

    const response = await GET(
      makeRequest(null, "http://localhost/api/workspaces/ws-1/decisions?status=approved"),
      makeParams("ws-1")
    );
    const data = await response.json();
    expect(data.decisions).toHaveLength(1);
  });

  it("returns 404 when ownership fails", async () => {
    verifyWorkspaceOwner.mockResolvedValueOnce(false);
    const response = await GET(
      makeRequest(null, "http://localhost/api/workspaces/ws-bad/decisions"),
      makeParams("ws-bad")
    );
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Query failed" },
          }),
        }),
      }),
    });

    const response = await GET(
      makeRequest(null, "http://localhost/api/workspaces/ws-1/decisions"),
      makeParams("ws-1")
    );
    expect(response.status).toBe(500);
  });
});

describe("POST /api/workspaces/[id]/decisions", () => {
  it("creates a decision and returns 201", async () => {
    const createdDecision = {
      id: "d-new", title: "New decision", status: "draft",
      workspace_id: "ws-1", created_at: "2026-01-01",
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Position lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        };
      }
      // Insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdDecision, error: null }),
          }),
        }),
      };
    });

    const request = makeRequest({ title: "New decision" });
    const response = await POST(request, makeParams("ws-1"));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBe("d-new");
    expect(data.title).toBe("New decision");
  });

  it("returns 404 when ownership fails", async () => {
    verifyWorkspaceOwner.mockResolvedValueOnce(false);
    const response = await POST(makeRequest({ title: "Test" }), makeParams("ws-bad"));
    expect(response.status).toBe(404);
  });

  it("returns 500 on insert error", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
          }),
        }),
      };
    });

    const response = await POST(makeRequest({ title: "Fail" }), makeParams("ws-1"));
    expect(response.status).toBe(500);
  });
});

it('loads only current-workspace reviews onto their matching decisions', async () => {
  const reviewQuery={eq:vi.fn().mockReturnThis(),order:vi.fn(async()=>({data:[{id:'r',decision_id:'d-1',outcome:'Unknown'}],error:null}))};
  mockSupabase.from.mockImplementation(table=>({select:()=>table==='decision_reviews'?reviewQuery:{eq:()=>({order:async()=>({data:[{id:'d-1'},{id:'d-2'}],error:null})})}}));
  const response=await GET(makeRequest(null),makeParams('ws-1'));
  const data=await response.json();expect(data.decisions[0].reviews).toHaveLength(1);expect(data.decisions[1].reviews).toEqual([]);
  expect(reviewQuery.eq).toHaveBeenCalledWith('workspace_id','ws-1');
});
it('reports review-loading failure rather than showing an empty review history', async () => {
  mockSupabase.from.mockImplementation(table=>({select:()=>({eq:()=>({order:async()=>table==='decision_reviews'?{data:null,error:{message:'offline'}}:{data:[{id:'d-1'}],error:null}})})}));
  expect((await GET(makeRequest(null),makeParams('ws-1'))).status).toBe(500);
});
