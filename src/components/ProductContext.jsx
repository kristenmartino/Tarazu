import { useState, useCallback } from "react";
import { useC } from "../ThemeProvider";
import { SharedScoringBasis } from "./ScoringBasis";
import { BRIEF_FIELDS } from "../../lib/scoring-context";
import { Pill } from "./Pill";

const EMPTY = { productSummary: "", targetUsers: "", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" };

export const ProductContext = ({ context = EMPTY, onChange }) => {
  const C = useC();
  const populated = Object.keys(BRIEF_FIELDS).filter(key => typeof context[key] === "string" && context[key].trim()).length;
  const hasContent = populated > 0 || !!context.scoring;
  const [open, setOpen] = useState(!!hasContent);

  const update = useCallback((field, value) => {
    const next = { ...context, [field]: value };
    onChange(next); // immediate for local state; parent debounces cloud save
  }, [context, onChange]);

  const inputStyle = {
    width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
    background: C.bg, color: C.text, fontSize: 12, fontFamily: "var(--body)",
    resize: "vertical", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
        border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "var(--mono)", flex: 1 }}>
          STRATEGY BRIEF
        </span>
        {hasContent && <Pill color={C.purple} dimColor={C.purpleDim} small>{populated}/6 FIELDS</Pill>}
        <span style={{ fontSize: 10, color: C.textDim, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>PRODUCT SUMMARY</label>
            <textarea aria-label="PRODUCT SUMMARY"
              value={context.productSummary || ""} onChange={e => update("productSummary", e.target.value)}
              placeholder="What does your product do? Who is it for?"
              rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>TARGET USERS</label>
            <textarea aria-label="TARGET USERS"
              value={context.targetUsers || ""} onChange={e => update("targetUsers", e.target.value)}
              placeholder="Describe your primary user segments"
              rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>STRATEGIC PRIORITIES</label>
            <textarea aria-label="STRATEGIC PRIORITIES"
              value={context.strategicPriorities || ""} onChange={e => update("strategicPriorities", e.target.value)}
              placeholder="Current quarterly goals, themes, or bets"
              rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>CONSTRAINTS</label>
            <textarea aria-label="CONSTRAINTS"
              value={context.constraints || ""} onChange={e => update("constraints", e.target.value)}
              placeholder="Budget limits, timeline, technical debt, team size..."
              rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>ASSUMPTIONS</label>
            <textarea aria-label="ASSUMPTIONS"
              value={context.assumptions || ""} onChange={e => update("assumptions", e.target.value)}
              placeholder="Key assumptions behind your current priorities"
              rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4, display: "block" }}>SUCCESS METRICS</label>
            <textarea aria-label="SUCCESS METRICS"
              value={context.successMetrics || ""} onChange={e => update("successMetrics", e.target.value)}
              placeholder="How will you measure if the right things were prioritized?"
              rows={2} style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <SharedScoringBasis settings={context.scoring} onChange={next => update("scoring", next)} />
        </div>
      )}
    </div>
  );
};
