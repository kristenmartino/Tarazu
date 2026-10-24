import { describe, it, expect } from 'vitest';
import { getDecisionBrief, evidenceGroups, decisionBriefMarkdown, decisionReviewState, latestReview, makeDecisionReview, validateReview } from './decision-record';

const decision = { id:'d', title:'Test readiness first', status:'draft', chosen_candidate_name:'Checklist', summary_rationale:'Reminders may mask missing context.', expected_outcome:'Hypothesis: fewer incomplete requests', review_date:'2026-11-01', recommendation_snapshot:{ validation_brief:{ revision:4, draft:{ ideaName:'Reminders', assumptions:{problem:'Fictional operators chase approvals'}, risks:'Synthetic sample; causality unknown', nextActions:'Proposed test; not run', evidenceReviewed:false, attachedSignals:[{id:'s',title:'Synthetic interview',body:'Fictional quote. Small sample, not customer validation.',source:'Relay demo',confidence_impact:'decreases'},{id:'a',title:'Prior hypothesis',body:'AI assumption',confidence_impact:'increases'},{id:'b',title:'Scope note',confidence_impact:'other'}] } } } };

describe('portable decision record', () => {
  it('uses the frozen source and retains contradictions, caveats and provenance in the copy', () => {
    const copy = decisionBriefMarkdown(decision);
    expect(copy).toContain('Chosen: Checklist'); expect(copy).toContain('originating candidate: Reminders');
    expect(copy).toContain('revision 4'); expect(copy).toContain('Evidence marked reviewed: no');
    expect(copy).toContain('Fictional quote. Small sample, not customer validation.');
    expect(copy).toContain('AI assumption'); expect(copy).toContain('Synthetic sample; causality unknown');
    expect(evidenceGroups(decision).map(g=>g.items.length)).toEqual([1,1,1]);
    expect(getDecisionBrief(decision).choice).toBe('Checklist');
  });
  it('handles malformed and manual legacy records without inventing evidence', () => {
    const d={title:'Manual', final_rationale:'Manual reasoning', recommendation_snapshot:{validation_brief:{draft:{attachedSignals:[null, 'bad', {}]}}}};
    expect(decisionBriefMarkdown(d)).toContain('Manual reasoning');
    expect(decisionBriefMarkdown({title:'Empty'})).toContain('Not recorded');
    expect(getDecisionBrief(d).evidence).toHaveLength(1);
    expect(getDecisionBrief({}).sourceRevision).toBeNull();
  });
});

describe('dated decision reviews', () => {
  const input={ action:'revise', outcome:'No measured result yet',new_evidence:'A new counterexample',next_action:'Test a checklist with three teams',next_review_date:'2026-12-02',signal_ids:['new','new'] };
  it('freezes selected evidence and the decision without overwriting the original', () => {
    const signals=[{id:'new',title:'New source',body:'User estimate; unverified',source:'Team note'}];
    const before=structuredClone(decision);
    const review=makeDecisionReview(decision,input,signals,{id:'r',reviewed_at:'2026-11-01T00:00:00.000Z',reviewed_by_name:'Owner'});
    expect(decision).toEqual(before); expect(review.action).toBe('revise');
    expect(review.decision_snapshot).toEqual(decision); expect(review.evidence_snapshots).toHaveLength(1);
    signals[0].body='changed'; expect(review.evidence_snapshots[0].body).toBe('User estimate; unverified');
    decisionReviewState({...decision,reviews:[review]},'2026-12-01');
    expect(decisionReviewState({...decision,reviews:[review]},'2026-12-02').isDue).toBe(true);
    expect(review.decision_snapshot.reviews).toBeUndefined();
  });
  it('uses calendar dates, latest review, explicit cleared dates, retirement, and archive status', () => {
    expect(decisionReviewState(decision,'2026-11-01').isDue).toBe(true);
    const early={id:'a',action:'keep',reviewed_at:'2026-11-01T01:00:00.000Z',next_review_date:'2026-12-01'};
    const late={id:'b',action:'retire',reviewed_at:'2026-11-01T02:00:00.000Z',next_review_date:'2026-11-01'};
    const d={...decision,reviews:[late,early,{action:'bogus',reviewed_at:'bad'}]};
    expect(latestReview(d)).toEqual(late); expect(decisionReviewState(d,'2026-12-03')).toMatchObject({isDue:false,dueDate:'',action:'retire'});
    expect(decisionReviewState({...decision,reviews:[{...late,action:'keep',next_review_date:null}]},'2027-01-01').isDue).toBe(false);
    expect(decisionReviewState({...decision,status:'archived'},'2026-12-03').isDue).toBe(false);
    const copy=decisionBriefMarkdown(d); expect(copy).toContain('## Dated reviews'); expect(copy).toContain('not independent verification');
  });
  it('rejects invalid, oversized, stale and missing review inputs', () => {
    for(const data of [null,{}, {...input,action:'approved'}, {...input,outcome:''}, {...input,next_action:''}, {...input,outcome:2}, {...input,outcome:'a'.repeat(12001)}, {...input,next_review_date:'2026-02-30'}, {...input,signal_ids:'x'}, {...input,signal_ids:[null]}, {...input,signal_ids:Array.from({length:51},(_,i)=>String(i))}]) expect(()=>validateReview(data)).toThrow();
    expect(()=>makeDecisionReview(decision,input,[])).toThrow('no longer available');
    expect(validateReview({...input,action:'retire'}).next_review_date).toBeNull();
  });
});

it('prints repeated plans and caveats once while preserving complete source text', () => {
  const plan='Try the paper checklist with five requesters.';
  const caveat='This fictional sample does not establish causation.';
  const d={...structuredClone(decision),tradeoffs_considered:caveat,risks_accepted:'Small sample.',expected_outcome:plan};
  d.recommendation_snapshot.validation_brief.draft.risks=caveat;
  d.recommendation_snapshot.validation_brief.draft.nextActions=plan;
  d.reviews=[{id:'r',action:'revise',reviewed_at:'2026-11-01T00:00:00Z',outcome:'Not tested yet.',next_action:'Try the smaller test.',decision_snapshot:{expected_outcome:plan},evidence_snapshots:[d.recommendation_snapshot.validation_brief.draft.attachedSignals[0]]}];
  const before=JSON.stringify(d);const copied=decisionBriefMarkdown(d);
  expect(copied.split(plan)).toHaveLength(2);expect(copied.split(caveat)).toHaveLength(2);
  expect(copied).toContain('Recorded with the same text as Next test below.');expect(copied).toContain('See Next test.');
  expect(copied).toContain('See Tradeoffs.');expect(copied).toContain('Small sample.');expect(copied).toContain('## Source appendix');
  expect(copied.split('Fictional quote. Small sample, not customer validation.')).toHaveLength(2);
  expect(JSON.stringify(d)).toBe(before);
});
it('keeps distinct historical expectations, edited source versions and manual rationale', () => {
  const d=structuredClone(decision);d.final_rationale='A later recorded rationale.\n\nKeep this exception.';
  const source=d.recommendation_snapshot.validation_brief.draft.attachedSignals[0];
  d.reviews=[{id:'r',action:'keep',reviewed_at:'2026-11-01T00:00:00Z',outcome:'No result',next_action:'Wait',decision_snapshot:{expected_outcome:'An earlier, different hypothesis'},evidence_snapshots:[{...source,body:'Different source version. This is an estimate.'}]}];
  const copied=decisionBriefMarkdown(d);expect(copied).toContain('An earlier, different hypothesis');
  expect(copied).toContain('Fictional quote. Small sample, not customer validation.');expect(copied).toContain('Different source version. This is an estimate.');
  expect(copied).toContain('A later recorded rationale.');expect(copied).toContain('Keep this exception.');
});
