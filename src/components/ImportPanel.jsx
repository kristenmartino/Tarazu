import { useC } from "../ThemeProvider";

export const ImportPanel = ({ importData, onConfirm, onCancel }) => {
  const C = useC();
  const { features, nameHeader, descHeader, hasRice } = importData;
  const format = nameHeader === "Summary" ? "Jira" : nameHeader === "Title" ? "Linear" : "CSV";

  return (
    <div style={{ padding: 20, border: `1px solid ${C.borderActive}`, borderRadius: 12, background: C.surface }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Import {features.length} candidates</span>
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: C.border, borderRadius: 4 }}>{format}</span>
        </div>
        {!hasRice && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: C.warnDim, border: `1px solid ${C.warn}30` }}>
            <span style={{ fontSize: 10, color: C.warn, fontFamily: "'JetBrains Mono', monospace" }}>RICE scores not found in CSV — all values will default to 50. You can edit them after import.</span>
          </div>
        )}
        <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {features.map((f, i) => (
            <div key={i} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
              {f.description && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>}
              {hasRice && <div style={{ fontSize: 9, color: C.textDim, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>R:{f.reach} I:{f.impact} C:{f.confidence} E:{f.effort}</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 16px", border: "none", borderRadius: 8, background: C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Import {features.length} Candidates</button>
          <button onClick={onCancel} style={{ padding: "10px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
