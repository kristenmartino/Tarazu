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
  { title: "Problem", headline: "Do overdue requests need another reminder?", text: "Relay has one engineer and two weeks. Administrators say they spend time chasing approvals, so reminders seem worth trying. The team needs to check what causes the delays before choosing what to build.", note: "The first hypothesis: people are overlooking complete requests." },
  { title: "Evidence", headline: "The competing explanation changes the question.", text: "Administrator notes support reminders. Approvers describe missing information. In this example, four of five reviewed cases were waiting for documents. The sample is too small to establish how common that problem is or whether a checklist will help.", note: "Overlooked requests and incomplete requests may need different solutions." },
  { title: "Decision", headline: "Test readiness before committing engineering.", text: "The team chooses a paper checklist experiment before building reminders. Reminders remain an option for complete requests that people overlook. The saved draft records why the team chose a lower-ranked option and what it still needs to learn.", note: "Keep the reason for the choice available when new evidence arrives." },
  { title: "Next test", headline: "Make the next step small enough to learn.", text: "Try a paper checklist with five requesters and compare it with the current process. Check whether each request includes an owner, date and required documents. Record the remaining causes of delay before deciding on engineering work. This test has not been run.", note: "Return with new evidence; the original reasoning stays available." },
];

export function RelayStory({ step, onStep, onClose, onInspectCandidate, onScreenChange, onOpenDecision, savedDecisionAvailable = true }) {
  const C = useC();
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const current = steps[step];
  return <main id="main-content" tabIndex={-1} className="tz-story" style={{"--story-brass":C.brass || C.warn,"--story-accent":C.accent,"--story-text":C.text,"--story-muted":C.textMuted,"--story-border":C.border,"--story-surface":C.surface}}>
    <div className="tz-story-top"><span className="tz-story-provenance"><span>Prepared original example</span><span>Fictional · read-only</span></span><button onClick={onClose}>Back to overview</button></div>
    <p className="tz-story-intro">See why the team chose a checklist experiment. The story does not edit your records.</p>
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
