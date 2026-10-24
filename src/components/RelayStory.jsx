import { useEffect, useRef } from "react";
import { useC } from "../ThemeProvider";
import relay from "../demo/relay.json";
import { RELAY_DEMO_ID } from "../../lib/relay-demo";
import "./decision-story.css";

// Exact preserved source provenance also recognises the prepared cloud copy.
// A similarly named personal candidate is not enough to turn on demo UI.
export function relayStoryDecision(decisions = []) {
  const original = relay.decisions[1];
  return decisions.find(record => record.id === original.id) || decisions.find(record =>
    record.recommendation_snapshot?.validation_brief?.id === original.recommendation_snapshot.validation_brief.id
    && record.recommendation_snapshot?.validation_brief?.revision === 5
    && record.recommendation_snapshot?.validation_brief?.draft?.assumptions?.problem === original.recommendation_snapshot.validation_brief.draft.assumptions.problem);
}
export function hasRelayStory({ guestDemo, activeWs, decisions = [] }) {
  if (guestDemo || activeWs?.id === RELAY_DEMO_ID) return true;
  return Boolean(relayStoryDecision(decisions));
}

const steps = [
  { title: "Problem", headline: "Do overdue requests need another reminder?", text: "Relay’s fictional team has one engineer and two weeks. Administrators describe chasing approvals, so reminders seem plausible. But a delay can have more than one cause. The team needs to decide what to test before committing to a build.", note: "The first hypothesis: people are overlooking complete requests." },
  { title: "Evidence", headline: "The competing explanation changes the question.", text: "The fictional administrator notes support reminders. Approver notes point to missing information. A later review finds four of five invented cases waiting for documents. That challenges a reminder-only explanation; it does not establish how common the problem is or prove a checklist works.", note: "Overlooked requests and incomplete requests may need different solutions." },
  { title: "Decision", headline: "Test readiness before committing engineering.", text: "The second draft proposes a paper request-readiness checklist before a reminder build. Keep reminders available for complete requests that are still overlooked. This is a recorded judgment with uncertainty, not an approved build. The prepared rankings and earlier snapshots use different scopes and estimates.", note: "Keep the reason for the choice available when new evidence arrives." },
  { title: "Next test", headline: "Make the next step small enough to learn.", text: "The proposed experiment compares a paper checklist with the current workflow for five hypothetical requesters. Observe whether owner, date and documents are included, then record remaining causes of delay. Review the findings before any engineering commitment. The example contains no completed test or measured outcome.", note: "Return with new evidence; the original reasoning stays available." },
];

export function RelayStory({ step, onStep, onClose, onInspectCandidate, onScreenChange, onOpenDecision, savedDecisionAvailable = true }) {
  const C = useC();
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const current = steps[step];
  return <main id="main-content" tabIndex={-1} className="tz-story" style={{"--story-brass":C.brass || C.warn,"--story-accent":C.accent,"--story-text":C.text,"--story-muted":C.textMuted,"--story-border":C.border,"--story-surface":C.surface}}>
    <div className="tz-story-top"><span className="tz-story-provenance"><span>Prepared original example</span><span>Fictional · read-only</span></span><button onClick={onClose}>Back to overview</button></div>
    <p className="tz-story-intro">A short Relay decision story. Your workspace records are unchanged.</p>
    <nav aria-label="Decision story steps"><ol>{steps.map((item,index)=><li key={item.title}><button aria-current={step===index?"step":undefined} onClick={()=>onStep(index)}><span>{index+1}</span>{item.title}</button></li>)}</ol></nav>
    <article aria-labelledby="relay-story-heading" className="tz-story-page">
      <div className="tz-story-step-heading"><h2 ref={heading} tabIndex={-1} id="relay-story-heading">{current.title}</h2><span className="tz-story-count" aria-live="polite">Step {step+1} of {steps.length}</span></div>
      <h3>{current.headline}</h3>
      <p className="tz-story-copy">{current.text}</p>
      <p className="tz-story-note">{current.note}</p>
      <div className="tz-story-controls"><button disabled={step===0} onClick={()=>onStep(step-1)}>Back</button>{step<3?<button className="tz-story-primary" onClick={()=>onStep(step+1)}>Next</button>:<button className="tz-story-primary" onClick={onOpenDecision}>{savedDecisionAvailable ? "Open the saved decision" : "Open decisions"}</button>}</div>
      {!savedDecisionAvailable&&<p className="tz-story-intro">The original saved decision is no longer in this copy. Explore the current decisions list instead.</p>}
    </article>
    <details className="tz-story-inspect"><summary>Explore the original records</summary><p>These open your current workspace copy. It may include edits made after the prepared example.</p><div><button onClick={onInspectCandidate}>Inspect scoring assumptions</button><button onClick={()=>onScreenChange("signals")}>Inspect the evidence</button><button onClick={()=>onScreenChange("validate")}>Open the saved brief</button><button onClick={onOpenDecision}>{savedDecisionAvailable ? "Open the saved decision" : "Open decisions"}</button></div></details>
  </main>;
}
