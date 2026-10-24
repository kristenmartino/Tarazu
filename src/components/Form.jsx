import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useC } from "../ThemeProvider";
import { rice } from "../utils";
import { ScoreCard } from "./ScoreCard";
import "./scoring-ui.css";

import { buildScoringContext } from "../../lib/scoring-context";
import { ProductContext } from "./ProductContext";
import { AIContextDetails } from "./AIContextDetails";

import { normalizeCandidateBasis } from "../../lib/scoring-basis";
import { CandidateScoringBasis } from "./ScoringBasis";
import { workspaceSignals } from './ScoringClaims';
import { MAX_CLAIMS } from '../../lib/scoring-claims';

export const Form = ({ onAdd, onCancel, editFeature, productContext, onScoreEvent, onResolveScores, feedbackContext, scored = [], features = [], signals = [], decisions = [], workspaceId, onProductContextChange, saveTarget = "browser", savePendingSync = false }) => {
  const C = useC();
  const [name, setName] = useState(editFeature?.name || ""); const [desc, setDesc] = useState(editFeature?.description || "");
  const [scoringBasis, setScoringBasis] = useState(() => normalizeCandidateBasis(editFeature?.scoringBasis));
  const [owner, setOwner] = useState(editFeature?.owner || ""); const [theme, setTheme] = useState(editFeature?.theme || ""); const [status, setStatus] = useState(editFeature?.status || "");
  const [r, setR] = useState(editFeature?.reach ?? 50); const [i, setI] = useState(editFeature?.impact ?? 50); const [c, setC] = useState(editFeature?.confidence ?? 50); const [e, setE] = useState(editFeature?.effort ?? 50);
  const [aiResults, setAiResults] = useState({});
  const [accepted, setAccepted] = useState({});
  const [hasAcceptedScores, setHasAcceptedScores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedTo, setSavedTo] = useState(saveTarget);
  const [pendingSync, setPendingSync] = useState(savePendingSync);
  const [actionRevision, setActionRevision] = useState(0);
  const [savedActionRevision, setSavedActionRevision] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const pendingFeatureId = useMemo(() => editFeature?.id || `f-${Date.now()}`, [editFeature]);
  const preview = useMemo(() => rice({ reach: r, impact: i, confidence: c, effort: e }), [r, i, c, e]);
  // Rank among the rest of the backlog if saved with these values right now.
  // A raw RICE score means nothing on its own — only its standing relative to
  // the other candidates does — so pair the number with that context instead
  // of showing it in isolation.
  const { previewRank, previewTotal } = useMemo(() => {
    const others = scored.filter(f => f.id !== editFeature?.id);
    const higher = others.filter(f => f.score > preview).length;
    return { previewRank: higher + 1, previewTotal: others.length + 1 };
  }, [scored, preview, editFeature]);
  const formValue = { id: pendingFeatureId, name: name.trim(), description: desc.trim(), scoringBasis, reach: r, impact: i, confidence: c, effort: e, owner: owner.trim() || null, theme: theme.trim() || null, status: status || null };
  const draftSignature = JSON.stringify(formValue);
  const [savedSignature, setSavedSignature] = useState(() => editFeature ? draftSignature : null);
  const dirty = draftSignature !== savedSignature || actionRevision !== savedActionRevision;
  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true); setSaveError(null);
    try {
      const result = await onAdd(formValue);
      setSavedSignature(draftSignature);
      setSavedActionRevision(actionRevision);
      setSavedTo(result?.savedTo || saveTarget);
      setPendingSync(!!result?.pendingSync);
      if (hasAcceptedScores) onResolveScores?.(pendingFeatureId, { reach: r, impact: i, confidence: c, effort: e });
      setHasAcceptedScores(false);
    } catch (error) {
      setSaveError(error.message || 'Could not save. Your edits are still here.');
    } finally { setSaving(false); }
  };

  const setters = { reach: setR, impact: setI, confidence: setC, effort: setE };
  const availableSignals = workspaceSignals(signals, workspaceId);
  const addClaim = claim => setScoringBasis(prev => prev.claims.length < MAX_CLAIMS ? { ...prev, claims: [...prev.claims, claim] } : prev);
  const updateBasis = next => setScoringBasis({ ...next, basisClaimIds: Object.fromEntries(Object.entries(next.basisClaimIds || {}).filter(([dimension, id]) => next.claims.some(claim => claim.id === id && claim.dimension === dimension))) });
  const chooseBasisClaim = (dimension, id) => setScoringBasis(prev => {
    const basisClaimIds = { ...prev.basisClaimIds };
    if (id) basisClaimIds[dimension] = id;
    else delete basisClaimIds[dimension];
    return { ...prev, basisClaimIds };
  });
  const context = buildScoringContext({ productContext, features, signals, decisions, workspaceId, candidateId: editFeature?.id, featureName: name, featureDescription: desc, scoringBasis });
  const signature = JSON.stringify(context);
  const current = useRef(signature); current.current = signature;
  const sequence = useRef(0);
  const [resultSignature, setResultSignature] = useState(null);
  const [usedContext, setUsedContext] = useState(null);
  const stale = resultSignature !== null && resultSignature !== signature;
  useEffect(() => () => { sequence.current += 1; }, []);
  const requestAiScores = useCallback(async (dimensions) => {
    if (!name.trim() || dimensions.length === 0) return;
    const requestId = ++sequence.current;
    const requestedSignature = signature;
    setAiLoading(true); setAiError(null);
    try {
      const res = await fetch("/api/suggest-scores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureName: name.trim(), featureDescription: desc.trim(), scoringBasis, candidateId: editFeature?.id, productContext, dimensions, features, signals, decisions, workspaceId }),
      });
      const data = await res.json();
      if (requestId !== sequence.current || current.current !== requestedSignature) return;
      if (!res.ok) throw new Error(data.error || "AI scoring failed");
      setAccepted({});
      setAiResults(prev => ({ ...(resultSignature === requestedSignature ? prev : {}), ...data }));
      setResultSignature(requestedSignature); setUsedContext(data.context);
    } catch (err) {
      if (requestId === sequence.current && current.current === requestedSignature) setAiError(err.message || "AI scoring failed");
    } finally { if (requestId === sequence.current) setAiLoading(false); }
  }, [name, desc, scoringBasis, signature, resultSignature, editFeature?.id, productContext, features, signals, decisions, workspaceId]);
  const acceptSuggestion = dim => {
    const value = aiResults[dim]?.score;
    if (stale || !Number.isInteger(value) || value < 1 || value > 100) return;
    setters[dim](value);
    setAccepted(prev => ({ ...prev, [dim]: true }));
    setActionRevision(prev => prev + 1);
    setHasAcceptedScores(true);
    onScoreEvent?.([{ feature_id: pendingFeatureId, feature_name: name.trim(), dimension: dim, ai_score: value }]);
  };

  const suggestAll = useCallback(() => {
    if (!name.trim()) return;
    const dims = ["reach", "impact", "confidence", "effort"];
    requestAiScores(dims);
  }, [name, requestAiScores]);

  const inputStyle = { padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: "none", fontFamily: "var(--body)", fontSize: 14 };

  return (
    <div className="tz-candidate-form" role="form" aria-label={editFeature ? "Edit candidate" : "New candidate"} style={{ padding: 20, minWidth: 0, border: `1px solid ${C.borderActive}`, borderRadius: 12, background: C.surface, animation: "slideUp 0.25s ease" }}>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <input value={name} onChange={ev => setName(ev.target.value)} placeholder="Candidate name" aria-label="Candidate name" style={{ ...inputStyle, fontSize: 14 }} onFocus={ev => ev.target.style.borderColor = C.accent} onBlur={ev => ev.target.style.borderColor = C.border} />
        <textarea value={desc} onChange={ev => setDesc(ev.target.value)} placeholder="Brief description (optional)" aria-label="Candidate description" rows={2} style={{ ...inputStyle, fontSize: 15, resize: "vertical" }} onFocus={ev => ev.target.style.borderColor = C.accent} onBlur={ev => ev.target.style.borderColor = C.border} />
        <details><summary style={{ cursor: "pointer", fontSize: 14 }}>Owner, theme & status</summary><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 10 }}>
          <div>
            <label htmlFor="form-owner" style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>OWNER</label>
            <input id="form-owner" value={owner} onChange={ev => setOwner(ev.target.value)} placeholder="Owner" style={{ ...inputStyle, fontSize: 14, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label htmlFor="form-theme" style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>THEME</label>
            <input id="form-theme" value={theme} onChange={ev => setTheme(ev.target.value)} placeholder="Theme" style={{ ...inputStyle, fontSize: 14, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label htmlFor="form-status" style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>STATUS</label>
            <select id="form-status" value={status} onChange={ev => setStatus(ev.target.value)} style={{ ...inputStyle, fontSize: 14, width: "100%", boxSizing: "border-box" }}>
              <option value="">Backlog</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
        </details>
        {onProductContextChange && <ProductContext context={productContext} onChange={onProductContextChange} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div><h2 style={{ fontSize: 20, margin: 0 }}>Review the four scores</h2><p style={{ fontSize: 14, color: C.textMuted, margin: '4px 0 0' }}>Your scores stay in place until you accept a suggestion.</p></div>
          <button type="button" onClick={suggestAll} disabled={!name.trim() || aiLoading || saving} style={{ ...inputStyle, background: C.purpleDim, color: C.purple, fontWeight: 600, cursor: 'pointer' }}>{aiLoading ? 'Suggesting...' : '✦ AI Suggest Scores'}</button>
        </div>
        {aiLoading && <p role="status" style={{ fontSize: 14, margin: 0 }}>Reviewing your context. This can take a minute.</p>}
        {stale && <p role="status" style={{ fontSize: 14, margin: 0 }}>Context changed. Refresh AI before accepting previous suggestions.</p>}
        {aiError && <p role="alert" style={{ fontSize: 14, color: C.danger, margin: 0 }}>{aiError}</p>}
        <div className="tz-score-cards">
          {['reach', 'impact', 'confidence', 'effort'].map(dim => <ScoreCard key={dim} dimension={dim} value={{reach:r,impact:i,confidence:c,effort:e}[dim]} onChange={value => {setters[dim](value);setAccepted(prev => ({...prev,[dim]:false}));}} result={aiResults[dim]} loading={aiLoading} stale={stale} accepted={accepted[dim]} onAccept={() => acceptSuggestion(dim)} context={usedContext} claims={scoringBasis.claims} signals={availableSignals} onAddClaim={addClaim} settings={productContext?.scoring} basis={scoringBasis} onBasisClaimChange={id => chooseBasisClaim(dim, id)} />)}
        </div>
        <CandidateScoringBasis basis={scoringBasis} onChange={updateBasis} signals={availableSignals} />
        <details style={{ fontSize: 14, lineHeight: 1.6 }}><summary style={{ cursor: 'pointer' }}>AI context & data sharing</summary><p>{6 - context.missing.length}/6 Strategy Brief fields and {context.evidence.length} linked signals available. Running AI shares the brief, score definitions, candidate claims, competing options, Signals and related decisions with Tarazu and Anthropic.</p><AIContextDetails context={usedContext} showAssessments={false} /></details>
        <details style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>What scores mean</summary>
          <p>Each number is a band score on a 1–100 scale, not a user count, number of person-days, dollar value or probability. Reach describes the size of the affected audience, impact the benefit per user, confidence the strength of your evidence, and effort the work required. Agree on the same audience, time horizon, and score definitions when comparing candidates; a shared scale alone does not align different teams’ estimates.</p>
          <p>Use the shared scoring basis and candidate answers to record the audience, period, delivery scope and assumptions. Capture supporting or conflicting evidence in Signals. The initial 50s are placeholders to review. AI suggestions are editable estimates; inspect their justification before accepting them.</p>
        </details>
        <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>Current ranking: <strong style={{ color: C.text }}>#{previewRank} of {previewTotal}</strong> · RICE {preview.toLocaleString()}<br />Band-based prioritization index, not measured return or financial value.</div>
        <div className="tz-candidate-save" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
          <div style={{ flex: '1 1 180px', fontSize: 14 }}><strong role="status">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : savedTo === 'cloud' ? 'Saved to cloud' : pendingSync ? 'Saved in this browser · pending sync' : 'Saved in this browser'}</strong><p style={{ margin: '3px 0 0', color: C.textMuted, fontSize: 13 }}>{saving ? 'Keeping your reasoning and scores together.' : dirty ? 'Answers and accepted suggestions stay in this draft until saved.' : savedTo === 'cloud' ? 'Your candidate is saved to this workspace.' : 'Available on this device.'}</p>{saveError && <p role="alert" style={{ color: C.danger, margin: '6px 0 0' }}>{saveError}</p>}</div>
          <button type="button" onClick={submit} disabled={!name.trim() || saving} style={{ padding: '11px 16px', border: 'none', borderRadius: 7, background: name.trim() ? C.accent : C.border, color: C.bg, fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Saving…' : editFeature ? 'Save Changes' : 'Add Candidate'}</button>
          <button type="button" onClick={onCancel} disabled={saving} style={{ ...inputStyle, cursor: 'pointer' }}>Cancel</button>
        </div>
      </fieldset>
    </div>
  );
};
