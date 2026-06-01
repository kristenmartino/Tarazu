import { useMemo } from "react";
import { C } from "../theme";
import { getTier } from "../utils";
import { Pill } from "./Pill";

const StatCard = ({ label, value, color }) => (
  <div style={{ flex: 1, minWidth: 100, padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface }}>
    <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
    <p style={{ fontSize: 22, fontWeight: 800, color: color || C.text, margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
  </div>
);

const ShortcutButton = ({ label, icon, color, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, minWidth: 120, padding: "14px 16px", border: `1px solid ${color}30`, borderRadius: 10,
    background: `${color}08`, color, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s",
    display: "flex", alignItems: "center", gap: 8,
  }}
    onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
    onMouseLeave={e => e.currentTarget.style.background = `${color}08`}>
    {icon}
    {label}
  </button>
);

export const WorkspaceHome = ({ scored, decisions, signals, activeWs, onScreenChange }) => {
  const avgScore = useMemo(() => {
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((s, f) => s + f.score, 0) / scored.length);
  }, [scored]);

  const avgConfidence = useMemo(() => {
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((s, f) => s + f.confidence, 0) / scored.length);
  }, [scored]);

  const topCandidate = useMemo(() => {
    if (scored.length === 0) return null;
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    return sorted[0];
  }, [scored]);

  const needsValidation = useMemo(() =>
    scored.filter(f => f.confidence < 50).sort((a, b) => a.confidence - b.confidence).slice(0, 3),
  [scored]);

  const recentDecisions = useMemo(() =>
    [...decisions].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 3),
  [decisions]);

  const topTier = topCandidate ? getTier(topCandidate) : null;

  const statusColor = (s) => {
    switch (s) {
      case "approved": return C.accent;
      case "rejected": return C.danger;
      case "reviewing": return C.blue;
      default: return C.textDim;
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{activeWs?.name || "Workspace"}</h2>
        <Pill color={C.textMuted} dimColor={C.border} small>HOME</Pill>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Stats strip */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="CANDIDATES" value={scored.length} color={C.accent} />
          <StatCard label="AVG RICE" value={avgScore.toLocaleString()} color={C.blue} />
          <StatCard label="AVG CONFIDENCE" value={avgConfidence} color={avgConfidence >= 70 ? C.accent : avgConfidence >= 50 ? C.blue : C.warn} />
          <StatCard label="DECISIONS" value={decisions.length} color={C.purple} />
          <StatCard label="SIGNALS" value={signals.length} color={C.blue} />
        </div>

        {/* Top candidate */}
        {topCandidate && (
          <div style={{ padding: 16, border: `1px solid ${topTier.color}20`, borderRadius: 10, background: `${topTier.color}08` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>TOP CANDIDATE</span>
              <Pill color={topTier.color} dimColor={topTier.color + "20"} small>{topTier.label}</Pill>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>{topCandidate.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: topTier.color, fontFamily: "'JetBrains Mono', monospace" }}>{topCandidate.score.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>R:{topCandidate.reach} I:{topCandidate.impact} C:{topCandidate.confidence} E:{topCandidate.effort}</span>
            </div>
          </div>
        )}

        {/* Needs validation */}
        {needsValidation.length > 0 && (
          <div style={{ padding: 16, border: `1px solid color-mix(in srgb, var(--warning) 13%, transparent)`, borderRadius: 10, background: "color-mix(in srgb, var(--warning) 3%, transparent)" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.warn, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>NEEDS VALIDATION</span>
            <p style={{ fontSize: 10, color: C.textMuted, margin: "4px 0 8px" }}>Candidates with confidence below 50 — consider gathering more evidence.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {needsValidation.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.warn, fontFamily: "'JetBrains Mono', monospace" }}>C:{f.confidence}</span>
                </div>
              ))}
            </div>
            {scored.filter(f => f.confidence < 50).length > 3 && (
              <button onClick={() => onScreenChange("priorities")} style={{ marginTop: 8, padding: "4px 10px", border: `1px solid color-mix(in srgb, var(--warning) 19%, transparent)`, borderRadius: 6, background: "transparent", color: C.warn, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
                View all {scored.filter(f => f.confidence < 50).length} candidates
              </button>
            )}
          </div>
        )}

        {/* Recent decisions */}
        {recentDecisions.length > 0 && (
          <div style={{ padding: 16, border: `1px solid ${C.purple}20`, borderRadius: 10, background: `${C.purple}08` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>RECENT DECISIONS</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {recentDecisions.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.title}</span>
                  <Pill color={statusColor(d.status)} dimColor={statusColor(d.status) + "20"} small>{(d.status || "draft").toUpperCase()}</Pill>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ShortcutButton label="Priorities" color={C.accent} onClick={() => onScreenChange("priorities")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          } />
          <ShortcutButton label="Signals" color={C.blue} onClick={() => onScreenChange("signals")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20h4V10H4z"/><path d="M10 20h4V4h-4z"/><path d="M16 20h4v-8h-4z"/></svg>
          } />
          <ShortcutButton label="Decisions" color={C.purple} onClick={() => onScreenChange("decisions")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>
          } />
          <ShortcutButton label="Scenarios" color={C.warn} onClick={() => onScreenChange("scenarios")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg>
          } />
        </div>
      </div>
    </div>
  );
};
