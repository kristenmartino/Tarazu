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

import { withAuth, withUser, verifyWorkspaceOwner, getOrgId } from "./api-auth";

const fakeSupabase = { from: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSupabase.mockReturnValue(fakeSupabase);
});

describe("withUser — atomic admission", () => {
  const reservation = "52b723bd-1ef5-43cb-8f1e-d6a10fb1b576";
  const client = () => ({ rpc: vi.fn(name => ({ abortSignal: async () => name === "reserve_ai_request"
    ? {data:{allowed:true,reservation_id:reservation,global_used:1},error:null} : {data:null,error:null} })) });
  it("passes the authenticated caller and original response through the reservation boundary", async () => {
    mockAuth.mockResolvedValue({userId:"user_123"});
    const db = client(); mockGetSupabase.mockReturnValue(db);
    const expected = Response.json({ok:true}); const handler = vi.fn(() => expected);
    expect(await withUser("analyze",handler)).toBe(expected);
    expect(handler).toHaveBeenCalledExactlyOnceWith("user_123");
    expect(db.rpc.mock.calls.map(c=>c[0])).toEqual(["reserve_ai_request","finish_ai_request"]);
  });
  it("refuses an anonymous request without reaching the database", async () => {
    mockAuth.mockResolvedValue({userId:null}); const handler=vi.fn();
    const result=await withUser("analyze",handler);
    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({error:"Sign in to use AI features.",code:"auth_required"});
    expect(handler).not.toHaveBeenCalled(); expect(mockGetSupabase).not.toHaveBeenCalled();
  });
  it("stays anonymous when Clerk fails", async () => {
    mockAuth.mockRejectedValue(new Error("Missing key")); const handler=vi.fn();
    expect((await withUser("analyze",handler)).status).toBe(401); expect(handler).not.toHaveBeenCalled();
  });
  it("refuses a missing database", async () => {
    mockAuth.mockResolvedValue({userId:"user_123"});mockGetSupabase.mockReturnValue(null);const handler=vi.fn();
    const result=await withUser("analyze",handler);
    expect(result.status).toBe(500);expect(await result.json()).toEqual({error:"Database not configured"});expect(handler).not.toHaveBeenCalled();
  });
  it("does not run the handler when the atomic reservation is unavailable", async () => {
    mockAuth.mockResolvedValue({userId:"user_123"}); const handler=vi.fn();
    mockGetSupabase.mockReturnValue({rpc:()=>({abortSignal:async()=>({data:null,error:{message:"unavailable"}})})});
    expect((await withUser("analyze",handler)).status).toBe(503);expect(handler).not.toHaveBeenCalled();
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

  /** A workspaces row as actually stored. org_id is null until backfilled. */
  function row({ user_id = "user_owner", org_id = null } = {}) {
    return { data: { id: "ws-1", user_id, org_id }, error: null };
  }

  /**
   * Set the Clerk session this call runs under. Set explicitly in every test
   * rather than left to the default mock: getOrgId() swallows exceptions, so an
   * unconfigured mockAuth would still yield null via the catch, and a test that
   * passes for that reason isn't testing the org logic it claims to.
   */
  function session({ orgId = null } = {}) {
    mockAuth.mockResolvedValue({ userId: "unused-here", orgId });
  }

  describe("personal-workspace path", () => {
    it("authorizes the original owner of a workspace that has no org yet", async () => {
      // The state every pre-migration workspace is in. If this path breaks,
      // every existing user loses access to their own data on deploy.
      session({ orgId: null });
      const { client } = supabaseReturning(row({ user_id: "user_123", org_id: null }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(true);
    });

    it("denies a different user when the workspace has no org", async () => {
      session({ orgId: null });
      const { client } = supabaseReturning(row({ user_id: "user_owner", org_id: null }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_intruder")).resolves.toBe(false);
    });

    it("authorizes the personal owner even while they act under an unrelated org", async () => {
      // Deliberate: the owner keeps access to their own not-yet-backfilled
      // workspace regardless of which org happens to be active in the session.
      session({ orgId: "org_unrelated" });
      const { client } = supabaseReturning(row({ user_id: "user_123", org_id: null }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(true);
    });
  });

  describe("organization path", () => {
    it("authorizes a member of the workspace's org who never owned it", async () => {
      // The entire point of the migration: a teammate reaching a workspace
      // created by someone else.
      session({ orgId: "org_acme" });
      const { client } = supabaseReturning(row({ user_id: "user_owner", org_id: "org_acme" }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_teammate")).resolves.toBe(true);
    });

    it("denies a caller whose active org is a different org", async () => {
      // Cross-tenant read. The one that must never regress.
      session({ orgId: "org_attacker" });
      const { client } = supabaseReturning(row({ user_id: "user_owner", org_id: "org_victim" }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_attacker")).resolves.toBe(false);
    });

    it("denies a caller with an active org against a workspace not yet backfilled", async () => {
      session({ orgId: "org_acme" });
      const { client } = supabaseReturning(row({ user_id: "user_owner", org_id: null }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_teammate")).resolves.toBe(false);
    });
  });

  describe("null-equality trap", () => {
    it("denies a stranger when BOTH the caller's org and the workspace's org are null", async () => {
      // The failure mode this function is written to avoid. Comparing the two
      // columns in code (rather than filtering in SQL, as the single-owner
      // version did) means a bare `data.org_id === orgId` evaluates null ===
      // null → true. Every workspace currently has org_id = null and any
      // caller without an active org has orgId = null, so that bug would hand
      // every authenticated user the entire workspaces table. The truthiness
      // guard on orgId is the only thing preventing it.
      session({ orgId: null });
      const { client } = supabaseReturning(row({ user_id: "user_owner", org_id: null }));

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_stranger")).resolves.toBe(false);
    });

    it("denies when the caller id is missing and the row's user_id is also null", async () => {
      // Same trap on the other comparison: `data.user_id === userId` with both
      // null would authorize an unauthenticated caller.
      session({ orgId: null });
      const { client } = supabaseReturning(row({ user_id: null, org_id: null }));

      await expect(verifyWorkspaceOwner(client, "ws-1", null)).resolves.toBe(false);
    });
  });

  describe("row lookup", () => {
    it("returns false when no row matches", async () => {
      session({ orgId: null });
      const { client } = supabaseReturning({ data: null, error: null });

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(false);
    });

    it("returns false when the query errors", async () => {
      session({ orgId: null });
      const { client } = supabaseReturning({ error: { message: "not found" } });

      await expect(verifyWorkspaceOwner(client, "ws-1", "user_123")).resolves.toBe(false);
    });

    it("filters on the workspace id alone, resolving ownership in code", async () => {
      // The user_id filter moved out of SQL because authorization now depends
      // on either of two columns. Asserted explicitly so the change is a
      // deliberate contract, not an accident: any extra .eq() here would
      // re-narrow the lookup and silently break the org path.
      session({ orgId: "org_acme" });
      const { client, eqCalls } = supabaseReturning(row({ org_id: "org_acme" }));

      await verifyWorkspaceOwner(client, "ws-1", "user_123");

      expect(eqCalls).toEqual([["id", "ws-1"]]);
    });

    it("selects the columns both authorization paths compare", async () => {
      // Dropping either column from the select would make its comparison
      // read undefined and silently deny that whole path.
      session({ orgId: null });
      const { client, chain } = supabaseReturning(row({ user_id: "user_123" }));

      await verifyWorkspaceOwner(client, "ws-1", "user_123");

      expect(client.from).toHaveBeenCalledWith("workspaces");
      expect(chain.select).toHaveBeenCalledWith("id, user_id, org_id");
      expect(chain.single).toHaveBeenCalledTimes(1);
    });

    it("returns a boolean, not the row itself", async () => {
      // Callers use the result directly in `if (!(await verifyWorkspaceOwner(...)))`,
      // so leaking the row would still be truthy but changes the contract.
      session({ orgId: null });
      const { client } = supabaseReturning(row({ user_id: "user_123" }));

      const result = await verifyWorkspaceOwner(client, "ws-1", "user_123");

      expect(result).toBe(true);
      expect(typeof result).toBe("boolean");
    });
  });
});

describe("getOrgId", () => {
  it("returns the active organization id from the Clerk session", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123", orgId: "org_acme" });

    await expect(getOrgId()).resolves.toBe("org_acme");
  });

  it("returns null when the session has no active organization", async () => {
    // Clerk only populates orgId once an org is selected for the session, so a
    // user who belongs to one but has never activated it reads as null. The
    // personal path in verifyWorkspaceOwner is what keeps them working.
    mockAuth.mockResolvedValue({ userId: "user_123", orgId: null });

    await expect(getOrgId()).resolves.toBeNull();
  });

  it("returns null when orgId is absent entirely rather than null", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    await expect(getOrgId()).resolves.toBeNull();
  });

  it("returns null instead of throwing when Clerk is unavailable", async () => {
    // Guest mode runs with no Clerk keys at all; a bare import throws there.
    mockAuth.mockRejectedValue(new Error("clerk not configured"));

    await expect(getOrgId()).resolves.toBeNull();
  });
});
