import "./ui/ui.css";
import { useState, useRef, useEffect } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";
import { DecisionRationale, SourceBriefReference } from "./DecisionRationale";
import { CopyDecisionBrief, DecisionReview } from "./DecisionReview";
import { DecisionAtGlance } from "./DecisionAtGlance";
import { dateOnly, localToday, serializeDateOnly, formatDateOnly } from "../dateOnly";

const STATUS_OPTIONS = ["draft", "approved", "archived"];
const emptyForm = () => ({ title: "", chosen_candidate_id: null, chosen_candidate_name: "", summary_rationale: "", final_rationale: "", framework_used: "RICE", tradeoffs_considered: "", risks_accepted: "", expected_outcome: "", owner: "", status: "draft", decision_date: localToday(), review_date: "" });

export const DecisionsScreen = ({ decisions, scored, onAdd, onUpdate, onDelete, onReview, signals = [], initialExpandedId = null }) => {
  const C = useC();
  const STATUS_COLORS = { draft: C.warn, approved: C.accent, archived: C.textDim };
  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 12, fontFamily: "var(--mono)", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4 };
  const selectStyle = { ...inputStyle, cursor: "pointer" };
  const [showForm, setShowForm] = useState(false);
  const [editingDecision, setEditingDecision] = useState(null);
  const [expandedId, setExpandedId] = useState(initialExpandedId);
  const editorRef = useRef(null);
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (showForm) editorRef.current?.querySelector("input")?.focus();
    else returnFocusRef.current?.focus();
  }, [showForm]);
  const [filterStatus, setFilterStatus] = useState(() => decisions.find(d => d.id === initialExpandedId)?.status === "archived" ? "all" : "current");
  useEffect(() => {
    if (!initialExpandedId) return;
    const toggle = document.getElementById(`decision-toggle-${initialExpandedId}`);
    toggle?.focus({ preventScroll: true });
    toggle?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [initialExpandedId]);
  const [form, setForm] = useState(emptyForm);

  const filtered = filterStatus === "current" ? decisions.filter(d => d.status !== "archived") : filterStatus === "all" ? decisions : decisions.filter(d => d.status === filterStatus);

  const openForm = (decision = null) => {
    returnFocusRef.current = document.activeElement;
    if (decision) {
      setForm({
        title: decision.title || "", chosen_candidate_id: decision.chosen_candidate_id || null,
        chosen_candidate_name: decision.chosen_candidate_name || "", summary_rationale: decision.summary_rationale || "",
        final_rationale: decision.final_rationale || "", framework_used: decision.framework_used || "RICE",
        tradeoffs_considered: decision.tradeoffs_considered || "", risks_accepted: decision.risks_accepted || "",
        expected_outcome: decision.expected_outcome || "", owner: decision.owner || "",
        status: decision.status || "draft",
        decision_date: dateOnly(decision.decision_date) || localToday(),
        review_date: dateOnly(decision.review_date),
      });
      setEditingDecision(decision);
    } else {
      setForm(emptyForm());
      setEditingDecision(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      chosen_candidate_id: form.chosen_candidate_id || null,
      decision_date: serializeDateOnly(form.decision_date || localToday()),
      review_date: serializeDateOnly(form.review_date),
    };
    try {
      if (editingDecision) {
        await onUpdate(editingDecision.id, payload);
      } else {
        await onAdd(payload);
      }
      setShowForm(false);
      setEditingDecision(null);
      setForm(emptyForm());
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
    <div role="main" id="main-content" tabIndex={-1} className="tz-decisions" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "0 24px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Decisions</h2>
          <Pill color={C.textMuted} dimColor={C.border}>{filtered.length}</Pill>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          {["current", ...STATUS_OPTIONS, "all"].map(s => (
            <button key={s} aria-pressed={filterStatus === s} onClick={() => setFilterStatus(s)} style={{
              padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterStatus === s ? C.accent : C.border}`,
              background: filterStatus === s ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent", color: filterStatus === s ? C.accent : C.textMuted,
              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)", textTransform: "uppercase",
            }}>{s}</button>
          ))}
          <button onClick={() => openForm()} style={{ padding: "6px 14px", border: `1px solid color-mix(in srgb, var(--success) 19%, transparent)`, borderRadius: 8, background: "color-mix(in srgb, var(--success) 6%, transparent)", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>+ New Decision</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div ref={editorRef} style={{ padding: 20, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{editingDecision ? "Edit Decision" : "New Decision"}</span>
            <button aria-label="Close decision editor" onClick={() => { setShowForm(false); setEditingDecision(null); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={labelStyle}>TITLE</div>
              <input aria-label="Decision title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What was decided?" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
              <div>
                <div style={labelStyle}>RISKS ACCEPTED</div>
                <textarea value={form.risks_accepted} onChange={e => setForm(f => ({ ...f, risks_accepted: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <div style={labelStyle}>EXPECTED OUTCOME</div>
                <textarea value={form.expected_outcome} onChange={e => setForm(f => ({ ...f, expected_outcome: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
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
                <input aria-label="Decision date" type="date" value={form.decision_date} onChange={e => setForm(f => ({ ...f, decision_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>ORIGINAL REVIEW DATE</div>
                <input aria-label="Review date" type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowForm(false); setEditingDecision(null); }} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>Cancel</button>
              <button onClick={handleSubmit} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: C.accent, color: C.bg, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>{editingDecision ? "Update" : "Create"}</button>
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
              <button type="button" id={`decision-toggle-${d.id}`} aria-label={`Decision: ${d.title}`} aria-expanded={isExpanded} aria-controls={`decision-detail-${d.id}`} onClick={() => setExpandedId(isExpanded ? null : d.id)} style={{ scrollMarginTop: 60, display: "block", width: "100%", textAlign: "left", font: "inherit", color: "inherit", background: "transparent", border: 0, padding: 14, cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{d.title}</span>
                    <Pill color={statusColor} dimColor={statusColor + "20"} small>{d.status?.toUpperCase()}</Pill>
                  </span>
                  <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "var(--mono)" }}>
                    {d.decision_date ? formatDateOnly(d.decision_date) : ""}
                  </span>
                </span>
                {!isExpanded && d.chosen_candidate_name && (
                  <span style={{ display: "block", fontSize: 11, color: C.blue, marginBottom: 4 }}>
                    Chosen: {d.chosen_candidate_name}
                  </span>
                )}
                {!isExpanded && d.summary_rationale && (
                  <span style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {d.summary_rationale}
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  {d.framework_used && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "var(--mono)" }}>{d.framework_used}</span>}
                  {d.owner && <span style={{ fontSize: 12, color: C.textMuted }}>{d.owner}</span>}
                  {/* Distinct from owner above: owner is who is accountable
                      (free text, may not be a user); this is who entered the
                      record, and is backed by a real account. */}
                  {d.created_by_name && (
                    <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "var(--mono)" }}>
                      recorded by {d.created_by_name}
                    </span>
                  )}
                </span>
              </button>

              {/* Expanded detail */}
              <div id={`decision-detail-${d.id}`} role="region" aria-labelledby={`decision-toggle-${d.id}`} hidden={!isExpanded}>
              {isExpanded && (
                <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14 }}>
                    <DecisionAtGlance decision={d} recordId={`preserved-record-${d.id}`} />
                    <div className="tz-record-toolbar"><CopyDecisionBrief key={d.id} decision={d} /></div>
                    <DecisionReview key={d.id} decision={d} signals={signals} onReview={onReview} />
                    <div id={`preserved-record-${d.id}`} className="tz-preserved-record" tabIndex={-1}>
                      <SourceBriefReference decision={d} />
                      <DecisionRationale decision={d} />
                    </div>
                    {d.review_date && (
                      <div>
                        <div style={labelStyle}>ORIGINAL REVIEW DATE</div>
                        <div style={{ fontSize: 12, color: C.text }}>{formatDateOnly(d.review_date)}</div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); openForm(d); }} style={{ flex: 1, padding: "8px 12px", border: `1px solid color-mix(in srgb, var(--accent) 19%, transparent)`, borderRadius: 6, background: C.blueDim, color: C.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(d.id); setExpandedId(null); }} style={{ padding: "8px 12px", border: `1px solid color-mix(in srgb, var(--danger) 19%, transparent)`, borderRadius: 6, background: C.dangerDim, color: C.danger, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
