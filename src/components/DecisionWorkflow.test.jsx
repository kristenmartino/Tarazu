import React from "react";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { DecisionFrame } from "./DecisionFrame";
import { ValidateScreen } from "./ValidateScreen";
import { DecisionRationale } from "./DecisionRationale";
import { DecisionReview } from "./DecisionReview";
import { DecisionAtGlance } from "./DecisionAtGlance";
import { ValidationWorkspace } from "./ValidationWorkspace";
import { saveLocalBrief, loadLocalBriefs } from "../../lib/validation-brief";
import { draftFixture } from "../../test/fixtures/validation-brief";

vi.mock("../ThemeProvider", () => ({ useC: () => new Proxy({}, { get: () => "#556677" }) }));
vi.mock("./dialog", () => ({ dialog: { confirm: vi.fn(async () => true) } }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it("edits shared framing without dropping Strategy Brief fields or custom rubrics and surfaces save failures", () => {
  const onChange = vi.fn();
  const context = { constraints: "One engineer", productSummary: "Keep this", scoring: { timeframe: "30 days", effortBands: { 35: "Five person-days" } } };
  const { rerender } = render(<DecisionFrame context={context} onChange={onChange} />);
  expect(screen.getByText("What decision are you working through?")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit decision frame" }));
  fireEvent.change(screen.getByLabelText("Decision frame: Decision question"), { target: { value: "What should we learn first?" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ constraints: "One engineer", productSummary: "Keep this", scoring: expect.objectContaining({ decisionQuestion: "What should we learn first?", timeframe: "30 days", effortBands: expect.objectContaining({ 35: "Five person-days" }) }) }));
  rerender(<DecisionFrame context={context} onChange={onChange} saveStatus={{ state: "error", message: "Context could not be saved." }} />);
  expect(screen.getByRole("alert").textContent).toBe("Context could not be saved.");
  expect(screen.queryByText(/Context saved/)).toBeNull();
});

it("reopens and resaves an unchanged legacy brief without materializing today's frame or creating a new revision", async () => {
  const draft = draftFixture();
  const record = saveLocalBrief("legacy", draft);
  const context = { ...draft.productContext, scoring: { decisionQuestion: "Current workspace question", audience: "Current audience" } };
  render(<ValidationWorkspace workspaceId="legacy" isSignedIn={false} productContext={context} signals={draft.attachedSignals} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open brief: Approval reminders" }));
  await screen.findByText("Revision 1 · Saved");
  expect(screen.getByText(/This older brief did not preserve comparison context/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save brief", exact: true }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save brief", exact: true }).disabled).toBe(false));
  expect(loadLocalBriefs("legacy")[0]).toEqual(record);
  expect(loadLocalBriefs("legacy")[0].draft.productContext).not.toHaveProperty("scoring");
  expect(loadLocalBriefs("legacy")[0].draft).not.toHaveProperty("nextTest");
});

it("captures shared context in a genuine new revision and invalidates reviewed evidence when the live frame changes", async () => {
  const draft = { ...draftFixture(), evidenceReviewed: true };
  const record = { id: "legacy", title: draft.ideaName, revision: 4, draft };
  const save = vi.fn(async d => ({ ...record, revision: 5, draft: d }));
  const props = { productContext: draft.productContext, signals: draft.attachedSignals, briefs: [record], onSaveBrief: save };
  const { rerender } = render(<ValidateScreen {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Open brief: Approval reminders" }));
  await screen.findByText("Revision 4 · Saved");
  expect(screen.getByLabelText(/I have reviewed/).checked).toBe(true);
  rerender(<ValidateScreen {...props} productContext={{ ...draft.productContext, scoring: { decisionQuestion: " " } }} />);
  expect(screen.getByLabelText(/I have reviewed/).checked).toBe(true);
  expect(screen.getByText("Revision 4 · Saved")).toBeTruthy();
  rerender(<ValidateScreen {...props} productContext={{ ...draft.productContext, scoring: { decisionQuestion: "A new decision question" } }} />);
  await waitFor(() => expect(screen.getByLabelText(/I have reviewed/).checked).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Save brief", exact: true }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].productContext.scoring.decisionQuestion).toBe("A new decision question");
  expect(save.mock.calls[0][0].evidenceReviewed).toBe(false);
  expect(record.draft.productContext).not.toHaveProperty("scoring");
});

it("creates a partial learning plan with an explicit calendar date and owner while preserving free notes separately", async () => {
  const create = vi.fn(async () => {});
  render(<ValidationWorkspace workspaceId="plan" isSignedIn={false} onAddDecision={create} productContext={{ scoring: { decisionQuestion: "What should we test?", impactMetric: "Completion rate; baseline unknown" } }} />);
  fireEvent.change(await screen.findByLabelText("IDEA NAME"), { target: { value: "Investigate readiness" } });
  fireEvent.change(screen.getByLabelText("Test question or assumption"), { target: { value: "Does missing information block approval?" } });
  fireEvent.change(screen.getByLabelText("What would change the choice?"), { target: { value: "Change direction if complete requests still stall." } });
  fireEvent.change(screen.getByLabelText("Test owner"), { target: { value: "Learning owner" } });
  fireEvent.change(screen.getByLabelText("Planned test review date"), { target: { value: "2026-12-18" } });
  fireEvent.change(screen.getByLabelText("NEXT VALIDATION ACTIONS"), { target: { value: "Keep these notes, including an unrelated date 2026-11-01." } });
  fireEvent.click(screen.getByRole("button", { name: "Create Decision Draft" }));
  await waitFor(() => expect(create).toHaveBeenCalledOnce());
  const payload = create.mock.calls[0][0];
  expect(payload.owner).toBe("Learning owner");
  expect(payload.review_date).toBe("2026-12-18T00:00:00.000Z");
  expect(payload.expected_outcome).toBe("");
  const frozen = payload.recommendation_snapshot.validation_brief.draft;
  expect(frozen.nextTest.hypothesis).toBe("Does missing information block approval?");
  expect(frozen.nextTest.method).toBe("");
  expect(frozen.nextActions).toContain("unrelated date 2026-11-01");
  expect(frozen.productContext.scoring.decisionQuestion).toBe("What should we test?");
  expect(payload.final_rationale).toContain("What would change the choice?: Change direction if complete requests still stall.");
  expect(payload.recommendation_snapshot.average).toBeNull();
});

it("does not schedule dates from narrative or substitute expected outcomes when no test was planned", async () => {
  const create = vi.fn(async () => {});
  render(<ValidateScreen onAddDecision={create} />);
  fireEvent.change(screen.getByLabelText("IDEA NAME"), { target: { value: "A question without a test" } });
  fireEvent.change(screen.getByLabelText("NEXT VALIDATION ACTIONS"), { target: { value: "Maybe revisit on 2026-12-18." } });
  fireEvent.click(screen.getByRole("button", { name: "Save as Decision Draft" }));
  await waitFor(() => expect(create).toHaveBeenCalledOnce());
  expect(create.mock.calls[0][0].review_date).toBeNull();
  expect(create.mock.calls[0][0].expected_outcome).toBe("");
});

it("preserves an original learning question/rule in review context without making a retired plan active", () => {
  const decision = { id: "d", title: "Original draft", chosen_candidate_name: "Checklist", expected_outcome: "Unknown", recommendation_snapshot: { validation_brief: { revision: 1, draft: { ...draftFixture(), productContext: { ...draftFixture().productContext, scoring: { impactMetric: "Frozen target; baseline unknown" } }, nextTest: { hypothesis: "Original question", decisionRule: "Original observation that would change the choice" } } } }, reviews: [{ id: "r", action: "retire", reviewed_at: "2026-12-01T00:00:00Z", next_action: "Stop this direction", next_review_date: null }] };
  const { unmount } = render(<><DecisionAtGlance decision={decision} recordId="record" /><DecisionReview decision={decision} onReview={vi.fn()} /></>);
  const glance = screen.getByRole("region", { name: "Decision at a glance" });
  expect(within(glance).queryByText(/Original question/)).toBeNull();
  expect(within(glance).getByText("Stop this direction")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Review decision" }));
  expect(screen.getByText("Original target outcome and baseline")).toBeTruthy();
  expect(screen.getByText("Frozen target; baseline unknown")).toBeTruthy();
  expect(screen.getByText("Original question")).toBeTruthy();
  expect(screen.getByText("Original observation that would change the choice")).toBeTruthy();
  unmount();
  render(<DecisionRationale decision={decision} />);
  expect(screen.getByRole("region", { name: "Next test", exact: true }).textContent).toContain("Original question");
  expect(screen.getByRole("region", { name: "Recorded comparison context" }).textContent).toContain("Frozen target; baseline unknown");
});
