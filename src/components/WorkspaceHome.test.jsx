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

it("opens a read-only fictional story before optional scoring inspection", () => {
  const inspect = vi.fn();
  render(<WorkspaceHome {...props} guestDemo onInspectCandidate={inspect} scored={[
    {id:"r",name:"Approval reminders — synthetic",score:1729,reach:55,impact:55,confidence:20,effort:35},
    {id:"c",name:"Request readiness checklist — synthetic",score:7500,reach:75,impact:75,confidence:20,effort:15},
  ]} decisions={[{id:"archive",title:"Archived QA test",status:"archived"},{id:"current",title:"Pilot choice",status:"draft"}]} />);
  fireEvent.click(screen.getByRole("button", { name: "Start the decision walkthrough" }));
  expect(inspect).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", {name:"Problem",exact:true})).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(screen.getByText("Explore the original records"));
  fireEvent.click(screen.getByRole("button",{name:"Inspect scoring assumptions",exact:true}));
  expect(inspect).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button",{name:"Back to overview",exact:true}));
  expect(document.activeElement).toBe(screen.getByRole("button",{name:"Start the decision walkthrough",exact:true}));
  expect(screen.queryByText("Archived QA test")).toBeNull();
  expect(screen.getByText("Pilot choice")).toBeTruthy();
  expect(screen.getByText("POTENTIAL QUICK WIN")).toBeTruthy();
});

it("reports story focus once across steps and clears it on overview or route unmount", () => {
  const active = vi.fn();
  const { unmount } = render(<WorkspaceHome {...props} guestDemo onStoryActiveChange={active} scored={[
    {id:"r",name:"Reminder",score:100,reach:55,impact:55,confidence:20,effort:35},
  ]} />);
  expect(active).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole("button", {name:"Start the decision walkthrough"}));
  expect(active).toHaveBeenLastCalledWith(true);
  active.mockClear();
  fireEvent.click(screen.getByRole("button", {name:"Next",exact:true}));
  expect(active).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:"Back to overview"}));
  expect(active).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole("button", {name:"Start the decision walkthrough"}));
  expect(active).toHaveBeenLastCalledWith(true);
  unmount();
  expect(active).toHaveBeenLastCalledWith(false);
});

it("opens the due decision directly and excludes retired or archived directions", () => {
  const open=vi.fn();
  render(<WorkspaceHome {...props} onOpenDecision={open} decisions={[
    {id:"due",title:"Check the pilot outcome",status:"draft",review_date:"2020-01-01"},
    {id:"retired",title:"Retired direction",status:"draft",review_date:"2020-01-01",reviews:[{id:"r",action:"retire",reviewed_at:"2026-10-24T12:00:00Z"}]},
    {id:"archived",title:"Archived direction",status:"archived",review_date:"2020-01-01"},
  ]}/>);
  const due=screen.getByRole("region",{name:"Decisions due for review"});
  expect(due.textContent).toContain("Check the pilot outcome");expect(due.textContent).not.toContain("Retired direction");expect(due.textContent).not.toContain("Archived direction");
  fireEvent.click(screen.getByRole("button",{name:/Check the pilot outcome/}));expect(open).toHaveBeenCalledWith("due");
});
