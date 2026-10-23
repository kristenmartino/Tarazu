import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useC } from "../ThemeProvider";
import { rice } from "../utils";
import { Slider } from "./Slider";

import { buildScoringContext, BRIEF_FIELDS } from "../../lib/scoring-context";
import { ProductContext } from "./ProductContext";
import { AIContextDetails, referenceLabel } from "./AIContextDetails";

import { SCORING_ANCHORS, normalizeCandidateBasis } from "../../lib/scoring-basis";
import { CandidateScoringBasis } from "./ScoringBasis";
import { ScoringFollowUp, newScoringClaim, workspaceSignals } from './ScoringClaims';
import { CLAIM_KINDS, MAX_CLAIMS } from '../../lib/scoring-claims';

export const Form = ({ onAdd, onCancel, editFeature, productContext, onScoreEvent, onResolveScores, feedbackContext, scored = [], features = [], signals = [], decisions = [], workspaceId, onProductContextChange }) => {
  const C = useC();
  const [name, setName] = useState(editFeature?.name || ""); const [desc, setDesc] = useState(editFeature?.description || "");
  const [scoringBasis, setScoringBasis] = useState(() => normalizeCandidateBasis(editFeature?.scoringBasis));
  const [owner, setOwner] = useState(editFeature?.owner || ""); const [theme, setTheme] = useState(editFeature?.theme || ""); const [status, setStatus] = useState(editFeature?.status || "");
  const [r, setR] = useState(editFeature?.reach ?? 50); const [i, setI] = useState(editFeature?.impact ?? 50); const [c, setC] = useState(editFeature?.confidence ?? 50); const [e, setE] = useState(editFeature?.effort ?? 50);
  const [aiModes, setAiModes] = useState({ reach: false, impact: false, confidence: false, effort: false });
  const [aiResults, setAiResults] = useState({});
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
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: pendingFeatureId, name: name.trim(), description: desc.trim(), scoringBasis, reach: r, impact: i, confidence: c, effort: e, owner: owner.trim() || null, theme: theme.trim() || null, status: status || null });
    // Resolve any pending AI score events with the final values
    const hasAiScores = Object.values(aiModes).some(v => v);
    if (hasAiScores && onResolveScores) {
      onResolveScores(pendingFeatureId, { reach: r, impact: i, confidence: c, effort: e });
    }
  };

  const setters = { reach: setR, impact: setI, confidence: setC, effort: setE };
  const availableSignals = workspaceSignals(signals, workspaceId);
  const addClaim = claim => setScoringBasis(prev => prev.claims.length < MAX_CLAIMS ? { ...prev, claims: [...prev.claims, claim] } : prev);
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
    onScoreEvent?.([{ feature_id: pendingFeatureId, feature_name: name.trim(), dimension: dim, ai_score: value }]);
  };

  const toggleDimension = dim => {
    if (!name.trim() || aiLoading) return;
    const enabled = !aiModes[dim];
    setAiModes(prev => ({ ...prev, [dim]: enabled }));
    if (enabled) requestAiScores([dim]);
  };

  const suggestAll = useCallback(() => {
    if (!name.trim()) return;
    const dims = ["reach", "impact", "confidence", "effort"];
    setAiModes({ reach: true, impact: true, confidence: true, effort: true });
    requestAiScores(dims);
  }, [name, requestAiScores]);

  const inputStyle = { padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: "none", fontFamily: "var(--body)" };

  return (
    <div role="form" aria-label={editFeature ? "Edit candidate" : "New candidate"} style={{ padding: 20, border: `1px solid ${C.borderActive}`, borderRadius: 12, background: C.surface, animation: "slideUp 0.25s ease" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input value={name} onChange={ev => setName(ev.target.value)} placeholder="Candidate name" aria-label="Candidate name" style={{ ...inputStyle, fontSize: 14 }} onFocus={ev => ev.target.style.borderColor = C.accent} onBlur={ev => ev.target.style.borderColor = C.border} />
        <textarea value={desc} onChange={ev => setDesc(ev.target.value)} placeholder="Brief description (optional)" aria-label="Candidate description" rows={2} style={{ ...inputStyle, fontSize: 13, resize: "vertical" }} onFocus={ev => ev.target.style.borderColor = C.accent} onBlur={ev => ev.target.style.borderColor = C.border} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label htmlFor="form-owner" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>OWNER</label>
            <input id="form-owner" value={owner} onChange={ev => setOwner(ev.target.value)} placeholder="Owner" style={{ ...inputStyle, fontSize: 11, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label htmlFor="form-theme" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>THEME</label>
            <input id="form-theme" value={theme} onChange={ev => setTheme(ev.target.value)} placeholder="Theme" style={{ ...inputStyle, fontSize: 11, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label htmlFor="form-status" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>STATUS</label>
            <select id="form-status" value={status} onChange={ev => setStatus(ev.target.value)} style={{ ...inputStyle, fontSize: 11, width: "100%", boxSizing: "border-box" }}>
              <option value="">Backlog</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
        {onProductContextChange && <ProductContext context={productContext} onChange={onProductContextChange} />}
        <CandidateScoringBasis basis={scoringBasis} onChange={setScoringBasis} signals={availableSignals} />
        <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>AI context: {6 - context.missing.length}/6 brief fields, {context.evidence.length} linked signals. Missing: {context.missing.map(k => BRIEF_FIELDS[k]).join(", ") || "no brief fields"}. Set the audience, period and anchors under Strategy Brief → Shared scoring basis. You can proceed with limited context or score manually. Running AI sends the brief, shared anchors, candidate answers, competing options, linked signals, and related decisions to Tarazu and Anthropic.</p>
        <button onClick={suggestAll} disabled={!name.trim() || aiLoading}
          style={{ padding: "7px 14px", border: `1px solid ${C.purple}30`, borderRadius: 6, background: C.purpleDim, color: C.purple, fontSize: 11, fontWeight: 600, cursor: !name.trim() || aiLoading ? "not-allowed" : "pointer", fontFamily: "var(--mono)", opacity: !name.trim() || aiLoading ? 0.4 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onMouseEnter={ev => { if (name.trim() && !aiLoading) ev.target.style.background = `${C.purple}20`; }}
          onMouseLeave={ev => ev.target.style.background = C.purpleDim}>
          {aiLoading ? "Suggesting..." : "✦ AI Suggest Scores"}
        </button>
        {aiLoading && <p role="status" style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>Reviewing the supplied context. This can take a minute, or longer if the response needs validation.</p>}
        {stale && <p role="status">Context changed. Previous suggestions are stale; request new suggestions before accepting.</p>}
        <AIContextDetails context={usedContext} />
        {["reach", "impact", "confidence", "effort"].filter(dim => aiResults[dim]).map(dim => {
          const result = aiResults[dim];
          return <details key={dim} style={{ fontSize: 12, lineHeight: 1.6 }}>
            <summary>{dim}: {result.score == null ? "Insufficient information" : `Suggested ${result.score}/100`}</summary>
            <p>{result.justification}</p>
            <p>References: {result.evidence?.map(ref => referenceLabel(ref, usedContext)).join("; ") || "No supplied evidence cited"}</p>
            <strong>AI assumptions (unverified)</strong>
            {result.assumptions?.length ? <ul>{result.assumptions.map((assumption, index) => <li key={index}>{assumption} <button style={{ ...inputStyle, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }} disabled={scoringBasis.claims.length >= MAX_CLAIMS || scoringBasis.claims.some(c => c.origin === 'ai' && c.text === assumption)} onClick={() => addClaim(newScoringClaim(dim, assumption, 'ai_assumption', { origin: 'ai' }))}>Add as AI assumption</button></li>)}</ul> : <p>None stated</p>}
            {result.claimReviews?.length > 0 && <section aria-label={`${dim} claim review`}><strong>AI review of supplied claims</strong><p>These are AI judgments about source support; provenance labels stay as recorded.</p><ul>{result.claimReviews.map(review => {
              const claim = usedContext?.candidate?.scoringBasis?.claims?.find(c => c.id === review.claimId);
              return <li key={review.claimId}><strong>{CLAIM_KINDS[claim?.kind] || 'Unclassified'} · {claim?.text || 'Claim unavailable'}</strong><p>{({ supported: 'Appears supported', conflicting: 'Conflicting evidence', source_missing: 'Source missing or unusable', assumption: 'Unverified assumption', needs_review: 'Needs review' })[review.status]}: {review.explanation}</p><p>{review.evidence.map(ref => referenceLabel(ref, usedContext)).join('; ') || 'No Signal cited'}</p></li>;
            })}</ul></section>}
            <p>Gaps: {result.gaps?.join("; ") || "None stated"}</p>
            <p>Next: {result.nextAction}</p>
            <ScoringFollowUp key={`${dim}:${result.followUp?.question}`} followUp={result.followUp} dimension={dim} claims={scoringBasis.claims} signals={availableSignals} onAdd={addClaim} />
            {Number.isInteger(result.score) && <button style={{ ...inputStyle, cursor: 'pointer', opacity: stale ? 0.5 : 1 }} disabled={stale} onClick={() => acceptSuggestion(dim)}>Accept {dim} suggestion</button>}
          </details>;
        })}
        {aiError && <p style={{ fontSize: 10, color: C.danger, margin: 0, fontFamily: "var(--mono)" }}>{aiError}</p>}
        <details style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>How to interpret these scores</summary>
          <p>These are relative 1–100 estimates. Reach describes the size of the affected audience, impact the benefit per user, confidence the strength of your evidence, and effort the work required. Agree on the same audience, time horizon, and scale anchors when comparing candidates; a shared scale alone does not align different teams’ estimates.</p>
          <p>Use the shared scoring basis and candidate answers to record the audience, timeframe, delivery scope and assumptions. Capture supporting or conflicting evidence in Signals. The initial 50s are placeholders to review. AI suggestions are editable estimates; inspect their justification before accepting them.</p>
        </details>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Slider label="Reach" value={r} onChange={setR} color={C.reach} icon="📡" anchors={SCORING_ANCHORS.reach}
            aiMode={aiModes.reach} aiScore={aiResults.reach?.score} aiJustification={aiResults.reach?.justification}
            aiLoading={aiLoading && aiModes.reach && !aiResults.reach} onToggleAi={() => toggleDimension("reach")} />
          <Slider label="Impact" value={i} onChange={setI} color={C.impact} icon="💥" anchors={SCORING_ANCHORS.impact}
            aiMode={aiModes.impact} aiScore={aiResults.impact?.score} aiJustification={aiResults.impact?.justification}
            aiLoading={aiLoading && aiModes.impact && !aiResults.impact} onToggleAi={() => toggleDimension("impact")} />
          <Slider label="Confidence" value={c} onChange={setC} color={C.confidence} icon="🎯" anchors={SCORING_ANCHORS.confidence}
            aiMode={aiModes.confidence} aiScore={aiResults.confidence?.score} aiJustification={aiResults.confidence?.justification}
            aiLoading={aiLoading && aiModes.confidence && !aiResults.confidence} onToggleAi={() => toggleDimension("confidence")} />
          <Slider label="Effort" value={e} onChange={setE} color={C.danger} icon="⏱️" anchors={SCORING_ANCHORS.effort}
            aiMode={aiModes.effort} aiScore={aiResults.effort?.score} aiJustification={aiResults.effort?.justification}
            aiLoading={aiLoading && aiModes.effort && !aiResults.effort} onToggleAi={() => toggleDimension("effort")} />
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: C.accentGlow, border: `1px solid ${C.accent}20`, textAlign: "center" }}>
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "var(--mono)" }}>RELATIVE RICE SCORE</span>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.accent, margin: "4px 0 0", fontFamily: "var(--mono)" }}>{preview.toLocaleString()}</p>
          {previewTotal > 1 && (
            <p style={{ fontSize: 11, color: C.textMuted, margin: "2px 0 0", fontFamily: "var(--mono)" }}>#{previewRank} of {previewTotal}</p>
          )}
          <p style={{ fontSize: 12, color: C.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>Reach × Impact × Confidence ÷ Effort. A ranking aid based on estimates, not measured return or a probability. Use evidence and judgment alongside the number.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={!name.trim()} style={{ flex: 1, padding: "10px 16px", border: "none", borderRadius: 8, background: name.trim() ? C.accent : C.border, color: name.trim() ? C.bg : C.textDim, fontSize: 13, fontWeight: 700, cursor: name.trim() ? "pointer" : "not-allowed", fontFamily: "var(--mono)" }}>{editFeature ? "Save Changes" : "Add Candidate"}</button>
          <button onClick={onCancel} style={{ padding: "10px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "var(--mono)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
