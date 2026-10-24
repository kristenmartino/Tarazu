import { useC } from "../ThemeProvider";

export const OnboardingPanel = ({ onAddCandidate, onLoadSamples, isSignedIn = false, guestDemo = false }) => {
  const C = useC();
  const steps = [
    {
      num: 1,
      title: "Start with your own decision",
      desc: "Add your Strategy Brief in the candidate form before requesting AI suggestions. Manual scoring is always available. Each candidate is scored with RICE: Reach, Impact, Confidence, and Effort. The framework ranks them automatically.",
      color: C.accent,
      action: "add",
      actionLabel: "+ Add Candidate",
    },
    {
      num: 2,
      title: "Or try a fictional example",
      desc: "Load fictional candidates into an empty backlog. Their scores are illustrative assumptions, not customer evidence. Existing candidates are never replaced.",
      color: C.blue,
      action: "samples",
      actionLabel: "Load Example Backlog",
    },
    {
      num: 3,
      title: "Inspect, change, and explain",
      desc: "Open a candidate, inspect its assumptions, then edit a score and compare the ranking. Use Signals to attach evidence and Decisions to record your choice, alternatives, and expected outcome.",
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
      <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{isSignedIn ? "Start with a decision or explore a fictional example. Your workspace saves to your account." : "Try a decision before signing up. Your guest workspace saves in this browser."}</p>
    </div>
    {steps.filter(s => !guestDemo || s.action !== "samples").map(s => (
      <div key={s.num} style={{ display: "flex", gap: 14, padding: 16, border: `1px solid ${s.color}20`, borderRadius: 10, background: `${s.color}06` }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", flexShrink: 0 }}>{s.num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{s.title}</div>
          <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
          {s.action === "add" && (
            <button onClick={onAddCandidate} style={{ marginTop: 10, padding: "8px 16px", border: `1px dashed ${C.accent}50`, borderRadius: 8, background: C.accentGlow, color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--mono)" }}>{s.actionLabel}</button>
          )}
          {s.action === "samples" && (
            <button onClick={onLoadSamples} style={{ marginTop: 10, padding: "8px 16px", border: `1px solid ${C.blue}30`, borderRadius: 8, background: C.blueDim, color: C.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>{s.actionLabel}</button>
          )}
        </div>
      </div>
    ))}
    {!guestDemo && <p style={{ textAlign: "center", fontSize: 13 }}><a href="/demo" style={{ color: C.accent }}>Try the complete Relay demo</a> — evidence, saved briefs and decisions. No account needed.</p>}
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <span style={{ fontSize: 10, color: C.textDim, fontFamily: "var(--mono)" }}>Press <strong style={{ color: C.textMuted }}>?</strong> anytime for keyboard shortcuts</span>
    </div>
  </div>
  );
};
