import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CopyDecisionBrief, DecisionReview } from "./DecisionReview";
import { decisionBriefMarkdown } from "../../lib/decision-record";
import relay from "../demo/relay.json";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const decision = { id: "d", title: "Try a checklist", chosen_candidate_name: "Checklist", expected_outcome: "A measurable improvement", final_rationale: "Original reasoning", review_date:"2026-01-01" };

it("copies preserved sources and reports clipboard success",async()=>{
 const writeText=vi.fn().mockResolvedValue(undefined);vi.stubGlobal("navigator",{clipboard:{writeText}});
 render(<CopyDecisionBrief decision={relay.decisions[1]}/>);fireEvent.click(screen.getByRole("button",{name:"Copy decision brief"}));
 await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("Decision brief copied"));
 expect(writeText).toHaveBeenCalledWith(decisionBriefMarkdown(relay.decisions[1]));
 expect(writeText.mock.calls[0][0]).toContain("SYNTHETIC");
});
it("provides selectable text when clipboard access is denied",async()=>{
 vi.stubGlobal("navigator",{clipboard:{writeText:vi.fn().mockRejectedValue(new Error("Denied"))}});
 render(<CopyDecisionBrief decision={decision}/>);fireEvent.click(screen.getByRole("button",{name:"Copy decision brief"}));
 const text=await screen.findByLabelText("Decision brief to copy");expect(text.value).toContain("Original reasoning");expect(document.activeElement).toBe(text);
 expect(text.selectionEnd).toBe(text.value.length);
 fireEvent.click(screen.getByRole("button",{name:"Close copy text"}));expect(document.activeElement).toBe(screen.getByRole("button",{name:"Copy decision brief"}));expect(screen.getByRole("status").textContent).toBe("");expect(screen.queryByLabelText("Decision brief to copy")).toBeNull();
});
it("retains review notes on failure, blocks duplicate saves, and restores trigger focus on success",async()=>{
 let rejectFirst;const onReview=vi.fn().mockImplementationOnce(()=>new Promise((_,reject)=>{rejectFirst=reject;})).mockResolvedValue({id:"r"});
 render(<DecisionReview decision={decision} signals={[{id:"s",title:"New interview",source:"Interview notes"}]} onReview={onReview}/>);
 const trigger=screen.getByRole("button",{name:"Review decision"});fireEvent.click(trigger);
 expect(document.activeElement).toBe(screen.getByLabelText(/What happened/));
 fireEvent.change(screen.getByLabelText(/What happened/),{target:{value:"Still unknown"}});
 fireEvent.click(screen.getByRole("radio",{name:"Revise"}));
 fireEvent.change(screen.getByLabelText("Revised direction and next action"),{target:{value:"Try a smaller test first"}});
 fireEvent.click(screen.getByText("Add new evidence (optional)"));fireEvent.click(screen.getByRole("checkbox",{name:/New interview/}));
 fireEvent.click(screen.getByRole("button",{name:"Save review"}));fireEvent.click(screen.getByRole("button",{name:"Saving review…"}));
 expect(onReview).toHaveBeenCalledTimes(1);expect(onReview.mock.calls[0]).toEqual(["d",{action:"revise",outcome:"Still unknown",new_evidence:"",next_action:"Try a smaller test first",next_review_date:null,signal_ids:["s"]}]);
 rejectFirst(new Error("Network"));await screen.findByRole("alert");expect(screen.getByLabelText(/What happened/).value).toBe("Still unknown");
 fireEvent.click(screen.getByRole("button",{name:"Save review"}));await waitFor(()=>expect(screen.queryByLabelText(/What happened/)).toBeNull());
 expect(screen.getByRole("status").textContent).toContain("Review saved");expect(document.activeElement).toBe(trigger);
 expect(decision.final_rationale).toBe("Original reasoning");
});
it("cancel returns focus, and retirement explains its effect without removing the original",()=>{
 render(<DecisionReview decision={decision} onReview={vi.fn()}/>);const trigger=screen.getByRole("button",{name:"Review decision"});fireEvent.click(trigger);fireEvent.click(screen.getByRole("radio",{name:"Retire"}));
 expect(screen.getByText(/Retire means stop pursuing/)).toBeTruthy();expect(screen.queryByLabelText(/Next review date/)).toBeNull();fireEvent.click(screen.getByRole("button",{name:"Cancel review"}));expect(document.activeElement).toBe(trigger);
});
it("shows reported outcomes separately from the original expected result and preserves review sources",()=>{
 render(<DecisionReview decision={{...decision,reviews:[{id:"r",reviewed_at:"2026-10-24T12:00:00Z",action:"keep",outcome:"No result yet",next_action:"Continue collecting evidence",new_evidence:"One small sample",evidence_snapshots:[{id:"s",title:"Historical source",body:"Original caveat"}],decision_snapshot:{title:"Older title",chosen_candidate_name:"Checklist",expected_outcome:"The expected outcome at review time"}}]}} onReview={vi.fn()}/>);
 expect(screen.getByText("Latest review · Keep")).toBeTruthy();fireEvent.click(screen.getByText("Review history (1)"));expect(screen.getByText(/Reviewed record: Older title/)).toBeTruthy();expect(screen.getByText("Original caveat")).toBeTruthy();expect(screen.getByText("The expected outcome at review time")).toBeTruthy();
});
