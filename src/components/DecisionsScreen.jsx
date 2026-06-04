import { useState } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";

const STATUS_OPTIONS = ["draft", "approved", "archived"];
const EMPTY_FORM = { title: "", chosen_candidate_id: null, chosen_candidate_name: "", summary_rationale: "", final_rationale: "", framework_used: "RICE", tradeoffs_considered: "", risks_accepted: "", expected_outcome: "", owner: "", status: "draft", decision_date: new Date().toISOString().split("T")[0], review_date: "" };

export const DecisionsScreen = ({ decisions, scored, onAdd, onUpdate, onDelete }) => {
  const C = useC();
  const STATUS_COLORS = { draft: C.warn, approved: C.accent, archived: C.textDim };
  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 };
  const selectStyle = { ...inputStyle, cursor: "pointer" };
  const [showForm, setShowForm] = useState(false);
  const [editingDecision, setEditingDecision] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = filterStatus === "all" ? decisions : decisions.filter(d => d.status === filterStatus);

  const openForm = (decision = null) => {
    if (decision) {
      setForm({
        title: decision.title || "", chosen_candidate_id: decision.chosen_candidate_id || null,
        chosen_candidate_name: decision.chosen_candidate_name || "", summary_rationale: decision.summary_rationale || "",
        final_rationale: decision.final_rationale || "", framework_used: decision.framework_used || "RICE",
        tradeoffs_considered: decision.tradeoffs_considered || "", risks_accepted: decision.risks_accepted || "",
        expected_outcome: decision.expected_outcome || "", owner: decision.owner || "",
        status: decision.status || "draft",
        decision_date: decision.decision_date ? decision.decision_date.split("T")[0] : new Date().toISOString().split("T")[0],
        review_date: decision.review_date ? decision.review_date.split("T")[0] : "",
      });
      setEditingDecision(decision);
    } else {
      setForm(EMPTY_FORM);
      setEditingDecision(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      chosen_candidate_id: form.chosen_candidate_id || null,
      decision_date: form.decision_date ? new Date(form.decision_date).toISOString() : new Date().toISOString(),
      review_date: form.review_date ? new Date(form.review_date).toISOString() : null,
    };
    try {
      if (editingDecision) {
        await onUpdate(editingDecision.id, payload);
      } else {
        await onAdd(payload);
      }
      setShowForm(false);
      setEditingDecision(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Decision save failed:", err);
    }
  };

  const handleCandidateSelect = (e) => {
    const fId = e.target.value;
    if (!fId) { setForm(f => ({ ...f, chosen_candidate_id: null, chosen_candidate_name: "" })); return; }
    const feat = scored.find(f => f.id === fId);
    setForm(f => ({ ...f, chosen_candidate_id: fId, chosen_candidate_name: feat?.name || "" }));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "0 24px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Decisions</h2>
          <Pill color={C.textMuted} dimColor={C.border}>{filtered.length}</Pill>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["all", ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterStatus === s ? C.accent : C.border}`,
              background: filterStatus === s ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent", color: filterStatus === s ? C.accent : C.textMuted,
              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
            }}>{s}</button>
          ))}
          <button onClick={() => openForm()} style={{ padding: "6px 14px", border: `1px solid color-mix(in srgb, var(--success) 19%, transparent)`, borderRadius: 8, background: "color-mix(in srgb, var(--success) 6%, transparent)", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>+ New Decision</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ padding: 20, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{editingDecision ? "Edit Decision" : "New Decision"}</span>
            <button onClick={() => { setShowForm(false); setEditingDecision(null); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={labelStyle}>TITLE</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What was decided?" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>CHOSEN CANDIDATE</div>
                <select value={form.chosen_candidate_id || ""} onChange={handleCandidateSelect} style={selectStyle}>
                  <option value="">None</option>
                  {scored.map(f => <option key={f.id} value={f.id}>{f.name} ({f.score})</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>FRAMEWORK</div>
                <input value={form.framework_used} onChange={e => setForm(f => ({ ...f, framework_used: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={labelStyle}>SUMMARY RATIONALE</div>
              <textarea value={form.summary_rationale} onChange={e => setForm(f => ({ ...f, summary_rationale: e.target.value }))} placeholder="Why was this chosen?" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div>
              <div style={labelStyle}>TRADEOFFS CONSIDERED</div>
              <textarea value={form.tradeoffs_considered} onChange={e => setForm(f => ({ ...f, tradeoffs_considered: e.target.value }))} placeholder="What alternatives were weighed?" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>RISKS ACCEPTED</div>
                <textarea value={form.risks_accepted} onChange={e => setForm(f => ({ ...f, risks_accepted: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <div style={labelStyle}>EXPECTED OUTCOME</div>
                <textarea value={form.expected_outcome} onChange={e => setForm(f => ({ ...f, expected_outcome: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>OWNER</div>
                <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>STATUS</div>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>DECISION DATE</div>
                <input type="date" value={form.decision_date} onChange={e => setForm(f => ({ ...f, decision_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>REVIEW DATE</div>
                <input type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowForm(false); setEditingDecision(null); }} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
              <button onClick={handleSubmit} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: C.accent, color: C.bg, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>{editingDecision ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>&#9878;</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>No decisions recorded yet</div>
          <div style={{ fontSize: 12, color: C.textDim, maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>
            Turn prioritization outcomes into reusable organizational memory.
          </div>
        </div>
      )}

      {/* Decision cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(d => {
          const isExpanded = expandedId === d.id;
          const statusColor = STATUS_COLORS[d.status] || C.textMuted;
          return (
            <div key={d.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: "hidden" }}>
              {/* Card header */}
              <div onClick={() => setExpandedId(isExpanded ? null : d.id)} style={{ padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{d.title}</span>
                    <Pill color={statusColor} dimColor={statusColor + "20"} small>{d.status?.toUpperCase()}</Pill>
                  </div>
                  <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    {d.decision_date ? new Date(d.decision_date).toLocaleDateString() : ""}
                  </span>
                </div>
                {d.chosen_candidate_name && (
                  <div style={{ fontSize: 11, color: C.blue, marginBottom: 4 }}>
                    Chosen: {d.chosen_candidate_name}
                  </div>
                )}
                {d.summary_rationale && (
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {d.summary_rationale}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  {d.framework_used && <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{d.framework_used}</span>}
                  {d.owner && <span style={{ fontSize: 10, color: C.textDim }}>{d.owner}</span>}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14 }}>
                    {d.final_rationale && (
                      <div>
                        <div style={labelStyle}>FINAL RATIONALE</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{d.final_rationale}</div>
                      </div>
                    )}
                    {d.tradeoffs_considered && (
                      <div>
                        <div style={labelStyle}>TRADEOFFS CONSIDERED</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{d.tradeoffs_considered}</div>
                      </div>
                    )}
                    {d.risks_accepted && (
                      <div>
                        <div style={labelStyle}>RISKS ACCEPTED</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{d.risks_accepted}</div>
                      </div>
                    )}
                    {d.expected_outcome && (
                      <div>
                        <div style={labelStyle}>EXPECTED OUTCOME</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{d.expected_outcome}</div>
                      </div>
                    )}
                    {d.review_date && (
                      <div>
                        <div style={labelStyle}>REVIEW DATE</div>
                        <div style={{ fontSize: 12, color: C.text }}>{new Date(d.review_date).toLocaleDateString()}</div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); openForm(d); }} style={{ flex: 1, padding: "8px 12px", border: `1px solid color-mix(in srgb, var(--accent) 19%, transparent)`, borderRadius: 6, background: C.blueDim, color: C.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(d.id); setExpandedId(null); }} style={{ padding: "8px 12px", border: `1px solid color-mix(in srgb, var(--danger) 19%, transparent)`, borderRadius: 6, background: C.dangerDim, color: C.danger, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
