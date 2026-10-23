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
