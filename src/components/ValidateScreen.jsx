import { useState, useMemo } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";
import {
  ASSUMPTION_CATEGORIES,
  VALIDATE_DIMENSIONS,
  scoreValidation,
} from "../validate/validationScore";

const defaultScores = () => Object.fromEntries(VALIDATE_DIMENSIONS.map((d) => [d.key, 3]));

export const ValidateScreen = ({ scored = [], signals = [], productContext, onAddDecision, onScreenChange }) => {
  const C = useC();
  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 };
  const sectionLabel = { fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" };

  const REC = {
    "Build": { color: C.accent, blurb: "Strong evidence and opportunity — worth building now." },
    "Validate Further": { color: C.blue, blurb: "Promising, but key assumptions still need evidence." },
    "Pivot": { color: C.warn, blurb: "Reframe the problem, audience, or approach before committing." },
    "Park": { color: C.danger, blurb: "Not worth pursuing now — revisit if conditions change." },
  };

  const [mode, setMode] = useState(scored.length > 0 ? "candidate" : "manual");
  const [candidateId, setCandidateId] = useState(scored[0]?.id || "");
  const [manualName, setManualName] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [assumptions, setAssumptions] = useState({});
  const [attached, setAttached] = useState([]); // signal ids
  const [scores, setScores] = useState(defaultScores);
  const [risks, setRisks] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [saving, setSaving] = useState(false);

  const candidate = mode === "candidate" ? scored.find((f) => f.id === candidateId) : null;
  const ideaName = mode === "candidate" ? (candidate?.name || "") : manualName.trim();
  const ideaDesc = mode === "candidate" ? (candidate?.description || "") : manualDesc.trim();

  const { average, recommendation } = useMemo(() => scoreValidation(scores), [scores]);
  const rec = REC[recommendation];
  const attachedSignals = useMemo(() => signals.filter((s) => attached.includes(s.id)), [signals, attached]);
  const canSave = ideaName.length > 0;

  const setScore = (key, val) => setScores((s) => ({ ...s, [key]: val }));
  const toggleSignal = (id) => setAttached((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const scoreSummary = `${recommendation} — ${average.toFixed(1)}/5 across ${VALIDATE_DIMENSIONS.length} opportunity dimensions.`;

  const briefText = useMemo(() => {
    const lines = [];
    lines.push(`Idea: ${ideaName || "(unnamed)"}`);
    if (ideaDesc) lines.push(`Description: ${ideaDesc}`);
    lines.push(`Recommendation: ${recommendation} (avg ${average.toFixed(1)}/5)`);
    lines.push("");
    lines.push("Opportunity scores:");
    VALIDATE_DIMENSIONS.forEach((d) => lines.push(`  - ${d.label}: ${scores[d.key]}/5`));
    const filledAssumptions = ASSUMPTION_CATEGORIES.filter((c) => (assumptions[c.key] || "").trim());
    if (filledAssumptions.length) {
      lines.push("");
      lines.push("Key assumptions:");
      filledAssumptions.forEach((c) => lines.push(`  - ${c.label}: ${assumptions[c.key].trim()}`));
    }
    if (attachedSignals.length) {
      lines.push("");
      lines.push(`Supporting evidence (${attachedSignals.length}):`);
      attachedSignals.forEach((s) => lines.push(`  - ${s.title}${s.source ? ` (${s.source})` : ""}`));
    }
    if (risks.trim()) { lines.push(""); lines.push(`Risks / unknowns: ${risks.trim()}`); }
    if (nextActions.trim()) { lines.push(""); lines.push(`Next validation actions: ${nextActions.trim()}`); }
    return lines.join("\n");
  }, [ideaName, ideaDesc, recommendation, average, scores, assumptions, attachedSignals, risks, nextActions]);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const payload = {
      title: `Validation: ${ideaName}`,
      chosen_candidate_id: candidate?.id || null,
      chosen_candidate_name: candidate?.name || (mode === "manual" ? ideaName : ""),
      framework_used: "Tarazu Validate",
      summary_rationale: scoreSummary,
      final_rationale: briefText,
      evidence_count: attachedSignals.length,
      tradeoffs_considered: risks.trim(),
      risks_accepted: "",
      expected_outcome: nextActions.trim(),
      status: "draft",
      recommendation_snapshot: {
        framework: "Tarazu Validate",
        recommendation,
        average,
        scores,
        assumptions,
        attachedSignals: attachedSignals.map((s) => ({ id: s.id, title: s.title })),
      },
    };
    try {
      await onAddDecision?.(payload);
      onScreenChange?.("decisions");
    } catch (err) {
      console.error("Save validation draft failed:", err);
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "0 24px 24px" }} role="main" id="main-content">
      {/* Header */}
      <div style={{ padding: "16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Validate</h2>
          <Pill color={C.purple} dimColor={C.purpleDim} small>BETA</Pill>
        </div>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
          Turn product ideas into evidence-backed build / pivot / park recommendations.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, maxWidth: 760 }}>
        {/* 1. Idea */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16 }}>
          <div style={sectionLabel}>Idea</div>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
            <button onClick={() => setMode("candidate")} disabled={scored.length === 0} style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              border: `1px solid ${mode === "candidate" ? C.accent : C.border}`,
              background: mode === "candidate" ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent",
              color: scored.length === 0 ? C.textDim : mode === "candidate" ? C.accent : C.textMuted,
              cursor: scored.length === 0 ? "not-allowed" : "pointer", opacity: scored.length === 0 ? 0.5 : 1,
            }}>Existing candidate</button>
            <button onClick={() => setMode("manual")} style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              border: `1px solid ${mode === "manual" ? C.accent : C.border}`,
              background: mode === "manual" ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent",
              color: mode === "manual" ? C.accent : C.textMuted, cursor: "pointer",
            }}>New idea</button>
          </div>

          {mode === "candidate" ? (
            scored.length > 0 ? (
              <div>
                <label htmlFor="validate-candidate" style={labelStyle}>CANDIDATE</label>
                <select id="validate-candidate" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {scored.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.score})</option>)}
                </select>
                {ideaDesc && <p style={{ fontSize: 11, color: C.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>{ideaDesc}</p>}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>No scored candidates yet — switch to “New idea”.</p>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label htmlFor="validate-idea-name" style={labelStyle}>IDEA NAME</label>
                <input id="validate-idea-name" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Slack weekly digest" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="validate-idea-desc" style={labelStyle}>DESCRIPTION (OPTIONAL)</label>
                <textarea id="validate-idea-desc" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} rows={2} placeholder="What is it, in one or two sentences?" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
          )}
          {productContext?.productSummary && (
            <p style={{ fontSize: 10, color: C.textDim, margin: "12px 0 0", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
              Validating against product context: {productContext.productSummary.slice(0, 120)}{productContext.productSummary.length > 120 ? "…" : ""}
            </p>
          )}
        </section>

        {/* 2. Assumptions */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16 }}>
          <div style={sectionLabel}>Key assumptions</div>
          <p style={{ fontSize: 11, color: C.textDim, margin: "6px 0 12px", lineHeight: 1.5 }}>What has to be true for this idea to work?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {ASSUMPTION_CATEGORIES.map((cat) => (
              <div key={cat.key}>
                <label htmlFor={`assume-${cat.key}`} style={labelStyle}>{cat.label.toUpperCase()}</label>
                <textarea id={`assume-${cat.key}`} value={assumptions[cat.key] || ""} onChange={(e) => setAssumptions((a) => ({ ...a, [cat.key]: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            ))}
          </div>
        </section>

        {/* 3. Evidence */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={sectionLabel}>Supporting evidence</div>
            <Pill color={C.blue} dimColor={C.blueDim} small>{attachedSignals.length} attached</Pill>
          </div>
          {signals.length === 0 ? (
            <p style={{ fontSize: 12, color: C.textDim, margin: "10px 0 0", lineHeight: 1.5 }}>
              No signals captured yet. Add evidence on the Signals screen, then attach it here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 240, overflowY: "auto" }}>
              {signals.map((s) => {
                const on = attached.includes(s.id);
                return (
                  <label key={s.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 31%, transparent)" : C.border}`, background: on ? C.blueDim : "transparent" }}>
                    <input type="checkbox" checked={on} onChange={() => toggleSignal(s.id)} style={{ marginTop: 2, accentColor: C.blue }} aria-label={`Attach signal: ${s.title}`} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text }}>{s.title}</span>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 3 }}>
                        {s.source && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{s.source}</span>}
                        {s.theme && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{s.theme}</span>}
                        {s.confidence_impact && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{s.confidence_impact}</span>}
                        {s.linked_candidate_name && <span style={{ fontSize: 9, color: C.blue, fontFamily: "'JetBrains Mono', monospace" }}>↳ {s.linked_candidate_name}</span>}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Scorecard */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16 }}>
          <div style={sectionLabel}>Opportunity scorecard</div>
          <p style={{ fontSize: 11, color: C.textDim, margin: "6px 0 12px", lineHeight: 1.5 }}>Rate each dimension 1 (weak) to 5 (strong).</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {VALIDATE_DIMENSIONS.map((d) => (
              <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: 1, fontSize: 12, color: C.text }}>{d.label}</span>
                <div role="group" aria-label={d.label} style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = scores[d.key] === n;
                    return (
                      <button key={n} onClick={() => setScore(d.key, n)} aria-label={`${d.label}: ${n} of 5`} aria-pressed={active} style={{
                        width: 28, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                        border: `1px solid ${active ? C.accent : C.border}`,
                        background: active ? C.accent : "transparent",
                        color: active ? C.bg : C.textMuted,
                      }}>{n}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Recommendation */}
        <section style={{ border: `1px solid ${rec.color}40`, borderRadius: 12, background: rec.color + "0E", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: rec.color }}>{recommendation}</span>
            <Pill color={rec.color} dimColor={rec.color + "20"}>{average.toFixed(1)} / 5</Pill>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>{rec.blurb}</p>
        </section>

        {/* 6. Risks + next actions */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <div>
            <label htmlFor="validate-risks" style={labelStyle}>RISKS / UNKNOWNS</label>
            <textarea id="validate-risks" value={risks} onChange={(e) => setRisks(e.target.value)} rows={3} placeholder="What could make this wrong?" style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div>
            <label htmlFor="validate-next" style={labelStyle}>NEXT VALIDATION ACTIONS</label>
            <textarea id="validate-next" value={nextActions} onChange={(e) => setNextActions(e.target.value)} rows={3} placeholder="What would de-risk this fastest?" style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </section>

        {/* 7. Brief preview */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.bg, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={sectionLabel}>Validation brief</div>
            <Pill color={C.textMuted} dimColor={C.border} small>preview</Pill>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, lineHeight: 1.6, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
            {briefText}
          </pre>
        </section>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            padding: "10px 18px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            background: canSave && !saving ? C.accent : C.border,
            color: canSave && !saving ? C.bg : C.textDim,
            cursor: canSave && !saving ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span aria-hidden="true">⚖</span> {saving ? "Saving…" : "Save as Decision Draft"}
          </button>
        </div>
        {!canSave && (
          <p style={{ fontSize: 10, color: C.textDim, margin: "-6px 0 0", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
            Choose a candidate or name an idea to save.
          </p>
        )}
      </div>
    </div>
  );
};
