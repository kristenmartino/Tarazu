import { useState, useRef } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";
import { parseCSV, downloadSignalsTemplate } from "../utils";

const CONFIDENCE_OPTIONS = ["", "increases", "decreases", "neutral"];

const EMPTY_FORM = { type: "note", title: "", body: "", source: "", tags: "", linked_candidate_id: null, linked_candidate_name: "", theme: "", confidence_impact: "" };

export const SignalsScreen = ({ signals, scored, onAdd, onUpdate, onDelete, onImport }) => {
  const C = useC();
  const SIGNAL_TYPES = {
    note: { label: "Note", color: C.blue },
    feedback: { label: "Feedback", color: C.accent },
    support: { label: "Support", color: C.warn },
    research: { label: "Research", color: C.purple },
  };
  const TYPE_KEYS = Object.keys(SIGNAL_TYPES);
  // Fold any unrecognized type (blank, or legacy "import" signals) into "note" for display & filtering.
  const normalizeType = (t) => (t && SIGNAL_TYPES[t] ? t : "note");
  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 };
  const selectStyle = { ...inputStyle, cursor: "pointer" };
  const [showForm, setShowForm] = useState(false);
  const [editingSignal, setEditingSignal] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);

  const filtered = filterType === "all" ? signals : signals.filter(s => normalizeType(s.type) === filterType);

  const typeCounts = {};
  for (const s of signals) { const t = normalizeType(s.type); typeCounts[t] = (typeCounts[t] || 0) + 1; }

  const openForm = (signal = null) => {
    if (signal) {
      setForm({
        type: normalizeType(signal.type), title: signal.title || "", body: signal.body || "",
        source: signal.source || "", tags: Array.isArray(signal.tags) ? signal.tags.join(", ") : "",
        linked_candidate_id: signal.linked_candidate_id || null,
        linked_candidate_name: signal.linked_candidate_name || "",
        theme: signal.theme || "", confidence_impact: signal.confidence_impact || "",
      });
      setEditingSignal(signal);
    } else {
      setForm(EMPTY_FORM);
      setEditingSignal(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form, linked_candidate_id: form.linked_candidate_id || null, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [] };
    try {
      if (editingSignal) {
        await onUpdate(editingSignal.id, payload);
      } else {
        await onAdd(payload);
      }
      setShowForm(false);
      setEditingSignal(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Signal save failed:", err);
    }
  };

  const handleCandidateSelect = (e) => {
    const fId = e.target.value;
    if (!fId) { setForm(f => ({ ...f, linked_candidate_id: null, linked_candidate_name: "" })); return; }
    const feat = scored.find(f => f.id === fId);
    setForm(f => ({ ...f, linked_candidate_id: fId, linked_candidate_name: feat?.name || "" }));
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed || parsed.rows.length === 0) return;
      const headers = parsed.headers.map(h => h.toLowerCase().trim());
      const titleIdx = headers.findIndex(h => h === "title" || h === "name" || h === "subject");
      const bodyIdx = headers.findIndex(h => h === "body" || h === "description" || h === "notes" || h === "content");
      const sourceIdx = headers.findIndex(h => h === "source" || h === "origin");
      const typeIdx = headers.findIndex(h => h === "type" || h === "category");
      const themeIdx = headers.findIndex(h => h === "theme" || h === "tag");

      if (titleIdx === -1) return;
      const mapped = parsed.rows.filter(row => row[titleIdx]?.trim()).map(row => ({
        title: row[titleIdx]?.trim() || "",
        body: bodyIdx >= 0 ? row[bodyIdx]?.trim() || "" : "",
        source: sourceIdx >= 0 ? row[sourceIdx]?.trim() || "" : "CSV Import",
        // Route each row to the category named in its `type` column; unknown/blank → "note".
        type: normalizeType(typeIdx >= 0 ? row[typeIdx]?.trim().toLowerCase() : ""),
        theme: themeIdx >= 0 ? row[themeIdx]?.trim() || "" : "",
      }));
      if (mapped.length > 0) setImportData(mapped);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    if (!importData) return;
    onImport(importData);
    setImportData(null);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "0 24px 24px" }}>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Signals</h2>
          <Pill color={C.textMuted} dimColor={C.border}>{filtered.length}</Pill>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setFilterType("all")} style={{
            padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterType === "all" ? C.accent : C.border}`,
            background: filterType === "all" ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent", color: filterType === "all" ? C.accent : C.textMuted,
            fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
          }}>ALL</button>
          {TYPE_KEYS.map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterType === t ? SIGNAL_TYPES[t].color : C.border}`,
              background: filterType === t ? SIGNAL_TYPES[t].color + "15" : "transparent",
              color: filterType === t ? SIGNAL_TYPES[t].color : C.textMuted,
              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
            }}>{SIGNAL_TYPES[t].label}{typeCounts[t] ? ` (${typeCounts[t]})` : ""}</button>
          ))}
          <div aria-hidden style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
          <button onClick={downloadSignalsTemplate} style={{ padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Download template</button>
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Import CSV</button>
          <button onClick={() => openForm()} style={{ padding: "6px 14px", border: `1px solid color-mix(in srgb, var(--success) 19%, transparent)`, borderRadius: 8, background: "color-mix(in srgb, var(--success) 6%, transparent)", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>+ Add Signal</button>
        </div>
      </div>

      {/* Import preview */}
      {importData && (
        <div style={{ padding: 16, border: `1px solid color-mix(in srgb, var(--warning) 25%, transparent)`, borderRadius: 12, background: C.surface, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Import {importData.length} signals</div>
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
            {importData.slice(0, 10).map((s, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
                <span style={{ color: SIGNAL_TYPES[normalizeType(s.type)].color, fontWeight: 600, marginRight: 8 }}>{SIGNAL_TYPES[normalizeType(s.type)].label}</span>
                {s.title}
              </div>
            ))}
            {importData.length > 10 && <div style={{ fontSize: 11, color: C.textDim, padding: "6px 0" }}>...and {importData.length - 10} more</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={confirmImport} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: C.accent, color: C.bg, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Confirm Import</button>
            <button onClick={() => setImportData(null)} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ padding: 20, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{editingSignal ? "Edit Signal" : "New Signal"}</span>
            <button onClick={() => { setShowForm(false); setEditingSignal(null); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={labelStyle}>TYPE</div>
              <div style={{ display: "flex", gap: 6 }}>
                {TYPE_KEYS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                    padding: "5px 12px", borderRadius: 6,
                    border: `1px solid ${form.type === t ? SIGNAL_TYPES[t].color : C.border}`,
                    background: form.type === t ? SIGNAL_TYPES[t].color + "15" : "transparent",
                    color: form.type === t ? SIGNAL_TYPES[t].color : C.textMuted,
                    fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                  }}>{SIGNAL_TYPES[t].label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={labelStyle}>TITLE</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Signal title" style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>BODY</div>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Details, quotes, or notes..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>SOURCE</div>
                <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. User interview, Zendesk" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>THEME</div>
                <input value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="e.g. Onboarding, Billing" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>LINK TO CANDIDATE</div>
                <select value={form.linked_candidate_id || ""} onChange={handleCandidateSelect} style={selectStyle}>
                  <option value="">None</option>
                  {scored.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>CONFIDENCE IMPACT</div>
                <select value={form.confidence_impact} onChange={e => setForm(f => ({ ...f, confidence_impact: e.target.value }))} style={selectStyle}>
                  <option value="">None</option>
                  <option value="increases">Increases confidence</option>
                  <option value="decreases">Decreases confidence</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
            <div>
              <div style={labelStyle}>TAGS (comma-separated)</div>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. ux, pricing, mobile" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowForm(false); setEditingSignal(null); }} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
              <button onClick={handleSubmit} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: C.accent, color: C.bg, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>{editingSignal ? "Update" : "Add Signal"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && !importData && (
        <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>&#128225;</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>No signals yet</div>
          <div style={{ fontSize: 12, color: C.textDim, maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>
            Bring evidence into prioritization. Add research notes, customer feedback, and support issues.
          </div>
        </div>
      )}

      {/* Signal cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(s => {
          const typeInfo = SIGNAL_TYPES[normalizeType(s.type)];
          const ciIcon = s.confidence_impact === "increases" ? "\u2191" : s.confidence_impact === "decreases" ? "\u2193" : null;
          const ciColor = s.confidence_impact === "increases" ? C.accent : s.confidence_impact === "decreases" ? C.danger : C.textDim;
          return (
            <div key={s.id} style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Pill color={typeInfo.color} dimColor={typeInfo.color + "20"} small>{typeInfo.label.toUpperCase()}</Pill>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {ciIcon && <span style={{ fontSize: 12, fontWeight: 700, color: ciColor }}>{ciIcon}</span>}
                  <button onClick={() => openForm(s)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 12, padding: 2 }}>&#9998;</button>
                  <button onClick={() => onDelete(s.id)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12, padding: 2 }}>&#10005;</button>
                </div>
              </div>
              {s.body && (
                <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {s.body}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {s.source && <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{s.source}</span>}
                {s.linked_candidate_name && <span style={{ fontSize: 10, color: C.blue, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: C.blueDim, borderRadius: 4 }}>{s.linked_candidate_name}</span>}
                {s.theme && <span style={{ fontSize: 10, color: C.purple, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: C.purpleDim, borderRadius: 4 }}>{s.theme}</span>}
                {Array.isArray(s.tags) && s.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", border: `1px solid ${C.border}`, borderRadius: 4 }}>{tag}</span>
                ))}
                <span style={{ fontSize: 10, color: C.textDim, marginLeft: "auto" }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confidence calibration summary */}
      {signals.length > 0 && (
        <div style={{ marginTop: 24, padding: 16, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface }}>
          <div style={labelStyle}>CONFIDENCE CALIBRATION</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            {["increases", "decreases", "neutral"].map(ci => {
              const count = signals.filter(s => s.confidence_impact === ci).length;
              const color = ci === "increases" ? C.accent : ci === "decreases" ? C.danger : C.textDim;
              return (
                <div key={ci} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{ci === "increases" ? "\u2191" : ci === "decreases" ? "\u2193" : "\u2022"}</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{ci}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
