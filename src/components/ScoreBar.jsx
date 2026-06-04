import { useC } from "../ThemeProvider";

export const ScoreBar = ({ value, color, label }) => {
  const C = useC();
  return (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 10, color: C.textMuted, width: 16, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
    <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
    <span style={{ fontSize: 10, color: C.textMuted, width: 22, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
  </div>
  );
};
