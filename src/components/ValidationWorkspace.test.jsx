import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ValidationWorkspace } from "./ValidationWorkspace";
import { saveLocalBrief, loadLocalBriefs } from "../../lib/validation-brief";
import { draftFixture } from "../../test/fixtures/validation-brief";
const { fetchBriefs, saveBrief } = vi.hoisted(() => ({ fetchBriefs: vi.fn(), saveBrief: vi.fn() }));
vi.mock("../ThemeProvider", () => ({ useC: () => new Proxy({}, { get: () => "#556677" }) }));
vi.mock("./dialog", () => ({ dialog: { confirm: vi.fn(async () => true) } }));
vi.mock("../../lib/cloud-storage", () => ({ fetchValidationBriefs: fetchBriefs, saveValidationBrief: saveBrief }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);
const open = async (title = "Approval reminders") => {
  fireEvent.click(await screen.findByRole("button", { name: `Open brief: ${title}` }));
  await waitFor(() => expect(screen.getByLabelText("IDEA NAME").value).toBe(title));
};

it("saves, reloads, reopens and revises the same investigation without creating a decision", async () => {
  const decision = vi.fn();
  const first = render(<ValidationWorkspace workspaceId="a" isSignedIn={false} onAddDecision={decision} />);
  fireEvent.change(await screen.findByLabelText("IDEA NAME"), { target: { value: "First investigation" } });
  fireEvent.change(screen.getByLabelText("PROBLEM"), { target: { value: "Approvals stall" } });
  fireEvent.click(screen.getByLabelText("Problem severity: 5 of 5"));
  fireEvent.click(screen.getByRole("button", { name: "Save brief" }));
  await screen.findByText(/Saved in this browser · Revision 1/);
  expect(decision).not.toHaveBeenCalled();
  first.unmount();
  render(<ValidationWorkspace workspaceId="a" isSignedIn={false} onAddDecision={decision} />);
  await open("First investigation");
  expect(screen.getByLabelText("PROBLEM").value).toBe("Approvals stall");
  expect(screen.getByLabelText("Problem severity: 5 of 5").getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Assessment incomplete")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("RISKS / UNKNOWNS"), { target: { value: "New risk" } });
  fireEvent.click(screen.getByRole("button", { name: "Save brief" }));
  await screen.findByText(/Saved in this browser · Revision 2/);
  expect(loadLocalBriefs("a")).toHaveLength(1);
  expect(loadLocalBriefs("a")[0].draft.risks).toBe("New risk");
});

it("preserves missing source details while excluding them from current evidence", async () => {
  saveLocalBrief("a", { ...draftFixture(), evidenceReviewed: true });
  render(<ValidationWorkspace workspaceId="a" isSignedIn={false} signals={[]} />);
  await open();
  expect(screen.getByText(/Unavailable source: Interview/)).toBeTruthy();
  expect(screen.queryByLabelText(/I have reviewed/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save brief" }));
  await screen.findByText(/Saved in this browser · Revision 2/);
  expect(loadLocalBriefs("a")[0].draft.attachedSignals[0].body).toBe("One admin reports delays");
});

it("creates a separate Decision Draft with the exact originating brief revision", async () => {
  const record = saveLocalBrief("a", draftFixture());
  const decision = vi.fn(async () => {});
  render(<ValidationWorkspace workspaceId="a" isSignedIn={false} onAddDecision={decision} />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Create Decision Draft" }));
  await waitFor(() => expect(decision).toHaveBeenCalledOnce());
  const snapshot = decision.mock.calls[0][0].recommendation_snapshot.validation_brief;
  expect(snapshot.id).toBe(record.id);
  expect(snapshot.draft.scores.evidenceStrength).toBeNull();
  const saved = loadLocalBriefs("a")[0];
  expect(snapshot.revision).toBe(saved.revision);
  saveLocalBrief("a", { ...saved.draft, risks: "Changed later" }, saved);
  expect(snapshot.draft.risks).toBe("Small sample");
  expect(decision.mock.calls[0][0].status).toBe("draft");
});

it("restores cloud JSON irrespective of object key order and avoids a spurious revision", async () => {
  const draft = draftFixture(); draft.attachedSignals = [];
  const reordered = Object.fromEntries(Object.entries(draft).reverse());
  fetchBriefs.mockResolvedValue([{ id: "b1", title: draft.ideaName, revision: 3, draft: reordered }]);
  const decision = vi.fn(async () => {});
  render(<ValidationWorkspace workspaceId="cloud" isSignedIn onAddDecision={decision} productContext={draft.productContext} />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Create Decision Draft" }));
  await waitFor(() => expect(decision).toHaveBeenCalledOnce());
  expect(saveBrief).not.toHaveBeenCalled();
  expect(decision.mock.calls[0][0].recommendation_snapshot.validation_brief.revision).toBe(3);
});

it("keeps edits and prevents decision creation after a failed save", async () => {
  fetchBriefs.mockResolvedValue([]);
  saveBrief.mockRejectedValue(new Error("Offline: could not save"));
  const decision = vi.fn();
  render(<ValidationWorkspace workspaceId="cloud" isSignedIn onAddDecision={decision} />);
  fireEvent.change(await screen.findByLabelText("IDEA NAME"), { target: { value: "Keep this work" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Decision Draft" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("IDEA NAME").value).toBe("Keep this work");
  expect(decision).not.toHaveBeenCalled();
});

it("does not use another workspace's saved briefs when switching", async () => {
  saveLocalBrief("a", draftFixture());
  const view = render(<ValidationWorkspace key="a" workspaceId="a" isSignedIn={false} />);
  await screen.findByRole("button", { name: "Open brief: Approval reminders" });
  view.rerender(<ValidationWorkspace key="b" workspaceId="b" isSignedIn={false} />);
  await screen.findByText("Saved briefs (0)");
  expect(screen.queryByRole("button", { name: "Open brief: Approval reminders" })).toBeNull();
});
