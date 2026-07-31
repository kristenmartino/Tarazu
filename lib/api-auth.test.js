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

import { withAuth, verifyWorkspaceOwner } from "./api-auth";

const fakeSupabase = { from: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSupabase.mockReturnValue(fakeSupabase);
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
