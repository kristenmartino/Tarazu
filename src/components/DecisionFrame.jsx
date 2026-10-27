import { useState, useId } from "react";
import { SCORING_FIELDS, normalizeScoringSettings } from "../../lib/scoring-basis";
import "./decision-workflow.css";

export function DecisionFrame({ context = {}, onChange, compact = false, readOnly = false, fictional = false, saveStatus }) {
  const [editing, setEditing] = useState(false);
  const id = useId();
  const scoring = normalizeScoringSettings(context.scoring);
  const fields = ["decisionQuestion", "problem", "impactMetric", "audience", "timeframe"];
  return <section className={`tz-decision-frame${compact ? " tz-frame-compact" : ""}`} aria-label="Shared decision frame">
    <div className="tz-frame-heading"><div><p className="tz-workflow-eyebrow">{fictional ? "Fictional comparison context" : "Shared frame · this workspace"}</p><h3>{scoring.decisionQuestion || "What decision are you working through?"}</h3></div>
      {!readOnly && onChange && <button type="button" className="tz-workflow-button" aria-expanded={editing} aria-controls={id} onClick={() => setEditing(value => !value)}>{editing ? "Done editing frame" : "Edit decision frame"}</button>}
    </div>
    {!editing && <><p className="tz-frame-outcome"><strong>What should improve?</strong> {scoring.impactMetric || "Target outcome and current baseline not recorded. Unknown is a useful starting point."}</p><dl className="tz-frame-context">{["problem", "audience", "timeframe"].map(key => <div key={key}><dt>{SCORING_FIELDS[key].label}</dt><dd>{scoring[key] || "Not recorded"}</dd></div>)}</dl></>}
    {editing && <div id={id} className="tz-workflow-form">{fields.map(key => <label key={key}><span>{SCORING_FIELDS[key].label}</span><textarea aria-label={`Decision frame: ${SCORING_FIELDS[key].label}`} value={scoring[key]} maxLength={700} rows={key === "decisionQuestion" || key === "problem" || key === "impactMetric" ? 2 : 1} placeholder={SCORING_FIELDS[key].placeholder} onChange={event => onChange({ ...context, scoring: { ...scoring, [key]: event.target.value } })} /></label>)}</div>}
    {fictional && <p className="tz-workflow-note">Fictional browser copy. Frame edits do not rewrite the prepared walkthrough.</p>}
    <p className="tz-workflow-note">Optional context for comparing responses. Check whether each option addresses this problem; existing scores stay unchanged.</p>
    {saveStatus?.message && <p role={saveStatus.state === "error" ? "alert" : "status"} className={saveStatus.state === "error" ? "tz-workflow-error" : "tz-workflow-note"}>{saveStatus.message}</p>}
  </section>;
}
