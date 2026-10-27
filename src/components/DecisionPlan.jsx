import { NEXT_TEST_FIELDS, normalizeNextTest, hasNextTest } from "../../lib/decision-plan";
import { SCORING_FIELDS, normalizeScoringSettings } from "../../lib/scoring-basis";
import { formatDateOnly } from "../dateOnly";
import "./decision-workflow.css";

export function NextTestPlan({ plan, onChange }) {
  const values = normalizeNextTest(plan);
  if (onChange) return <section className="tz-next-test-plan" aria-label="Plan the next test"><p className="tz-workflow-eyebrow">Next learning action · optional</p><h3>What would help you choose?</h3><p className="tz-workflow-note">A partial plan is fine. Record what you need to learn and what would change your mind; no result is implied.</p><div className="tz-workflow-form">{Object.entries(NEXT_TEST_FIELDS).map(([key, field]) => <label key={key}><span>{field.label}</span>{key === "reviewDate" ? <input type="date" aria-label={field.label} value={values[key]} onChange={event => onChange({ ...values, [key]: event.target.value })} /> : <textarea aria-label={field.label} value={values[key]} placeholder={field.placeholder} maxLength={field.maxLength} rows={key === "owner" ? 1 : 2} onChange={event => onChange({ ...values, [key]: event.target.value })} />}</label>)}</div></section>;
  if (!hasNextTest(plan)) return null;
  return <dl className="tz-recorded-plan">{Object.entries(NEXT_TEST_FIELDS).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{values[key] ? key === "reviewDate" ? formatDateOnly(values[key]) || values[key] : values[key] : "Not recorded"}</dd></div>)}</dl>;
}

export function RecordedComparisonContext({ scoring }) {
  if (!scoring || typeof scoring !== "object" || Array.isArray(scoring)) return <p className="tz-workflow-note">Comparison context was not preserved in this older brief.</p>;
  const value = normalizeScoringSettings(scoring);
  return <dl className="tz-recorded-plan">{Object.entries(SCORING_FIELDS).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{value[key] || "Not recorded"}</dd></div>)}</dl>;
}
