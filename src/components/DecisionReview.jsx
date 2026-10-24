import { useEffect, useRef, useState } from "react";
import { decisionBriefMarkdown, decisionReviewState, latestReview } from "../../lib/decision-record";
import { formatDateOnly } from "../dateOnly";
import { ReadableText } from "./DecisionRationale";

export function CopyDecisionBrief({ decision }) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [pending, setPending] = useState(false);
  const textRef = useRef(null);
  const copyTrigger = useRef(null);
  useEffect(() => { if (fallback) { textRef.current?.focus(); textRef.current?.select(); } }, [fallback]);
  const copy = async () => {
    setPending(true); setMessage("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(decisionBriefMarkdown(decision));
      setFallback(false); setMessage("Decision brief copied. Review it before sharing.");
    } catch {
      setFallback(true); setMessage("Clipboard access is unavailable. Select and copy the brief below.");
    } finally { setPending(false); }
  };
  return <div className="tz-brief-copy">
    <button type="button" ref={copyTrigger} className="tz-record-button" disabled={pending} onClick={copy}>{pending ? "Copying…" : "Copy decision brief"}</button>
    <p role="status" className="tz-decision-source">{message}</p>
    {fallback && <div><label htmlFor={`brief-copy-${decision.id}`}>Decision brief to copy</label><textarea ref={textRef} id={`brief-copy-${decision.id}`} readOnly value={decisionBriefMarkdown(decision)} rows={10} /><button type="button" className="tz-record-button" onClick={() => { setFallback(false); setMessage(""); copyTrigger.current?.focus(); }}>Close copy text</button></div>}
  </div>;
}

const emptyReview = () => ({ action: "keep", outcome: "", new_evidence: "", next_action: "", next_review_date: "", signal_ids: [] });
const actionLabel = { keep: "Keep", revise: "Revise", retire: "Retire" };

export function DecisionReview({ decision, signals = [], onReview }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyReview);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const trigger = useRef(null);
  const outcomeRef = useRef(null);
  const busy = useRef(false);
  const restoreFocus = useRef(false);
  const sectionRef = useRef(null);
  const state = decisionReviewState(decision);
  const latest = latestReview(decision);
  const reviews = Array.isArray(decision.reviews) ? [...decision.reviews].filter(r => r && typeof r === "object").sort((a,b) => (Date.parse(b.reviewed_at) || 0) - (Date.parse(a.reviewed_at) || 0) || String(b.id || "").localeCompare(String(a.id || ""))) : [];
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  useEffect(() => { if (editing) { outcomeRef.current?.focus(); sectionRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" }); } }, [editing]);
  useEffect(() => { if (!editing && !pending && restoreFocus.current) { trigger.current?.focus(); restoreFocus.current = false; } }, [editing, pending]);
  const close = () => { restoreFocus.current = true; setEditing(false); setError(""); };
  const save = async event => {
    event.preventDefault();
    if (busy.current) return;
    if (!form.outcome.trim() || !form.next_action.trim()) { setError("Record what happened and the reason or next action. Unknown outcomes are welcome."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await onReview(decision.id, { ...form, outcome: form.outcome.trim(), new_evidence: form.new_evidence.trim(), next_action: form.next_action.trim(), next_review_date: form.next_review_date || null });
      restoreFocus.current = true; setForm(emptyReview()); setEditing(false); setMessage("Review saved. The original decision and its evidence are preserved.");
    } catch { setError("The review could not be saved. Your notes are still here; please try again."); }
    finally { busy.current = false; setPending(false); }
  };
  return <section className="tz-decision-review" ref={sectionRef} aria-label="Decision review">
    <div className="tz-record-section-heading"><div><h3>Revisit this decision</h3><p className="tz-decision-source">{state.label}{state.dueDate ? ` · ${formatDateOnly(state.dueDate)}` : ""}</p></div><button type="button" ref={trigger} className="tz-record-button tz-record-primary" disabled={!onReview || pending} aria-expanded={editing} aria-controls={`review-form-${decision.id}`} onClick={() => { setMessage(""); setEditing(true); }}>Review decision</button></div>
    <p className="tz-decision-source">Record what happened and whether to keep, revise or retire the direction. A review adds a dated update; it does not rewrite or approve the original decision.</p>
    <p role="status" className="tz-decision-source">{message}</p>
    {editing && <form id={`review-form-${decision.id}`} onSubmit={save} className="tz-review-form">
      <div className="tz-review-expected"><h4>Originally expected</h4><ReadableText text={decision.expected_outcome || "No expected outcome was recorded."} /></div>
      <label htmlFor={`review-outcome-${decision.id}`}>What happened?<span>Report an observed outcome, or say what is still unknown.</span></label>
      <textarea id={`review-outcome-${decision.id}`} ref={outcomeRef} value={form.outcome} onChange={e => set("outcome", e.target.value)} rows={3} maxLength={12000} required disabled={pending} />
      <fieldset disabled={pending}><legend>What should happen to this direction?</legend><div className="tz-review-choices">{Object.entries(actionLabel).map(([value,label]) => <label key={value}><input type="radio" name={`review-action-${decision.id}`} value={value} checked={form.action === value} onChange={() => set("action",value)} />{label}</label>)}</div></fieldset>
      <p className="tz-decision-source">{form.action === "revise" ? "Describe the revised direction below. The original choice stays in the record." : form.action === "retire" ? "Retire means stop pursuing this direction. The original record remains available." : "Keep means continue with the current direction, subject to the evidence you record."}</p>
      <label htmlFor={`review-next-${decision.id}`}>{form.action === "revise" ? "Revised direction and next action" : "Reason and next action"}</label>
      <textarea id={`review-next-${decision.id}`} value={form.next_action} onChange={e => set("next_action", e.target.value)} rows={3} maxLength={12000} required disabled={pending} />
      <details><summary>Add new evidence (optional)</summary><label htmlFor={`review-evidence-${decision.id}`}>What did you learn?<span>Include the source, date and limits of the evidence. Notes are reported information, not independent verification.</span></label><textarea id={`review-evidence-${decision.id}`} value={form.new_evidence} onChange={e => set("new_evidence",e.target.value)} rows={3} maxLength={12000} disabled={pending} />
        {signals.length > 0 && <fieldset disabled={pending}><legend>Preserve workspace Signals with this review</legend>{signals.map(signal => <label key={signal.id} className="tz-review-signal"><input type="checkbox" checked={form.signal_ids.includes(signal.id)} onChange={e => set("signal_ids",e.target.checked ? [...form.signal_ids,signal.id] : form.signal_ids.filter(id => id !== signal.id))} /><span>{signal.title || "Untitled Signal"}{signal.source && <small>{signal.source}</small>}</span></label>)}</fieldset>}
      </details>
      {form.action !== "retire" && <><label htmlFor={`review-date-${decision.id}`}>Next review date (optional)<span>Leave blank to clear the previous reminder.</span></label><input type="date" id={`review-date-${decision.id}`} value={form.next_review_date} onChange={e => set("next_review_date",e.target.value)} disabled={pending} /></>}
      {error && <p role="alert" className="tz-record-error">{error}</p>}
      <div className="tz-record-actions"><button type="submit" disabled={pending} className="tz-record-button tz-record-primary">{pending ? "Saving review…" : "Save review"}</button><button type="button" disabled={pending} className="tz-record-button" onClick={close}>Cancel review</button></div>
    </form>}
    {latest && <div className="tz-review-latest"><h4>Latest review · {actionLabel[latest.action] || "Recorded"}</h4><p className="tz-decision-source">{formatDateOnly(latest.reviewed_at)}{latest.reviewed_by_name ? ` · ${latest.reviewed_by_name}` : ""} · Reported outcome</p><ReadableText text={latest.outcome}/><h4>Reason and next action</h4><ReadableText text={latest.next_action}/></div>}
    {reviews.length > 0 && <details className="tz-review-history"><summary>Review history ({reviews.length})</summary>{reviews.map(review => <article key={review.id}><h4>{formatDateOnly(review.reviewed_at)} · {actionLabel[review.action] || "Recorded"}</h4>{review.decision_snapshot && (review.decision_snapshot.title !== decision.title || review.decision_snapshot.chosen_candidate_name !== decision.chosen_candidate_name) && <p className="tz-decision-source">Reviewed record: {review.decision_snapshot.title || "Untitled"}{review.decision_snapshot.chosen_candidate_name ? ` · Chosen: ${review.decision_snapshot.chosen_candidate_name}` : ""}</p>}<h5>Expected at this review</h5><ReadableText text={review.decision_snapshot?.expected_outcome || "No expected outcome was preserved with this review."}/><h5>Reported outcome</h5><ReadableText text={review.outcome}/><h5>Reason and next action</h5><ReadableText text={review.next_action}/>{review.new_evidence && <><h5>New evidence notes</h5><ReadableText text={review.new_evidence}/></>}{Array.isArray(review.evidence_snapshots) && review.evidence_snapshots.length > 0 && <><h5>Sources preserved with this review</h5><ul>{review.evidence_snapshots.map((source,index) => <li key={`${source.id}:${index}`}><strong>{source.title || "Preserved source"}</strong>{source.source && <p className="tz-decision-source">{source.source}</p>}<ReadableText text={source.body}/></li>)}</ul></>}{review.next_review_date && <p className="tz-decision-source">Next review: {formatDateOnly(review.next_review_date)}</p>}</article>)}</details>}
  </section>;
}
