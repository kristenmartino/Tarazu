import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ValidateScreen } from "./ValidateScreen";
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
