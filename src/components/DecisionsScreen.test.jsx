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
