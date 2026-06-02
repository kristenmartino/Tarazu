import { C } from "../theme";

const toggleStyle = (active) => ({
  flex: 1, padding: "3px 6px", borderRadius: 3, border: "none", fontSize: 8, fontWeight: 600,
  cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s",
  background: active ? C.surface : "transparent",
  color: active ? C.purple : C.textMuted, // inactive label: --text-soft (chip rule, AA)
});

export const Slider = ({ label, value, onChange, color, icon, aiMode, aiScore, aiJustification, aiLoading, onToggleAi }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{icon} {label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {aiLoading ? (
          <span style={{ fontSize: 11, color: C.purple, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ display: "inline-block", width: 10, height: 10, border: `1.5px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "spin 0.6s linear infinite", verticalAlign: "middle" }} />
          </span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: aiMode ? C.purple : color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
        )}
      </div>
    </div>
    {onToggleAi && (
      <div style={{ display: "flex", gap: 1, background: C.border, borderRadius: 4, padding: 1 }}>
        <button onClick={() => aiMode && onToggleAi()} style={toggleStyle(!aiMode)}>Manual</button>
        <button onClick={() => !aiMode && onToggleAi()} style={toggleStyle(aiMode)}>AI</button>
      </div>
    )}
    <input type="range" min={1} max={100} value={value} onChange={(e) => onChange(parseInt(e.target.value))}
      style={{ width: "100%", height: 6, appearance: "none", background: `linear-gradient(to right, ${aiMode ? C.purple : color} ${value}%, ${C.border} ${value}%)`, borderRadius: 3, outline: "none", cursor: "pointer", accentColor: aiMode ? C.purple : color }} />
    {aiMode && aiJustification && (
      <p style={{ fontSize: 10, color: C.textMuted, fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>{aiJustification}</p>
    )}
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);
