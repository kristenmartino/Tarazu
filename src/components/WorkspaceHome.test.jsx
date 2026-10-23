import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WorkspaceHome } from "./WorkspaceHome";

afterEach(cleanup);
const props = { scored: [], decisions: [], signals: [], activeWs: { name: "Workspace" }, onScreenChange: vi.fn() };
describe("workspace first-use entry", () => {
  it("lets an empty workspace load examples directly from Home", () => {
    const load = vi.fn();
    render(<WorkspaceHome {...props} onLoadSamples={load} onAddCandidate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Load Example Backlog" }));
    expect(load).toHaveBeenCalledOnce();
    expect(screen.queryByText("AVG RICE")).toBeNull();
  });
  it("keeps a returning user's work visible rather than repeating onboarding", () => {
    render(<WorkspaceHome {...props} scored={[{id:"one",name:"My work",score:50,reach:30,impact:40,confidence:50,effort:60}]} />);
    expect(screen.getAllByText("My work").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Load Example Backlog" })).toBeNull();
  });
});

it("shows the fictional decision story only for the Relay demo and routes its entry to the assumption", () => {
  const inspect = vi.fn();
  render(<WorkspaceHome {...props} onInspectCandidate={inspect} scored={[
    {id:"r",name:"Approval reminders — synthetic",score:1729,reach:55,impact:55,confidence:20,effort:35},
    {id:"c",name:"Request readiness checklist — synthetic",score:7500,reach:75,impact:75,confidence:20,effort:15},
  ]} decisions={[{id:"archive",title:"Archived QA test",status:"archived"},{id:"current",title:"Pilot choice",status:"draft"}]} />);
  fireEvent.click(screen.getByRole("button", { name: "Start the decision walkthrough" }));
  expect(inspect).toHaveBeenCalledOnce();
  expect(screen.getByText("One engineer, two weeks—which option should we test first?")).toBeTruthy();
  expect(screen.queryByText("Archived QA test")).toBeNull();
  expect(screen.getByText("Pilot choice")).toBeTruthy();
  expect(screen.getByText("POTENTIAL QUICK WIN")).toBeTruthy();
});
