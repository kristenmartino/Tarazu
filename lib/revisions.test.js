import { describe, it, expect, vi, beforeEach } from "vitest";

// createRevision was module-private inside features/route.js, with a drifted
// hand-rolled copy in revert/route.js. Consolidating it here is only safe if
// the behavior both call sites depend on is pinned — especially the retry,
// which the copy never had, and the returned revision number, which the revert
// route now echoes back to the client.

const { mockClerk } = vi.hoisted(() => ({ mockClerk: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: mockClerk }));

import { createRevision, resolveActor, generateChangeSummary } from "./revisions";

/**
 * Supabase stub. `insertErrors` is consumed one per attempt, so a test can make
 * the first N inserts collide and the next succeed.
 */
function fakeDb({ lastRevision = null, insertErrors = [] } = {}) {
  const inserted = [];
  const selects = [];
  const eqs = [];
  const errors = [...insertErrors];
  const chain = {
    select: vi.fn((cols) => { selects.push(cols); return chain; }),
    eq: vi.fn((col, val) => { eqs.push([col, val]); return chain; }),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => ({
      data: lastRevision === null ? null : { revision_number: lastRevision },
    })),
  };
  const client = {
    from: vi.fn(() => ({
      ...chain,
      insert: vi.fn(async (row) => {
        inserted.push(row);
        return { error: errors.shift() ?? null };
      }),
    })),
  };
  return { client, inserted, selects, eqs, tables: client.from.mock.calls };
}

beforeEach(() => vi.clearAllMocks());

describe("createRevision", () => {
  it("numbers the first revision 1 when the feature has no history", async () => {
    const { client, inserted } = fakeDb({ lastRevision: null });

    const n = await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "created",
    });

    expect(n).toBe(1);
    expect(inserted[0].revision_number).toBe(1);
  });

  it("continues from the highest existing revision", async () => {
    const { client, inserted } = fakeDb({ lastRevision: 7 });

    const n = await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "updated", changedFields: [],
    });

    expect(n).toBe(8);
    expect(inserted[0].revision_number).toBe(8);
  });

  it("retries past a unique collision and RETURNS the number it landed on", async () => {
    // The behavior the revert route's hand-rolled copy was missing. Returning
    // the attempted number rather than the written one would put a wrong
    // revision_number in the revert response.
    const { client, inserted } = fakeDb({ lastRevision: 3, insertErrors: [{ code: "23505" }, { code: "23505" }] });

    const n = await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "updated", changedFields: [],
    });

    expect(inserted.map(r => r.revision_number)).toEqual([4, 5, 6]);
    expect(n).toBe(6);
  });

  it("gives up after three collisions rather than looping", async () => {
    const { client, inserted } = fakeDb({
      lastRevision: 1,
      insertErrors: [{ code: "23505" }, { code: "23505" }, { code: "23505" }],
    });

    const n = await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "updated", changedFields: [],
    });

    expect(inserted).toHaveLength(3);
    expect(n).toBeNull();
  });

  it("does not retry a non-collision error", async () => {
    // Retrying a permission or constraint error would just repeat it.
    const { client, inserted } = fakeDb({ lastRevision: 1, insertErrors: [{ code: "42501" }] });

    const n = await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "updated", changedFields: [],
    });

    expect(inserted).toHaveLength(1);
    expect(n).toBeNull();
  });

  it("looks up the previous revision by feature, reading the number column", async () => {
    // Pins the lookup itself. Querying the wrong column or keying on the wrong
    // field would still "work" against a permissive stub while numbering every
    // revision 1 in production.
    const { client, selects, eqs } = fakeDb({ lastRevision: 2 });

    await createRevision(client, {
      featureId: "f-target", workspaceId: "w1", snapshot: { name: "x" }, changeType: "created",
    });

    expect(client.from).toHaveBeenCalledWith("feature_revisions");
    expect(selects).toContain("revision_number");
    expect(eqs).toEqual([["feature_id", "f-target"]]);
  });

  it("records the actor on the row", async () => {
    const { client, inserted } = fakeDb();

    await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "created",
      actor: { id: "user_1", name: "Dana" },
    });

    expect(inserted[0].created_by).toBe("user_1");
    expect(inserted[0].created_by_name).toBe("Dana");
  });

  it("writes nulls when no actor is supplied rather than omitting the columns", async () => {
    // Pre-attribution rows are null; an undefined here would make the column
    // absent from the insert, which reads differently downstream.
    const { client, inserted } = fakeDb();

    await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" }, changeType: "created",
    });

    expect(inserted[0].created_by).toBeNull();
    expect(inserted[0].created_by_name).toBeNull();
  });

  it("labels a creation and carries the snapshot onto the row", async () => {
    // The snapshot columns are the whole point of a revision — if they stopped
    // being copied, history would render empty rows that still look valid.
    const { client, inserted } = fakeDb();

    await createRevision(client, {
      featureId: "f1", workspaceId: "w1", changeType: "created",
      snapshot: { name: "Export", description: "d", reach: 10, impact: 20, confidence: 30, effort: 40, owner: "o", theme: "t", status: "active" },
    });

    expect(inserted[0]).toMatchObject({
      change_summary: "Created feature",
      snapshot_name: "Export",
      snapshot_description: "d",
      snapshot_reach: 10,
      snapshot_impact: 20,
      snapshot_confidence: 30,
      snapshot_effort: 40,
      snapshot_owner: "o",
      snapshot_theme: "t",
      snapshot_status: "active",
    });
  });

  it("defaults the optional snapshot fields rather than writing undefined", async () => {
    const { client, inserted } = fakeDb();

    await createRevision(client, {
      featureId: "f1", workspaceId: "w1", changeType: "created",
      snapshot: { name: "Bare", reach: 1, impact: 2, confidence: 3, effort: 4 },
    });

    expect(inserted[0].snapshot_description).toBe("");
    expect(inserted[0].snapshot_owner).toBeNull();
    expect(inserted[0].snapshot_theme).toBeNull();
    expect(inserted[0].snapshot_status).toBeNull();
    expect(inserted[0].changed_fields).toEqual([]);
    expect(inserted[0].reverted_to_revision).toBeNull();
  });

  it("labels a revert with the revision it restored", async () => {
    const { client, inserted } = fakeDb({ lastRevision: 4 });

    await createRevision(client, {
      featureId: "f1", workspaceId: "w1", snapshot: { name: "x" },
      changeType: "reverted", changedFields: [{ field: "reach", old: 1, new: 2 }], revertedTo: 2,
    });

    expect(inserted[0].change_summary).toBe("Reverted to revision #2");
    expect(inserted[0].reverted_to_revision).toBe(2);
  });
});

describe("resolveActor", () => {
  const withClerkUser = (user) =>
    mockClerk.mockResolvedValue({ users: { getUser: vi.fn(async () => user) } });

  it("prefers a full name", async () => {
    withClerkUser({ firstName: "Dana", lastName: "Reed", username: "dr", primaryEmailAddress: { emailAddress: "d@x.com" } });

    await expect(resolveActor("user_1")).resolves.toEqual({ id: "user_1", name: "Dana Reed" });
  });

  it("falls back to username, then email", async () => {
    withClerkUser({ firstName: null, lastName: null, username: "dreed" });
    await expect(resolveActor("user_1")).resolves.toMatchObject({ name: "dreed" });

    withClerkUser({ firstName: null, lastName: null, username: null, primaryEmailAddress: { emailAddress: "d@x.com" } });
    await expect(resolveActor("user_1")).resolves.toMatchObject({ name: "d@x.com" });
  });

  it("falls back to the first email when there is no primary", async () => {
    withClerkUser({ firstName: null, lastName: null, username: null, emailAddresses: [{ emailAddress: "first@x.com" }] });

    await expect(resolveActor("user_1")).resolves.toMatchObject({ name: "first@x.com" });
  });

  it("returns a null name when Clerk has nothing usable", async () => {
    withClerkUser({ firstName: null, lastName: null, username: null, emailAddresses: [] });

    await expect(resolveActor("user_1")).resolves.toEqual({ id: "user_1", name: null });
  });

  it("returns the id with a null name when Clerk fails", async () => {
    // Fails soft on purpose: attribution is metadata about a write, so losing
    // it must not block the write itself.
    mockClerk.mockRejectedValue(new Error("clerk down"));

    await expect(resolveActor("user_1")).resolves.toEqual({ id: "user_1", name: null });
  });
});

describe("generateChangeSummary", () => {
  it("renders a score change as an arrow", () => {
    expect(generateChangeSummary([{ field: "effort", old: 30, new: 55 }])).toBe("Effort 30 → 55");
  });

  it("renders a rename with both names quoted", () => {
    expect(generateChangeSummary([{ field: "name", old: "Old", new: "New" }]))
      .toBe('Renamed "Old" to "New"');
  });

  it("joins multiple changes with commas", () => {
    expect(generateChangeSummary([
      { field: "reach", old: 1, new: 2 },
      { field: "effort", old: 3, new: 4 },
    ])).toBe("Reach 1 → 2, Effort 3 → 4");
  });

  it("distinguishes added, removed, and updated descriptions", () => {
    expect(generateChangeSummary([{ field: "description", old: "", new: "x" }])).toBe("Added description");
    expect(generateChangeSummary([{ field: "description", old: "x", new: "" }])).toBe("Removed description");
    expect(generateChangeSummary([{ field: "description", old: "x", new: "y" }])).toBe("Updated description");
  });

  it("is empty for no changes", () => {
    expect(generateChangeSummary([])).toBe("");
  });
});
