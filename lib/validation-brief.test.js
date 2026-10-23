import { beforeEach, describe, expect, it, vi } from "vitest";
import { BriefDraftSchema, briefFingerprint, loadLocalBriefs, saveLocalBrief } from "./validation-brief";
import { draftFixture } from "../test/fixtures/validation-brief";

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe("validation brief persistence", () => {
  it("round-trips every field, preserves unknowns and revisions, and isolates workspaces", () => {
    const original = draftFixture();
    const first = saveLocalBrief("a", original);
    expect(loadLocalBriefs("a")[0].draft).toEqual(original);
    expect(loadLocalBriefs("b")).toEqual([]);
    const second = saveLocalBrief("a", { ...original, nextActions: "Run a prototype test" }, first);
    expect(second.id).toBe(first.id);
    expect(second.revision).toBe(2);
    expect(loadLocalBriefs("a")).toHaveLength(1);
    expect(first.draft.nextActions).toBe(original.nextActions);
    expect(second.draft.scores.evidenceStrength).toBeNull();
  });
  it("refuses stale-tab saves instead of losing a newer revision", () => {
    const first = saveLocalBrief("a", draftFixture());
    const second = saveLocalBrief("a", { ...first.draft, risks: "New information" }, first);
    expect(() => saveLocalBrief("a", first.draft, first)).toThrow(/another tab/);
    expect(loadLocalBriefs("a")[0]).toEqual(second);
  });
  it("does not report success when browser storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => saveLocalBrief("a", draftFixture())).toThrow("Quota exceeded");
  });
  it("compares jsonb content independently of object ordering", () => {
    const draft = draftFixture();
    expect(briefFingerprint(draft)).toBe(briefFingerprint(Object.fromEntries(Object.entries(draft).reverse())));
  });
  it("rejects fabricated score values and unknown fields", () => {
    const draft = draftFixture();
    expect(BriefDraftSchema.safeParse({ ...draft, scores: { ...draft.scores, evidenceStrength: 99 } }).success).toBe(false);
    expect(BriefDraftSchema.safeParse({ ...draft, workspace_id: "other" }).success).toBe(false);
  });
});
