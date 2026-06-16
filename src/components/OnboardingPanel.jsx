import { useC } from "../ThemeProvider";

export const OnboardingPanel = ({ onAddCandidate, onLoadSamples }) => {
  const C = useC();
  const steps = [
    {
      num: 1,
      title: "Add your first candidate",
      desc: "Each candidate is scored with RICE: Reach, Impact, Confidence, and Effort. The framework ranks them automatically.",
      color: C.accent,
      action: "add",
      actionLabel: "+ Add Candidate",
    },
    {
      num: 2,
      title: "Or start with examples",
      desc: "Load a sample backlog to explore how scoring, ranking, and the tradeoff map work together.",
      color: C.blue,
      action: "samples",
      actionLabel: "Load Example Backlog",
    },
    {
      num: 3,
      title: "Then explore the toolkit",
      desc: "The tradeoff map sits right beside your list for visual analysis, use the AI Decision Advisor for recommendations, and record decisions for organizational memory.",
      color: C.purple,
      action: null,
      actionLabel: null,
    },
  ];
  return (
  <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
    <div style={{ textAlign: "center", marginBottom: 8 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12, boxShadow: `0 0 24px ${C.blue}25` }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/><line x1="12" y1="6" x2="12" y2="20" strokeLinecap="round"/><circle cx="5" cy="6" r="2" fill="#fff" stroke="none"/><circle cx="19" cy="6" r="2" fill="#fff" stroke="none"/></svg>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Welcome to Tarazu</h3>
      <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>Decision intelligence for product teams. Get started in three steps.</p>
    </div>
    {steps.map(s => (
      <div key={s.num} style={{ display: "flex", gap: 14, padding: 16, border: `1px solid ${s.color}20`, borderRadius: 10, background: `${s.color}06` }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{s.num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{s.title}</div>
          <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
          {s.action === "add" && (
            <button onClick={onAddCandidate} style={{ marginTop: 10, padding: "8px 16px", border: `1px dashed ${C.accent}50`, borderRadius: 8, background: C.accentGlow, color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>{s.actionLabel}</button>
          )}
          {s.action === "samples" && (
            <button onClick={onLoadSamples} style={{ marginTop: 10, padding: "8px 16px", border: `1px solid ${C.blue}30`, borderRadius: 8, background: C.blueDim, color: C.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>{s.actionLabel}</button>
          )}
        </div>
      </div>
    ))}
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>Press <strong style={{ color: C.textMuted }}>?</strong> anytime for keyboard shortcuts</span>
    </div>
  </div>
  );
};
