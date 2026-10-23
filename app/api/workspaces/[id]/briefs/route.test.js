import { beforeEach, describe, expect, it, vi } from "vitest";
import { draftFixture } from "../../../../../test/fixtures/validation-brief";
const { db, authorize } = vi.hoisted(() => ({ db: { from: vi.fn() }, authorize: vi.fn() }));
vi.mock("../../../../../lib/api-auth", () => ({
  withAuth: handler => handler("u1", db), verifyWorkspaceOwner: authorize,
}));
import { GET, POST } from "./route";
import { PATCH } from "./[briefId]/route";
const params = { params: Promise.resolve({ id: "ws1", briefId: "b1" }) };
const request = body => ({ json: async () => body });
let query;
beforeEach(() => {
  vi.clearAllMocks(); authorize.mockResolvedValue(true);
  query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "b1", revision: 1 }, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "b1", revision: 2 }, error: null }) };
  db.from.mockReturnValue(query);
});
describe("workspace brief API", () => {
  it("denies every operation before reading or writing another workspace", async () => {
    authorize.mockResolvedValue(false);
    for (const handler of [GET, POST, PATCH]) expect((await handler(request({ draft: draftFixture(), revision: 1 }), params)).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("scopes the saved list to the authorized workspace", async () => {
    const response = await GET(request(null), params);
    expect(await response.json()).toEqual({ briefs: [] });
    expect(query.eq).toHaveBeenCalledWith("workspace_id", "ws1");
  });
  it("creates a first-class brief without inserting a decision", async () => {
    expect((await POST(request({ draft: draftFixture() }), params)).status).toBe(201);
    expect(db.from).toHaveBeenCalledWith("validation_briefs");
    expect(query.insert).toHaveBeenCalledWith({ workspace_id: "ws1", title: "Approval reminders", draft: draftFixture(), created_by: "u1" });
    expect(db.from).not.toHaveBeenCalledWith("decisions");
  });
  it("rejects invalid payloads and missing expected revisions", async () => {
    expect((await POST(request({ draft: {} }), params)).status).toBe(400);
    expect((await PATCH(request({ draft: draftFixture() }), params)).status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("updates only the matching workspace, brief and expected revision", async () => {
    expect((await PATCH(request({ draft: draftFixture(), revision: 1 }), params)).status).toBe(200);
    expect(query.eq.mock.calls).toEqual([["id", "b1"], ["workspace_id", "ws1"], ["revision", 1]]);
    expect(query.update.mock.calls[0][0].revision).toBe(2);
  });
  it("returns a conflict instead of overwriting a concurrent update", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await PATCH(request({ draft: draftFixture(), revision: 1 }), params);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("your edits are still here");
  });
  it("fails visibly when persistence is unavailable", async () => {
    query.single.mockResolvedValue({ data: null, error: { message: "missing relation" } });
    expect((await POST(request({ draft: draftFixture() }), params)).status).toBe(500);
  });
});
