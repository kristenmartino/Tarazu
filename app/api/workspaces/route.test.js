import { describe, it, expect, vi, beforeEach } from "vitest";

// The workspaces collection endpoint had no tests at all before the
// shared-workspace migration, which mattered once it stopped being a plain
// `.eq("user_id", ...)` lookup: it now scopes rows by EITHER the caller's
// active org or their personal ownership, and that carries the same
// null-equality trap as verifyWorkspaceOwner. These tests pin the scoping
// rules rather than the response shapes.

const mockSupabase = { from: vi.fn() };

const { mockGetOrgId } = vi.hoisted(() => ({ mockGetOrgId: vi.fn() }));

vi.mock("../../../lib/api-auth", () => ({
  withAuth: vi.fn((handler) => handler("user_caller", mockSupabase)),
  getOrgId: mockGetOrgId,
}));

import { GET, POST } from "./route";

/**
 * Chainable Supabase stub recording which scoping calls were made. Every
 * builder method returns the same chain, so it satisfies both the
 * `.or(...).order(...)` and `.eq(...).order(...)` shapes, plus the
 * `.order(...).limit(...)` used to pick the next position.
 */
function fakeDb({ selectResult = { data: [], error: null }, insertResult } = {}) {
  const calls = { or: [], eq: [], insert: [] };
  const selectChain = {
    or: vi.fn((expr) => {
      calls.or.push(expr);
      return selectChain;
    }),
    eq: vi.fn((col, val) => {
      calls.eq.push([col, val]);
      return selectChain;
    }),
    order: vi.fn(() => selectChain),
    limit: vi.fn(async () => selectResult),
    then: undefined,
  };
  // `await`ing the GET chain resolves after .order(); give the chain a thenable
  // tail so both the awaited-after-order and awaited-after-limit paths work.
  selectChain.order = vi.fn(() => ({
    ...selectChain,
    limit: selectChain.limit,
    then: (resolve) => resolve(selectResult),
  }));
  const insertChain = {
    select: vi.fn(() => insertChain),
    single: vi.fn(async () => insertResult ?? { data: { id: "ws-new" }, error: null }),
  };
  mockSupabase.from.mockReturnValue({
    select: vi.fn(() => selectChain),
    insert: vi.fn((row) => {
      calls.insert.push(row);
      return insertChain;
    }),
  });
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/workspaces", () => {
  it("scopes to user_id alone when the caller has no active org", async () => {
    // SECURITY: the important half. Adding an `org_id.eq.null` term instead
    // would match every workspace that has not been backfilled — currently all
    // of them — and return the entire table to one caller.
    mockGetOrgId.mockResolvedValue(null);
    const calls = fakeDb({ selectResult: { data: [], error: null } });

    await GET();

    expect(calls.eq).toEqual([["user_id", "user_caller"]]);
    expect(calls.or).toEqual([]);
  });

  it("matches the caller's org OR their personal ownership when an org is active", async () => {
    mockGetOrgId.mockResolvedValue("org_acme");
    const calls = fakeDb({ selectResult: { data: [], error: null } });

    await GET();

    expect(calls.or).toEqual(["org_id.eq.org_acme,user_id.eq.user_caller"]);
    expect(calls.eq).toEqual([]);
  });

  it("never emits a filter term containing the literal null", async () => {
    // Guards the trap from the other direction: whatever the scoping strategy,
    // no branch may ask Postgres to match org_id against null.
    mockGetOrgId.mockResolvedValue(null);
    const calls = fakeDb({ selectResult: { data: [], error: null } });

    await GET();

    const emitted = [...calls.or, ...calls.eq.map(([c, v]) => `${c}.eq.${v}`)].join(" ");
    expect(emitted).not.toContain("null");
  });

  it("returns 500 when the query fails", async () => {
    mockGetOrgId.mockResolvedValue(null);
    fakeDb({ selectResult: { data: null, error: { message: "boom" } } });

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "boom" });
  });
});

describe("POST /api/workspaces", () => {
  const body = (b) => ({ json: () => Promise.resolve(b) });

  it("stamps the active org on a newly created workspace", async () => {
    mockGetOrgId.mockResolvedValue("org_acme");
    const calls = fakeDb({ selectResult: { data: [], error: null } });

    await POST(body({ name: "Team Backlog" }));

    expect(calls.insert[0]).toMatchObject({
      user_id: "user_caller",
      org_id: "org_acme",
      name: "Team Backlog",
    });
  });

  it("stores a null org when the caller has no active org", async () => {
    // Pre-migration behavior preserved: the workspace is still reachable via
    // verifyWorkspaceOwner's personal path.
    mockGetOrgId.mockResolvedValue(null);
    const calls = fakeDb({ selectResult: { data: [], error: null } });

    await POST(body({ name: "Solo" }));

    expect(calls.insert[0]).toMatchObject({ user_id: "user_caller", org_id: null });
  });

  it("positions a new workspace after the ones the caller can already see", async () => {
    mockGetOrgId.mockResolvedValue("org_acme");
    const calls = fakeDb({ selectResult: { data: [{ position: 4 }], error: null } });

    await POST(body({ name: "Next" }));

    expect(calls.or).toEqual(["org_id.eq.org_acme,user_id.eq.user_caller"]);
    expect(calls.insert[0]).toMatchObject({ position: 5 });
  });

  it("defaults the name when none is supplied", async () => {
    mockGetOrgId.mockResolvedValue(null);
    const calls = fakeDb({ selectResult: { data: [], error: null } });

    await POST(body({}));

    expect(calls.insert[0]).toMatchObject({ name: "My Backlog", position: 0 });
  });
});
