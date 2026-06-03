import { useState, useMemo, useCallback } from "react";
import { useC } from "../ThemeProvider";
import { rice } from "../utils";
import { Slider } from "./Slider";

export const Form = ({ onAdd, onCancel, editFeature, productContext, onScoreEvent, onResolveScores, feedbackContext }) => {
  const C = useC();
  const [name, setName] = useState(editFeature?.name || ""); const [desc, setDesc] = useState(editFeature?.description || "");
  const [owner, setOwner] = useState(editFeature?.owner || ""); const [theme, setTheme] = useState(editFeature?.theme || ""); const [status, setStatus] = useState(editFeature?.status || "");
  const [r, setR] = useState(editFeature?.reach ?? 50); const [i, setI] = useState(editFeature?.impact ?? 50); const [c, setC] = useState(editFeature?.confidence ?? 50); const [e, setE] = useState(editFeature?.effort ?? 50);
  const [aiModes, setAiModes] = useState({ reach: false, impact: false, confidence: false, effort: false });
  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const pendingFeatureId = useMemo(() => editFeature?.id || `f-${Date.now()}`, [editFeature]);
  const preview = useMemo(() => rice({ reach: r, impact: i, confidence: c, effort: e }), [r, i, c, e]);
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: pendingFeatureId, name: name.trim(), description: desc.trim(), reach: r, impact: i, confidence: c, effort: e, owner: owner.trim() || null, theme: theme.trim() || null, status: status || null });
    // Resolve any pending AI score events with the final values
    const hasAiScores = Object.values(aiModes).some(v => v);
    if (hasAiScores && onResolveScores) {
      onResolveScores(pendingFeatureId, { reach: r, impact: i, confidence: c, effort: e });
    }
  };

  const setters = { reach: setR, impact: setI, confidence: setC, effort: setE };

  const requestAiScores = useCallback(async (dimensions) => {
    if (!name.trim() || dimensions.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/suggest-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureName: name.trim(), featureDescription: desc.trim(), productContext, dimensions, feedbackContext: feedbackContext || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API returned ${res.status}`);
      }
      const data = await res.json();
      setAiResults(prev => ({ ...prev, ...data }));
      for (const dim of dimensions) {
        if (data[dim]?.score) setters[dim](data[dim].score);
      }
      // Record score events for the feedback loop
      if (onScoreEvent) {
        const events = dimensions
          .filter(dim => data[dim]?.score)
          .map(dim => ({ feature_id: pendingFeatureId, feature_name: name.trim(), dimension: dim, ai_score: data[dim].score }));
        if (events.length > 0) onScoreEvent(events);
      }
    } catch (err) {
      setAiError(err.message || "AI scoring failed");
      setAiModes(prev => {
        const next = { ...prev };
        for (const dim of dimensions) next[dim] = false;
        return next;
      });
    }
    setAiLoading(false);
  }, [name, desc, productContext, feedbackContext, onScoreEvent, pendingFeatureId]);

  const toggleDimension = useCallback((dim) => {
    if (!name.trim()) return;
    setAiModes(prev => {
      const next = { ...prev, [dim]: !prev[dim] };
      if (next[dim]) {
        // Toggling to AI — request score
        requestAiScores([dim]);
      }
      return next;
    });
  }, [name, requestAiScores]);

  const suggestAll = useCallback(() => {
    if (!name.trim()) return;
    const dims = ["reach", "impact", "confidence", "effort"];
    setAiModes({ reach: true, impact: true, confidence: true, effort: true });
    requestAiScores(dims);
  }, [name, requestAiScores]);

  const inputStyle = { padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: "none", fontFamily: "var(--body)" };

  return (
    <div style={{ padding: 20, border: `1px solid ${C.borderActive}`, borderRadius: 12, background: C.surface, animation: "slideUp 0.25s ease" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input value={name} onChange={ev => setName(ev.target.value)} placeholder="Candidate name" aria-label="Candidate name" style={{ ...inputStyle, fontSize: 14 }} onFocus={ev => ev.target.style.borderColor = C.accent} onBlur={ev => ev.target.style.borderColor = C.border} />
        <textarea value={desc} onChange={ev => setDesc(ev.target.value)} placeholder="Brief description (optional)" aria-label="Candidate description" rows={2} style={{ ...inputStyle, fontSize: 13, resize: "vertical" }} onFocus={ev => ev.target.style.borderColor = C.accent} onBlur={ev => ev.target.style.borderColor = C.border} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label htmlFor="form-owner" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, display: "block" }}>OWNER</label>
            <input id="form-owner" value={owner} onChange={ev => setOwner(ev.target.value)} placeholder="Owner" style={{ ...inputStyle, fontSize: 11, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label htmlFor="form-theme" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, display: "block" }}>THEME</label>
            <input id="form-theme" value={theme} onChange={ev => setTheme(ev.target.value)} placeholder="Theme" style={{ ...inputStyle, fontSize: 11, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label htmlFor="form-status" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, display: "block" }}>STATUS</label>
            <select id="form-status" value={status} onChange={ev => setStatus(ev.target.value)} style={{ ...inputStyle, fontSize: 11, width: "100%", boxSizing: "border-box" }}>
              <option value="">Backlog</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
        <button onClick={suggestAll} disabled={!name.trim() || aiLoading}
          style={{ padding: "7px 14px", border: `1px solid ${C.purple}30`, borderRadius: 6, background: C.purpleDim, color: C.purple, fontSize: 11, fontWeight: 600, cursor: !name.trim() || aiLoading ? "not-allowed" : "pointer", fontFamily: "'JetBrains Mono', monospace", opacity: !name.trim() || aiLoading ? 0.4 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onMouseEnter={ev => { if (name.trim() && !aiLoading) ev.target.style.background = `${C.purple}20`; }}
          onMouseLeave={ev => ev.target.style.background = C.purpleDim}>
          {aiLoading ? "Suggesting..." : "✦ AI Suggest Scores"}
        </button>
        {aiError && <p style={{ fontSize: 10, color: C.danger, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{aiError}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Slider label="Reach" value={r} onChange={setR} color={C.reach} icon="📡"
            aiMode={aiModes.reach} aiScore={aiResults.reach?.score} aiJustification={aiResults.reach?.justification}
            aiLoading={aiLoading && aiModes.reach && !aiResults.reach} onToggleAi={() => toggleDimension("reach")} />
          <Slider label="Impact" value={i} onChange={setI} color={C.impact} icon="💥"
            aiMode={aiModes.impact} aiScore={aiResults.impact?.score} aiJustification={aiResults.impact?.justification}
            aiLoading={aiLoading && aiModes.impact && !aiResults.impact} onToggleAi={() => toggleDimension("impact")} />
          <Slider label="Confidence" value={c} onChange={setC} color={C.purple} icon="🎯"
            aiMode={aiModes.confidence} aiScore={aiResults.confidence?.score} aiJustification={aiResults.confidence?.justification}
            aiLoading={aiLoading && aiModes.confidence && !aiResults.confidence} onToggleAi={() => toggleDimension("confidence")} />
          <Slider label="Effort" value={e} onChange={setE} color={C.danger} icon="⏱️"
            aiMode={aiModes.effort} aiScore={aiResults.effort?.score} aiJustification={aiResults.effort?.justification}
            aiLoading={aiLoading && aiModes.effort && !aiResults.effort} onToggleAi={() => toggleDimension("effort")} />
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: C.accentGlow, border: `1px solid ${C.accent}20`, textAlign: "center" }}>
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>RICE SCORE</span>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.accent, margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>{preview.toLocaleString()}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={!name.trim()} style={{ flex: 1, padding: "10px 16px", border: "none", borderRadius: 8, background: name.trim() ? C.accent : C.border, color: name.trim() ? C.bg : C.textDim, fontSize: 13, fontWeight: 700, cursor: name.trim() ? "pointer" : "not-allowed", fontFamily: "'JetBrains Mono', monospace" }}>{editFeature ? "Save Changes" : "Add Candidate"}</button>
          <button onClick={onCancel} style={{ padding: "10px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
