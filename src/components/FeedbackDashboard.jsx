import { useState, useEffect } from "react";
import { useC } from "../ThemeProvider";

const MIN_EVENTS = 3;

const DimBar = ({ label, rate, avgDrift, total, color }) => {
  const C = useC();
  return (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
    <span style={{ width: 80, fontSize: 10, fontWeight: 600, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{label}</span>
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
      <div style={{ width: `${rate}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.5s ease" }} />
    </div>
    <span style={{ width: 36, fontSize: 10, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>{rate}%</span>
    <span style={{ width: 50, fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
      {avgDrift >= 0 ? "+" : ""}{avgDrift} avg
    </span>
  </div>
  );
};

export const FeedbackDashboard = ({ summary }) => {
  const C = useC();
  const trendLabel = (trend) => {
    if (trend === "improving") return { text: "AI is improving", color: C.accent };
    if (trend === "declining") return { text: "Accuracy declining", color: C.danger };
    if (trend === "stable") return { text: "Well calibrated", color: C.blue };
    return { text: "Collecting data...", color: C.textDim };
  };
  const [expanded, setExpanded] = useState(false);

  if (!summary || summary.scores.total < MIN_EVENTS) return null;

  const { scores, analyses, trend } = summary;
  const t = trendLabel(trend);

  const dimColors = { reach: C.reach, impact: C.impact, confidence: C.purple, effort: C.danger };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: "hidden" }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>📊 AI CALIBRATION</span>
        <span style={{ fontSize: 10, color: t.color, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>{t.text}</span>
        <span style={{ fontSize: 10, color: C.textDim, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Score Accuracy */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>SCORE ACCEPTANCE RATE</span>
              <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{scores.total} scores</span>
            </div>
            {["reach", "impact", "confidence", "effort"].map(dim => {
              const d = scores.byDimension[dim];
              if (!d || d.total === 0) return null;
              return <DimBar key={dim} label={dim} rate={d.rate} avgDrift={d.avgDrift} total={d.total} color={dimColors[dim]} />;
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>Overall</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
                <div style={{ width: `${scores.rate}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.blue})` }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{scores.rate}%</span>
            </div>
          </div>

          {/* Analysis Quality */}
          {analyses.total > 0 && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>ANALYSIS QUALITY</span>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>👍</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.accent, fontFamily: "'JetBrains Mono', monospace" }}>{analyses.thumbsUp}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>👎</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.danger, fontFamily: "'JetBrains Mono', monospace" }}>{analyses.thumbsDown}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                  <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{analyses.total} analyses</span>
                  {analyses.errors > 0 && <span style={{ fontSize: 10, color: C.danger, fontFamily: "'JetBrains Mono', monospace" }}>{analyses.errors} errors</span>}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.accent, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{scores.total}</p>
              <p style={{ fontSize: 9, color: C.textDim, margin: "2px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>SCORES</p>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.blue, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{analyses.total}</p>
              <p style={{ fontSize: 9, color: C.textDim, margin: "2px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>ANALYSES</p>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.purple, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{scores.rate}%</p>
              <p style={{ fontSize: 9, color: C.textDim, margin: "2px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>ACCURACY</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
