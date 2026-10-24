import { afterEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RelayStory, hasRelayStory } from "./RelayStory";
import { WorkspaceHome } from "./WorkspaceHome";
import relay from "../demo/relay.json";
afterEach(cleanup);

it("uses reserved demo identity or exact frozen source provenance, not similar candidate names",()=>{
  expect(hasRelayStory({guestDemo:false,activeWs:{id:"mine"},decisions:[]})).toBe(false);
  expect(hasRelayStory({guestDemo:true})).toBe(true);
  expect(hasRelayStory({decisions:relay.decisions})).toBe(true);
  const edited=JSON.parse(JSON.stringify(relay.decisions));edited[1].id="different";edited[1].recommendation_snapshot.validation_brief.draft.assumptions.problem="My own problem";
  expect(hasRelayStory({decisions:edited})).toBe(false);
});
it("keeps the quick story read-only, focuses each step and exposes the actual saved decision only by explicit action",()=>{
  const props={step:0,onStep:vi.fn(),onClose:vi.fn(),onInspectCandidate:vi.fn(),onScreenChange:vi.fn(),onOpenDecision:vi.fn()};
  const {rerender}=render(<RelayStory {...props}/>);
  expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Problem",exact:true}));
  expect(screen.getByRole("button",{name:"Back",exact:true}).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:"Next",exact:true}));expect(props.onStep).toHaveBeenLastCalledWith(1);
  expect(props.onInspectCandidate).not.toHaveBeenCalled();
  rerender(<RelayStory {...props} step={1}/>);expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Evidence",exact:true}));
  expect(screen.getByText(/does not establish how common/)).toBeTruthy();
  rerender(<RelayStory {...props} step={3}/>);fireEvent.click(screen.getAllByRole("button",{name:"Open the saved decision",exact:true})[0]);expect(props.onOpenDecision).toHaveBeenCalledOnce();
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("does not turn similarly named personal work into a fictional demo",()=>{
  render(<WorkspaceHome scored={relay.features.map(f=>({...f,score:100}))} decisions={[]} signals={[]} activeWs={{id:"my-work",name:"Mine"}} onScreenChange={vi.fn()}/>);
  expect(screen.queryByRole("button",{name:"Start the decision walkthrough",exact:true})).toBeNull();
  expect(screen.getByRole("button",{name:"Review your priorities",exact:true})).toBeTruthy();
});
