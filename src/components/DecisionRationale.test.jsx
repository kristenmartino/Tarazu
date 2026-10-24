import { afterEach,it,expect,vi } from "vitest";
import {render,screen,within,cleanup} from "@testing-library/react";
import {DecisionRationale,isGeneratedBriefText,ReadableText} from "./DecisionRationale";
import {DecisionsScreen} from "./DecisionsScreen";
import relay from "../demo/relay.json";
afterEach(cleanup);
it("recognises an exact original generated brief without treating user edits as a generated copy",()=>{
 for(const decision of relay.decisions) expect(isGeneratedBriefText(decision.final_rationale,decision)).toBe(true);
 const d=relay.decisions[1];expect(isGeneratedBriefText(d.final_rationale+"\nActually choose the dashboard.",d)).toBe(false);
});
it("shows preserved problem, supporting/conflicting evidence, decision and next test as separate sections",()=>{
 const d=relay.decisions[1];const before=JSON.stringify(d);render(<DecisionRationale decision={d}/>);
 for(const name of ['Problem','Evidence','Decision','Next test']) expect(screen.getByRole('region',{name,exact:true})).toBeTruthy();
 expect(screen.getByText(/^Problem and evidence are preserved/).textContent).toContain("4/7 dimensions assessed");
 const evidence=screen.getByRole('region',{name:'Evidence',exact:true});
 expect(within(evidence).getAllByText('Challenges the originating candidate',{exact:false}).length).toBeGreaterThan(0);
 expect(within(evidence).getAllByText('Supports the originating candidate',{exact:false}).length).toBeGreaterThan(0);
 expect(screen.getByText('Full recorded rationale').closest('details').open).toBe(false);
 expect(JSON.stringify(d)).toBe(before);
});
it("keeps a separately edited rationale visible and does not replace it with the source-brief summary",()=>{
 render(<DecisionRationale decision={{...relay.decisions[1],final_rationale:'Choose the dashboard instead.\n\n- Confirm owner visibility\n- Reassess next week'}}/>);
 expect(screen.getByText('Choose the dashboard instead.').closest('details')).toBeNull();
 expect(screen.getByText('Confirm owner visibility')).toBeTruthy();
 expect(screen.getByText('Reassess next week')).toBeTruthy();
});
it("preserves free text and escapes markup without inventing missing historical sections",()=>{
 const {container}=render(<DecisionRationale decision={{final_rationale:'Problem:\nA real decision\n\n- <script>alert(1)</script>\n- Second point',status:'draft'}}/>);
 expect(screen.queryByRole('region',{name:'Evidence',exact:true})).toBeNull();
 expect(container.querySelector('script')).toBeNull();expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
 expect(container.querySelectorAll('li')).toHaveLength(2);
});
it("can open a requested saved decision directly while keeping keyboard disclosure semantics",()=>{
 render(<DecisionsScreen decisions={relay.decisions} initialExpandedId={relay.decisions[1].id} scored={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()}/>);
 const toggle=screen.getByRole('button',{name:'Decision: '+relay.decisions[1].title,exact:true});
 expect(toggle.getAttribute('aria-expanded')).toBe('true');
 expect(screen.getByText(/Source brief:.*Revision 5\./)).toBeTruthy();
});

it("treats malformed legacy metadata conservatively and keeps original text readable",()=>{
 const malformed={...relay.decisions[1],final_rationale:"The owner's actual words",recommendation_snapshot:{average:"4.2",recommendation:{bad:true},assessedCount:4,validation_brief:{revision:{bad:true},draft:{ideaName:{bad:true},assumptions:{problem:{bad:true}},attachedSignals:"legacy text",nextActions:17}}}};
 expect(()=>isGeneratedBriefText(malformed.final_rationale,malformed)).not.toThrow();
 expect(isGeneratedBriefText(malformed.final_rationale,malformed)).toBe(false);
 const {container}=render(<DecisionsScreen decisions={[malformed]} initialExpandedId={malformed.id} scored={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()}/>);
 expect(screen.getByText("The owner's actual words")).toBeTruthy();
 expect(container.textContent).toContain("Revision unavailable");
});
it("keeps an explicitly opened archived source decision visible",()=>{
 const d={...relay.decisions[1],status:"archived"};render(<DecisionsScreen decisions={[d]} initialExpandedId={d.id} scored={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()}/>);
 expect(screen.getByRole("button",{name:"Decision: "+d.title,exact:true}).getAttribute("aria-expanded")).toBe("true");
});

it("does not reinterpret an expected outcome as an experiment",()=>{
 const {rerender}=render(<DecisionRationale decision={{final_rationale:"Use the existing workflow",expected_outcome:"Reduce churn",status:"draft"}}/>);
 expect(screen.getByText("Recorded expected outcome")).toBeTruthy();expect(screen.queryByRole("region",{name:"Next test",exact:true})).toBeNull();
 rerender(<DecisionRationale decision={{...relay.decisions[1],expected_outcome:"Reduce churn"}}/>);
 expect(screen.getByText("Recorded expected outcome")).toBeTruthy();
 const next=screen.getByRole("region",{name:"Next test",exact:true});expect(within(next).getByText(/Original proposed next action/)).toBeTruthy();expect(within(next).queryByText("Reduce churn")).toBeNull();
});
