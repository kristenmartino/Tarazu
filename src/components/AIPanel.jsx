import { localToday } from "../dateOnly";
import { buildScoringContext } from "../../lib/scoring-context";
import { AIContextDetails } from "./AIContextDetails";
import { useState, useRef, useEffect } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";

const demoAnalysis = (scored) => {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const quickWin = sorted.find(f => f.effort <= 40 && f.impact >= 40) || sorted[1];
  const risky = sorted.find(f => f.confidence <= 60) || lowest;

  return {
    summary: `This backlog contains ${sorted.length} candidates with RICE scores ranging from ${lowest.score.toLocaleString()} to ${top.score.toLocaleString()}. This demo uses score arithmetic only; it does not assess strategy or customer evidence.`,
    topPick: { name: top.name, reason: `Highest RICE score (${top.score.toLocaleString()}) based on your estimates. This heuristic does not establish customer value or strategic fit.`, confidence: "low" },
    quickWin: { name: quickWin.name, reason: `Relatively low effort (${quickWin.effort}/100) with meaningful impact — a possible quick win under these assumptions, requiring validation.`, confidence: "low" },
    riskFlag: { name: risky.name, reason: `Confidence score of ${risky.confidence}/100 suggests insufficient validation. Consider running user research or a prototype test before committing engineering resources.`, confidence: "low" },
    sprintPlan: sorted.slice(0, Math.min(3, sorted.length)).map(f => f.name),
    insight: `The top-ranked candidates share a pattern of high reach but varying confidence. Investing in lightweight validation (surveys, prototypes) for lower-confidence items could significantly improve prioritization accuracy before committing to full builds.`,
  };
};

export const AIPanel = ({ scored, signals = [], decisions = [], workspaceId, productContext, onAnalysisEvent, onAnalysisFeedback, feedbackContext, onSaveDecisionDraft, onScreenChange }) => {
  const C = useC();
  const CONF_STYLES = {
    high: { color: C.accent, label: "HIGH" },    // jade / success
    medium: { color: C.warn, label: "MEDIUM" },  // gold / caution
    low: { color: C.danger, label: "LOW" },      // coral / risk
  };
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [mode, setMode] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [thumbs, setThumbs] = useState(null);

  const context = buildScoringContext({ features: scored, productContext, signals, decisions, workspaceId });
  const signature = JSON.stringify(context);
  const current = useRef(signature); current.current = signature;
  const sequence = useRef(0);
  const [resultSignature, setResultSignature] = useState(null);
  useEffect(() => () => { sequence.current += 1; }, []);
  const runAnalysis = async () => {
    const requestId = ++sequence.current;
    const requestedSignature = signature;
    setLoading(true); setError(null); setAuthRequired(false); setThumbs(null); setEventId(null);
    const startTime = Date.now();
    try {
      const sorted = [...scored].sort((a, b) => b.score - a.score);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: sorted, productContext, signals, decisions, workspaceId }),
      });
      const elapsed = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        if (requestId !== sequence.current || current.current !== requestedSignature) { if (requestId === sequence.current) setLoading(false); return; }
        setResultSignature(requestedSignature);
        setAnalysis(data);
        setMode("live");
        if (onAnalysisEvent) {
          const id = await onAnalysisEvent({ feature_count: sorted.length, mode: "live", response_ms: elapsed, top_pick: data.topPick?.name, quick_win: data.quickWin?.name, risk_flag: data.riskFlag?.name, error: false });
          setEventId(id);
        }
      } else if (res.status === 401) {
        // Deliberately does NOT fall through to the demo fallback below.
        // Handing an anonymous visitor a locally-generated recommendation
        // removes every reason to sign in, which is the entire point of
        // gating this endpoint. Prompt instead.
        setAuthRequired(true);
        setLoading(false);
        return;
      } else {
        throw new Error("API unavailable");
      }
    } catch {
      if (requestId !== sequence.current || current.current !== requestedSignature) { if (requestId === sequence.current) setLoading(false); return; }
      setResultSignature(requestedSignature);
      const elapsed = Date.now() - startTime;
      const demoResult = demoAnalysis(scored);
      setAnalysis(demoResult);
      setMode("demo");
      if (onAnalysisEvent) {
        const id = await onAnalysisEvent({ feature_count: scored.length, mode: "demo", response_ms: elapsed, top_pick: demoResult.topPick?.name, quick_win: demoResult.quickWin?.name, risk_flag: demoResult.riskFlag?.name, error: false });
        setEventId(id);
      }
    }
    if (requestId === sequence.current) setLoading(false);
  };

  const handleThumbs = (isUp) => {
    setThumbs(isUp);
    if (onAnalysisFeedback && eventId) {
      onAnalysisFeedback(eventId, isUp);
    }
  };

  if (authRequired) {
    return (
      <div style={{ padding: 16, border: `1px solid ${C.blue}40`, borderRadius: 10, background: C.blueDim }}>
        <p style={{ fontSize: 12, color: C.blue, margin: 0, lineHeight: 1.6 }}>
          Sign in to run the AI advisor. RICE scoring, the tradeoff map, and CSV
          export stay free and need no account.
        </p>
        <a href="/sign-in"
          style={{ display: "inline-block", marginTop: 10, padding: "6px 14px", border: `1px solid ${C.blue}40`, borderRadius: 6, background: "transparent", color: C.blue, fontSize: 11, textDecoration: "none", fontFamily: "var(--mono)" }}>
          Sign in
        </a>
      </div>
    );
  }

  if (!analysis && !loading) {
    return (
      <button onClick={runAnalysis} disabled={scored.length < 2}
        style={{ width: "100%", padding: "14px 20px", border: `1px solid ${C.blue}40`, borderRadius: 10, background: C.blueDim, color: C.blue, fontSize: 13, fontWeight: 600, cursor: scored.length < 2 ? "not-allowed" : "pointer", fontFamily: "var(--mono)", letterSpacing: "0.03em", transition: "all 0.2s", opacity: scored.length < 2 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        onMouseEnter={e => { if (scored.length >= 2) e.target.style.background = `${C.blue}30`; }}
        onMouseLeave={e => e.target.style.background = C.blueDim}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/><line x1="12" y1="6" x2="12" y2="20" strokeLinecap="round"/><circle cx="5" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="19" cy="6" r="2" fill="currentColor" stroke="none"/></svg>
        Generate Recommendation
      </button>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12, fontFamily: "var(--mono)" }}>Generating recommendation...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, border: `1px solid ${C.danger}30`, borderRadius: 10, background: C.dangerDim }}>
        <p style={{ fontSize: 12, color: C.danger, margin: 0 }}>{error}</p>
        <button onClick={runAnalysis} style={{ marginTop: 10, padding: "6px 14px", border: `1px solid ${C.danger}40`, borderRadius: 6, background: "transparent", color: C.danger, fontSize: 11, cursor: "pointer", fontFamily: "var(--mono)" }}>Retry</button>
      </div>
    );
  }

  const cards = [
    { icon: "🎯", label: "RECOMMENDED NEXT MOVE", value: analysis.topPick?.name, detail: analysis.topPick?.reason, color: C.accent, confidence: analysis.topPick?.confidence },
    { icon: "⚡", label: "POSSIBLE QUICK WIN", value: analysis.quickWin?.name, detail: analysis.quickWin?.reason, color: C.warn, confidence: analysis.quickWin?.confidence },
    { icon: "⚠️", label: "PRIMARY RISK", value: analysis.riskFlag?.name, detail: analysis.riskFlag?.reason, color: C.danger, confidence: analysis.riskFlag?.confidence },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {resultSignature !== signature && <p role="status">Context changed. This recommendation is stale; regenerate before using it.</p>}
      <AIContextDetails context={analysis.context} />
      {mode === "demo" && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: C.purpleDim, border: `1px solid ${C.purple}30` }}>
          <span style={{ fontSize: 10, color: C.purple, fontFamily: "var(--mono)" }}>DEMO MODE — Recommendation generated locally. Configure API for live analysis.</span>
        </div>
      )}
      <div style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface }}>
        <p style={{ fontSize: 12, color: C.text, lineHeight: 1.6, margin: 0 }}>{analysis.summary}</p>
      </div>
      {cards.map((c, i) => {
        const conf = c.confidence && CONF_STYLES[c.confidence];
        return (
          <div key={i} style={{ padding: 14, border: `1px solid ${c.color}20`, borderRadius: 10, background: `${c.color}08`, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>{c.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: c.color, letterSpacing: "0.1em", fontFamily: "var(--mono)" }}>{c.label}</span>
                {conf && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: conf.color, display: "inline-block" }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: conf.color, fontFamily: "var(--mono)", letterSpacing: "0.05em" }}>{conf.label}</span>
                </span>}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "3px 0 2px" }}>{c.value}</p>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{c.detail}</p>
            </div>
          </div>
        );
      })}
      {analysis.sprintPlan && (
        <div style={{ padding: 14, border: `1px solid ${C.blue}20`, borderRadius: 10, background: `${C.blue}08` }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, letterSpacing: "0.1em", fontFamily: "var(--mono)" }}>📋 SUGGESTED SEQUENCE</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {analysis.sprintPlan.map((name, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.blue, background: C.blueDim, fontFamily: "var(--mono)" }}>{i + 1}</span>
                <span style={{ fontSize: 12, color: C.text }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {analysis.insight && (
        <div style={{ padding: 14, border: `1px solid ${C.purple}20`, borderRadius: 10, background: `${C.purple}08` }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: "0.1em", fontFamily: "var(--mono)" }}>💡 STRATEGIC READOUT</span>
          <p style={{ fontSize: 12, color: C.text, margin: "6px 0 0", lineHeight: 1.6 }}>{analysis.insight}</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => { setAnalysis(null); setThumbs(null); setEventId(null); }} style={{ padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "var(--mono)" }}>↻ Regenerate</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "var(--mono)", marginRight: 4 }}>Was this recommendation useful?</span>
          <button onClick={() => handleThumbs(true)}
            style={{ padding: "4px 8px", border: `1px solid ${thumbs === true ? C.accent : C.border}`, borderRadius: 6, background: thumbs === true ? C.accentGlow : "transparent", color: thumbs === true ? C.accent : C.textMuted, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
            👍
          </button>
          <button onClick={() => handleThumbs(false)}
            style={{ padding: "4px 8px", border: `1px solid ${thumbs === false ? C.danger : C.border}`, borderRadius: 6, background: thumbs === false ? C.dangerDim : "transparent", color: thumbs === false ? C.danger : C.textMuted, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
            👎
          </button>
        </div>
      </div>
      {onSaveDecisionDraft && (
        <button disabled={resultSignature !== signature} onClick={async () => {
          if (resultSignature !== current.current) return;
          const draft = {
            title: `Decision: ${analysis.topPick?.name || "Untitled"}`,
            chosen_candidate_name: analysis.topPick?.name || "",
            summary_rationale: analysis.summary || "",
            final_rationale: analysis.topPick?.reason || "",
            framework_used: "RICE",
            tradeoffs_considered: `Quick win: ${analysis.quickWin?.name || "N/A"}. Risk: ${analysis.riskFlag?.name || "N/A"} — ${analysis.riskFlag?.reason || ""}`,
            risks_accepted: analysis.riskFlag?.reason || "",
            expected_outcome: analysis.insight || "",
            status: "draft",
            decision_date: localToday(),
          };
          // Find the candidate id if possible
          const topCandidate = scored.find(f => f.name === analysis.topPick?.name);
          if (topCandidate) {
            draft.chosen_candidate_id = topCandidate.id;
          }
          await onSaveDecisionDraft(draft);
          if (onScreenChange) onScreenChange("decisions");
        }} style={{ width: "100%", padding: "10px 16px", border: `1px solid ${C.accent}30`, borderRadius: 8, background: C.accentGlow, color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--mono)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onMouseEnter={e => e.target.style.background = C.accentDim}
          onMouseLeave={e => e.target.style.background = C.accentGlow}>
          ⚖ Save as Decision Draft
        </button>
      )}
      <div style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
        {[
          { label: "MODE", value: mode === "live" ? "Live" : "Demo" },
          { label: "CANDIDATES", value: scored.length },
          { label: "FRAMEWORK", value: "RICE" },
          { label: "CONTEXT", value: productContext?.productSummary ? "Provided" : "Not provided" },
          { label: "CALIBRATION", value: feedbackContext?.scoreCalibration ? `Active (${feedbackContext.scoreCalibration.split("\n").length} events)` : "None" },
        ].map(m => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>{m.label}</span>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "var(--mono)" }}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
