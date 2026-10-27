import { decisionReviewState, getDecisionBrief, latestReview } from "../../lib/decision-record";
import { formatDateOnly } from "../dateOnly";

const text = value => typeof value === "string" ? value.trim() : "";
// Keep the entry point scannable; the complete recorded text stays below.
const excerpt = value => value.length <= 260 ? value : `${value.slice(0, 260).replace(/\s+\S*$/, "")}…`;

export function DecisionAtGlance({ decision, recordId }) {
  const brief = getDecisionBrief(decision);
  const review = latestReview(decision);
  const state = decisionReviewState(decision);
  const historical = Boolean(review || decision.status === "archived");
  const retired = review?.action === "retire";
  const archived = decision.status === "archived";
  const rationale = text(decision.summary_rationale) ? excerpt(brief.rationale) : brief.rationale ? "Read the full recorded rationale below." : "No rationale recorded.";
  const nextAction = text(review?.next_action);
  const nextTest = review ? nextAction || "No next action recorded in the latest review."
    : archived ? "This record is archived. The original proposed test remains in the preserved record below."
    : brief.nextTest ? excerpt(brief.nextTest) : "No next test recorded.";
  return <section className="tz-decision-glance" aria-label="Decision at a glance">
    <div className="tz-glance-heading"><h3>Decision at a glance</h3><span>{state.label}</span></div>
    {historical && <p className="tz-glance-context">{retired ? "This direction was retired. The choice and rationale are preserved as history." : review?.action === "revise" ? "The latest review revised this direction. The original choice and rationale remain below." : archived ? "Archived record. The choice and rationale are historical." : "The original choice and rationale are preserved; the latest review supplies the next action."}</p>}
    <dl className="tz-glance-fields">
      <div className="tz-glance-choice"><dt>{historical ? "Original choice" : "Chosen next step"}</dt><dd><strong>{brief.choice || "No chosen option recorded."}</strong></dd></div>
      <div className="tz-glance-why"><dt>{historical ? "Original rationale" : "Why this direction"}</dt><dd>{rationale}</dd></div>
      <div className="tz-glance-next"><dt>{review ? "Latest next action" : "Next test"}</dt><dd>
        {review && <span className="tz-glance-attribution">Next action from review · {review.action === "revise" ? "Revise" : retired ? "Retire" : "Keep"}</span>}
        {!review && !archived && brief.nextTest && <span className="tz-glance-attribution">Proposed in the saved brief{brief.sourceName ? `: ${brief.sourceName}` : ""}</span>}
        {review ? excerpt(nextTest) : nextTest}
        {retired && <span className="tz-glance-attribution">Retired direction; this records the reason or follow-up, not an active test.</span>}
        {archived && review && !retired && <span className="tz-glance-attribution">Archived record; this is the last recorded action.</span>}
      </dd></div>
      <div className="tz-glance-review"><dt>Review by</dt><dd>{state.dueDate ? <time dateTime={state.dueDate}>{formatDateOnly(state.dueDate)}</time> : "Not scheduled"}<span className="tz-glance-attribution">{state.label}</span></dd></div>
    </dl>
    <a className="tz-glance-record-link" href={`#${recordId}`}>View preserved record <span aria-hidden="true">↓</span></a>
  </section>;
}
