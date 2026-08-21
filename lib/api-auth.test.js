import { describe, it, expect, vi, beforeEach } from "vitest";

// Every /api/workspaces/* route test mocks this module out, which is why it had
// 0% coverage despite being the authentication boundary for all of them. These
// tests exercise it directly.
//
// Assertions here are deliberately exact — status codes, error strings, and the
// precise filter columns — so that mutation testing has something to kill. A
// test that only checks "returns a response" would survive nearly every mutant.

// vi.hoisted: vi.mock calls are hoisted above normal declarations, so the
// spies have to be created in a hoisted block or the factories close over
// uninitialised bindings.
const { mockAuth, mockGetSupabase } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetSupabase: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("./supabase", () => ({ getSupabase: mockGetSupabase }));

import { withAuth, withUser, verifyWorkspaceOwner } from "./api-auth";

const fakeSupabase = { from: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSupabase.mockReturnValue(fakeSupabase);
});

/**
 * Builds a chainable Supabase stub for the ai_call_log quota query
 * (.from().select().eq().gte(), the count check) plus .from().insert()
 * (the after-success record). Records every .eq() / .gte() filter and every
 * inserted row so tests can assert on them directly — same shape as
 * supabaseReturning() below for verifyWorkspaceOwner.
 */
function fakeQuotaSupabase({ count = 0, countError = null } = {}) {
  const eqCalls = [];
  const gteCalls = [];
  const insertedRows = [];
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((col, val) => {
      eqCalls.push([col, val]);
      return chain;
    }),
    gte: vi.fn(async (col, val) => {
      gteCalls.push([col, val]);
      return { count, error: countError };
    }),
    insert: vi.fn(async (row) => {
      insertedRows.push(row);
      return { error: null };
    }),
  };
  const client = { from: vi.fn(() => chain) };
  return { client, chain, eqCalls, gteCalls, insertedRows };
}

describe("withUser — authenticated, under quota", () => {
  it("calls the handler with the Clerk user id", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);
    const handler = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    await withUser("analyze", handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("user_123");
  });

  it("passes the handler's own response straight through", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);
    const expected = Response.json({ topPick: "A" }, { status: 200 });

    const response = await withUser("analyze", () => expected);

    expect(response).toBe(expected);
  });

  it("queries ai_call_log filtered on the caller's user_id and a ~24h cutoff", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client, eqCalls, gteCalls } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);
    const before = Date.now();

    await withUser("analyze", () => new Response("ok", { status: 200 }));

    expect(client.from).toHaveBeenCalledWith("ai_call_log");
    expect(eqCalls).toEqual([["user_id", "user_123"]]);
    expect(gteCalls).toHaveLength(1);
    const [col, since] = gteCalls[0];
    expect(col).toBe("created_at");
    // The cutoff is "now minus ~24h", computed at call time — assert it's in
    // that window rather than pinning an exact timestamp.
    const ageMs = before - new Date(since).getTime();
    expect(ageMs).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
    expect(ageMs).toBeLessThan(24 * 60 * 60 * 1000 + 5000);
  });
});

describe("withUser — quota boundary", () => {
  it("allows the call at one under the limit (49 of 50)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client } = fakeQuotaSupabase({ count: 49 });
    mockGetSupabase.mockReturnValue(client);
    const handler = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    const response = await withUser("analyze", handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it("refuses at exactly the limit (50 of 50) without calling the handler", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client } = fakeQuotaSupabase({ count: 50 });
    mockGetSupabase.mockReturnValue(client);
    const handler = vi.fn();

    const response = await withUser("analyze", handler);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Daily AI limit reached (50 calls/day). Try again tomorrow.",
      code: "quota_exceeded",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("refuses when already well over the limit", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client } = fakeQuotaSupabase({ count: 500 });
    mockGetSupabase.mockReturnValue(client);
    const handler = vi.fn();

    const response = await withUser("analyze", handler);

    expect(response.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withUser — recording calls against quota", () => {
  it("records a row after a successful call (status < 400)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client, insertedRows } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);

    await withUser("suggest-scores", () => new Response("ok", { status: 200 }));

    expect(insertedRows).toEqual([{ user_id: "user_123", route: "suggest-scores" }]);
  });

  it("does NOT record a row when the handler itself returns an error", async () => {
    // A request that never reached Anthropic (a 400 from bad input) or that
    // Anthropic rejected (mapped to 429/502/etc by lib/ai.js) never cost
    // anything, so it should not cost quota either.
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client, insertedRows } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);

    await withUser("analyze", () => new Response("bad input", { status: 400 }));

    expect(insertedRows).toEqual([]);
  });

  it("does NOT record a row when the upstream AI call failed (5xx)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client, insertedRows } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);

    await withUser("analyze", () => new Response("upstream error", { status: 502 }));

    expect(insertedRows).toEqual([]);
  });

  it("records under the route name the caller passed in", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client, insertedRows } = fakeQuotaSupabase({ count: 0 });
    mockGetSupabase.mockReturnValue(client);

    await withUser("analyze", () => new Response("ok", { status: 200 }));

    expect(insertedRows[0].route).toBe("analyze");
  });
});

describe("withUser — unauthenticated", () => {
  it("returns 401 with auth_required and never touches the database", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const handler = vi.fn();

    const response = await withUser("analyze", handler);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Sign in to use AI features.",
      code: "auth_required",
    });
    expect(handler).not.toHaveBeenCalled();
    expect(mockGetSupabase).not.toHaveBeenCalled();
  });

  it("returns 401 when Clerk is not configured at all (guest mode)", async () => {
    mockAuth.mockRejectedValue(new Error("Missing publishableKey"));
    const handler = vi.fn();

    const response = await withUser("analyze", handler);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withUser — database not configured", () => {
  it("returns 500 and never calls the handler", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSupabase.mockReturnValue(null);
    const handler = vi.fn();

    const response = await withUser("analyze", handler);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Database not configured" });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withUser — quota check itself fails", () => {
  it("fails CLOSED: refuses the call rather than allowing it through unmetered", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { client } = fakeQuotaSupabase({ countError: { message: "connection reset" } });
    mockGetSupabase.mockReturnValue(client);
    const handler = vi.fn();

    const response = await withUser("analyze", handler);

    expect(response.status).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withAuth — authenticated", () => {
  it("calls the handler with the Clerk user id and the Supabase client", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const handler = vi.fn().mockResolvedValue(new Response("ok"));

    await withAuth(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("user_123", fakeSupabase);
  });

  it("passes the handler's own response straight through", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const expected = Response.json({ workspaces: [] }, { status: 201 });

    const response = await withAuth(() => expected);

    expect(response).toBe(expected);
    expect(response.status).toBe(201);
  });

  it("awaits an async handler rather than returning the promise", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await withAuth(async () => Response.json({ ok: true }));

    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("withAuth — unauthenticated", () => {
  // The bare `catch {}` in withAuth means every one of these failure modes
  // surfaces identically. That is the documented behaviour, so it is pinned
  // here: a regression that turned any of them into a 500 or a crash would
  // change how every API route fails.
  const unauthenticated = [
    ["userId is null", () => mockAuth.mockResolvedValue({ userId: null })],
    ["userId is undefined", () => mockAuth.mockResolvedValue({})],
    ["userId is an empty string", () => mockAuth.mockResolvedValue({ userId: "" })],
    ["auth() rejects", () => mockAuth.mockRejectedValue(new Error("Clerk unreachable"))],
    ["auth() throws synchronously", () => mockAuth.mockImplementation(() => { throw new Error("boom"); })],
    ["auth() resolves to null", () => mockAuth.mockResolvedValue(null)],
  ];

  for (const [name, arrange] of unauthenticated) {
    it(`returns 401 when ${name}`, async () => {
      arrange();
      const handler = vi.fn();

      const response = await withAuth(handler);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
      expect(handler).not.toHaveBeenCalled();
    });
  }

  it("does not reach the database when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await withAuth(vi.fn());

    expect(mockGetSupabase).not.toHaveBeenCalled();
  });
});

describe("withAuth — database not configured", () => {
  it("returns 500 when getSupabase() returns null", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSupabase.mockReturnValue(null);
    const handler = vi.fn();

    const response = await withAuth(handler);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Database not configured" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("distinguishes a missing database from a missing session", async () => {
    // Both are refusals, but they must not collapse into the same status —
    // 401 tells the client to sign in, 500 tells it the server is misconfigured.
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSupabase.mockReturnValue(null);
    const dbMissing = await withAuth(vi.fn());

    mockAuth.mockResolvedValue({ userId: null });
    mockGetSupabase.mockReturnValue(fakeSupabase);
    const noSession = await withAuth(vi.fn());

    expect(dbMissing.status).toBe(500);
    expect(noSession.status).toBe(401);
  });
});

describe("verifyWorkspaceOwner", () => {
  /** Builds a chainable Supabase stub and records every .eq() filter applied. */
  function supabaseReturning(result) {
    const eqCalls = [];
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn((col, val) => {
        eqCalls.push([col, val]);
        return chain;
      }),
      single: vi.fn(async () => result),
    };
    const client = { from: vi.fn(() => chain) };
    return { client, chain, eqCalls };
  }

  it("returns true when a matching row exists", async () => {
    const { client } = supabaseReturning({ data: { id: "ws-1" }, error: null });

    await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(true);
  });

  it("returns false when no row matches", async () => {
    const { client } = supabaseReturning({ data: null, error: null });

    await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(false);
  });

  it("returns false when data is undefined", async () => {
    const { client } = supabaseReturning({ error: { message: "not found" } });

    await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(false);
  });

  it("filters on BOTH workspace id and user id", async () => {
    // The security-critical assertion. Dropping the user_id filter would let
    // any authenticated user pass an ownership check for any workspace, and
    // every route in app/api/workspaces/[id]/* gates on this function.
    const { client, eqCalls } = supabaseReturning({ data: { id: "ws-1" }, error: null });

    await verifyWorkspaceOwner(client, "ws-1", "user_123");

    expect(eqCalls).toEqual([
      ["id", "ws-1"],
      ["user_id", "user_123"],
    ]);
  });

  it("queries the workspaces table and selects only the id", async () => {
    const { client, chain } = supabaseReturning({ data: { id: "ws-1" }, error: null });

    await verifyWorkspaceOwner(client, "ws-1", "user_123");

    expect(client.from).toHaveBeenCalledWith("workspaces");
    expect(chain.select).toHaveBeenCalledWith("id");
    expect(chain.single).toHaveBeenCalledTimes(1);
  });

  it("returns a boolean, not the row itself", async () => {
    // Callers use the result directly in `if (!(await verifyWorkspaceOwner(...)))`,
    // so leaking the row would still be truthy but changes the contract.
    const { client } = supabaseReturning({ data: { id: "ws-1", user_id: "user_123" }, error: null });

    const result = await verifyWorkspaceOwner(client, "ws-1", "user_123");

    expect(result).toBe(true);
    expect(typeof result).toBe("boolean");
  });
});
