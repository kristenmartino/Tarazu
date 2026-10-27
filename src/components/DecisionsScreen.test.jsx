import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { DecisionsScreen } from "./DecisionsScreen";
import relay from "../demo/relay.json";

vi.mock("../ThemeProvider", () => ({ useC: () => ({}) }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("decision calendar dates", () => {
  it("saves and reopens the exact chosen decision and review dates", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const props = { decisions: [], scored: [], onAdd, onUpdate: vi.fn(), onDelete: vi.fn() };
    const { rerender } = render(<DecisionsScreen {...props} />);
    fireEvent.click(screen.getByText("+ New Decision"));
    fireEvent.change(screen.getByLabelText("Decision title"), { target: { value: "Test decision" } });
    fireEvent.change(screen.getByLabelText("Decision date"), { target: { value: "2026-09-30" } });
    fireEvent.change(screen.getByLabelText("Review date"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    const saved = onAdd.mock.calls[0][0];
    expect(saved.decision_date).toBe("2026-09-30T00:00:00.000Z");
    expect(saved.review_date).toBe("2026-11-01T00:00:00.000Z");
    await waitFor(() => expect(screen.queryByLabelText("Decision title")).toBeNull());
    rerender(<DecisionsScreen {...props} decisions={[{ ...saved, id: "test" }]} />);
    fireEvent.click(screen.getByText("Test decision"));
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByLabelText("Decision date").value).toBe("2026-09-30");
    expect(screen.getByLabelText("Review date").value).toBe("2026-11-01");
  });
});

it("keeps archived records available behind an explicit filter while current decisions are the default", () => {
  render(<DecisionsScreen decisions={[{id:"d",title:"Current draft",status:"draft"},{id:"a",title:"Archived QA record",status:"archived"}]} scored={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.getByText("Current draft")).toBeTruthy();
  expect(screen.queryByText("Archived QA record")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"archived"}));
  expect(screen.getByText("Archived QA record")).toBeTruthy();
  expect(screen.queryByText("Current draft")).toBeNull();
});


it("exposes decision details as a labelled disclosure with a stable controlled panel", () => {
  render(<DecisionsScreen decisions={[{id:"saved",title:"Revisit the test",status:"draft",final_rationale:"Keep the original reasoning"}]} scored={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
  const toggle=screen.getByRole("button",{name:"Decision: Revisit the test",exact:true});
  const panel=document.getElementById(toggle.getAttribute("aria-controls"));
  expect(toggle.getAttribute("aria-expanded")).toBe("false"); expect(panel.hidden).toBe(true);
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");expect(panel.hidden).toBe(false);
  expect(screen.getByRole("region",{name:"Decision: Revisit the test"}).textContent).toContain("Keep the original reasoning");
  fireEvent.click(toggle);expect(panel.hidden).toBe(true);
});

it("focuses and brings the requested preserved decision into view, including an archived record", () => {
  const scroll = vi.fn();
  const originalScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    render(<DecisionsScreen decisions={[{id:"first",title:"Earlier round",status:"draft"},{id:"saved",title:"Preserved round",status:"archived"}]} initialExpandedId="saved" scored={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    const toggle = screen.getByRole("button", {name:"Decision: Preserved round",exact:true});
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(scroll).toHaveBeenCalledWith({block:"start",behavior:"instant"});
    expect(toggle.style.scrollMarginTop).toBe("60px");
  } finally {
    HTMLElement.prototype.scrollIntoView = originalScroll;
  }
});


describe("saved decision at a glance", () => {
  const prepared = relay.decisions[1];
  const props = { scored: [], onAdd: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn(), onReview: vi.fn() };
  const open = decision => render(<DecisionsScreen {...props} decisions={[decision]} initialExpandedId={decision.id} />);
  const summary = () => screen.getByRole("region", { name: "Decision at a glance", exact: true });
  const review = (overrides = {}) => ({ id: "review", reviewed_at: "2026-11-01T12:00:00Z", action: "keep", outcome: "Not tested yet", next_action: "Recruit another requester for the next test.", next_review_date: null, ...overrides });

  it("keeps the chosen option distinct from its source and never invents a formal date from narrative", () => {
    const before = JSON.stringify(prepared);
    open(prepared);
    const glance = summary();
    expect(within(glance).getByText("Request readiness checklist — synthetic")).toBeTruthy();
    expect(within(glance).getByText("Proposed in the saved brief: Approval reminders — synthetic")).toBeTruthy();
    expect(within(glance).getByText("Not scheduled")).toBeTruthy();
    expect(glance.querySelector("time")).toBeNull();
    const anchor = within(glance).getByRole("link", { name: /View preserved record/ });
    const target = document.getElementById(anchor.hash.slice(1));
    expect(target).toBeTruthy();
    expect(target.tabIndex).toBe(-1);
    expect(target.textContent).toContain("Revision 5");
    const fullRationale = within(target).getByText("Full recorded rationale").closest("details");
    expect(fullRationale.textContent).toContain("Strategic fit: 2/5");
    expect(fullRationale.textContent).toContain("Next validation actions: " + prepared.recommendation_snapshot.validation_brief.draft.nextActions);
    expect(JSON.stringify(prepared)).toBe(before);
  });

  it("uses honest empty fields instead of substituting source candidate or expected outcome", () => {
    open({ id: "manual", title: "Manual record", status: "draft", final_rationale: "Use the existing workflow", expected_outcome: "Reduce churn", recommendation_snapshot: { validation_brief: { revision: 1, draft: { ideaName: "Different source candidate" } } } });
    const glance = summary();
    expect(within(glance).getByText("No chosen option recorded.")).toBeTruthy();
    expect(within(glance).getByText("No next test recorded.")).toBeTruthy();
    expect(within(glance).queryByText("Reduce churn")).toBeNull();
    expect(within(glance).queryByText("Different source candidate")).toBeNull();
    expect(screen.getByText("Recorded expected outcome")).toBeTruthy();
    expect(screen.getByText("Use the existing workflow")).toBeTruthy();
  });

  it("respects an explicitly cleared review date and uses the latest valid review action", () => {
    open({ ...prepared, review_date: "2026-10-30", reviews: [review({ id: "new", reviewed_at: "2026-11-03T12:00:00Z" }), review({ id: "old", reviewed_at: "2026-11-01T12:00:00Z", next_action: "Obsolete next step", next_review_date: "2026-11-10" }), review({ id: "invalid", reviewed_at: "bad date", next_action: "Invalid review action" })] });
    const glance = summary();
    expect(within(glance).getByText("Not scheduled")).toBeTruthy();
    expect(within(glance).getByText("Latest next action")).toBeTruthy();
    expect(within(glance).getByText("Recruit another requester for the next test.")).toBeTruthy();
    expect(within(glance).queryByText("Obsolete next step")).toBeNull();
    expect(within(glance).queryByText("Invalid review action")).toBeNull();
    expect(within(glance).queryByText(/Round B proposal/)).toBeNull();
  });

  it("labels revised choices as original and shows the new direction and scheduled calendar date", () => {
    open({ ...prepared, reviews: [review({ action: "revise", next_action: "Compare owner visibility with the paper checklist.", next_review_date: "2026-12-18" })] });
    const glance = summary();
    expect(within(glance).getByText("Original choice")).toBeTruthy();
    expect(within(glance).getByText("Original rationale")).toBeTruthy();
    expect(within(glance).getByText("Compare owner visibility with the paper checklist.")).toBeTruthy();
    expect(within(glance).getByText(/The latest review revised this direction/)).toBeTruthy();
    expect(glance.querySelector("time").dateTime).toBe("2026-12-18");
    expect(within(glance).queryByText(/Round B proposal/)).toBeNull();
  });

  it("marks retirement without presenting the original test or date as active", () => {
    open({ ...prepared, review_date: "2026-10-30", reviews: [review({ action: "retire", next_action: "Stop the pilot and preserve the learning.", next_review_date: "2026-12-18" })] });
    const glance = summary();
    expect(within(glance).getByText(/This direction was retired/)).toBeTruthy();
    expect(within(glance).getByText("Stop the pilot and preserve the learning.")).toBeTruthy();
    expect(within(glance).getByText(/not an active test/)).toBeTruthy();
    expect(within(glance).getByText("Not scheduled")).toBeTruthy();
    expect(glance.querySelector("time")).toBeNull();
    expect(within(glance).queryByText(/Round B proposal/)).toBeNull();
  });

  it("keeps archived test plans in the historical record instead of the current summary", () => {
    open({ ...prepared, status: "archived" });
    const glance = summary();
    expect(within(glance).getByText(/This record is archived/)).toBeTruthy();
    expect(within(glance).queryByText(/Round B proposal/)).toBeNull();
    expect(screen.getByRole("region", { name: "Next test", exact: true }).textContent).toContain("Round B proposal");
  });

  it("targets each decision's own preserved record after keyboard-operable expansion", () => {
    render(<DecisionsScreen {...props} decisions={relay.decisions} />);
    const targets = [];
    for (const decision of relay.decisions) {
      fireEvent.click(screen.getByRole("button", { name: "Decision: " + decision.title, exact: true }));
      const link = within(summary()).getByRole("link", { name: /View preserved record/ });
      targets.push(link.hash);
      const target = document.getElementById(link.hash.slice(1));
      expect(target.closest("[role=region]").getAttribute("aria-labelledby")).toBe("decision-toggle-" + decision.id);
    }
    expect(new Set(targets).size).toBe(relay.decisions.length);
  });
});
