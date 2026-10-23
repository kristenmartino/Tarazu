import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ValidateScreen } from "./ValidateScreen";
import { dialog } from "./dialog";
import { VALIDATE_DIMENSIONS } from "../validate/validationScore";
vi.mock("../ThemeProvider", () => ({ useC: () => new Proxy({}, { get: () => "#556677" }) }));
afterEach(cleanup);

describe("validation evidence and draft flow", () => {
  it("saves an incomplete draft without inventing ratings or a verdict", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<ValidateScreen onAddDecision={save} />);
    expect(screen.queryByText("Pivot", { exact: true })).toBeNull();
    expect(screen.getAllByText("Not assessed").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("IDEA NAME"), { target: { value: "Idea" } });
    fireEvent.click(screen.getByLabelText("Problem severity: 5 of 5"));
    expect(screen.getByText("Assessment incomplete")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Save as Decision Draft/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const payload = save.mock.calls[0][0];
    expect(payload.recommendation_snapshot).toMatchObject({ average: null, recommendation: "Assessment incomplete", scores: { problemSeverity: 5, evidenceStrength: null } });
    expect(payload.final_rationale).toContain("Evidence strength: Not assessed");
  });

  it("requires review, preserves conflicting evidence and invalidates review on attachment changes", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<ValidateScreen onAddDecision={save} signals={[{ id: "s1", title: "Customer hesitation", confidence_impact: "decreases" }]} />);
    fireEvent.change(screen.getByLabelText("IDEA NAME"), { target: { value: "Idea" } });
    fireEvent.change(screen.getByLabelText("PROBLEM"), { target: { value: "Slow approvals" } });
    fireEvent.change(screen.getByLabelText("AUDIENCE"), { target: { value: "Admins" } });
    for (const d of VALIDATE_DIMENSIONS) fireEvent.click(screen.getByLabelText(`${d.label}: 4 of 5`));
    expect(screen.getByText("Validate Further")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Attach signal: Customer hesitation"));
    expect(screen.queryByText("Build", { exact: true })).toBeNull();
    const review = screen.getByLabelText(/I have reviewed/);
    fireEvent.click(review);
    expect(screen.getByText("Build", { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Attach signal: Customer hesitation"));
    fireEvent.click(screen.getByLabelText("Attach signal: Customer hesitation"));
    expect(screen.getByLabelText(/I have reviewed/).checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Save as Decision Draft/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].final_rationale).toContain("Customer hesitation — decreases");
  });
});


it("continues the latest saved brief only after explicit discard of a dirty draft", async () => {
  const confirm = vi.spyOn(dialog, "confirm").mockResolvedValue(false);
  const draft = name => ({ mode: "manual", candidateId: "", ideaName: name, ideaDesc: "", manualName: name, manualDesc: "", assumptions: {}, scores: Object.fromEntries(VALIDATE_DIMENSIONS.map(d => [d.key, null])), attachedSignals: [], evidenceReviewed: false, productContext: Object.fromEntries(["productSummary", "targetUsers", "strategicPriorities", "constraints", "assumptions", "successMetrics"].map(key => [key, ""])), risks: "", nextActions: "" });
  render(<ValidateScreen onSaveBrief={vi.fn()} briefs={[{id:"older",title:"Older brief",revision:1,updated_at:"2026-10-21",draft:draft("Older brief")},{id:"latest",title:"Latest brief",revision:3,updated_at:"2026-10-23",draft:draft("Latest brief")}]} />);
  fireEvent.change(screen.getByLabelText("IDEA NAME"), { target: { value: "Unfinished draft" } });
  fireEvent.click(screen.getByRole("button", {name:"Continue latest saved brief"}));
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  expect(screen.getByLabelText("IDEA NAME").value).toBe("Unfinished draft");
  confirm.mockResolvedValue(true);
  fireEvent.click(screen.getByRole("button", {name:"Continue latest saved brief"}));
  await waitFor(() => expect(screen.getByLabelText("IDEA NAME").value).toBe("Latest brief"));
  confirm.mockRestore();
});
