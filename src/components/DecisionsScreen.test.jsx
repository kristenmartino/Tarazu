import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { DecisionsScreen } from "./DecisionsScreen";

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
