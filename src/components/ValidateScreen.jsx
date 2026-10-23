import { useState, useMemo, useEffect } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";
import { signalSnapshot, briefFingerprint } from "../../lib/validation-brief";
import { dialog } from "./dialog";
import {
  ASSUMPTION_CATEGORIES,
  VALIDATE_DIMENSIONS,
  scoreValidation,
} from "../validate/validationScore";

const defaultScores = () => Object.fromEntries(VALIDATE_DIMENSIONS.map((d) => [d.key, null]));

export const ValidateScreen = ({ scored = [], signals = [], productContext, onAddDecision, onScreenChange, briefs = [], onSaveBrief, storageLabel = "Saved" }) => {
  const C = useC();
  const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 12, fontFamily: "var(--mono)", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)", marginBottom: 4 };
  const sectionLabel = { fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", fontFamily: "var(--mono)", textTransform: "uppercase" };

  const REC = {
    "Not assessed": { color: C.textMuted },
    "Assessment incomplete": { color: C.blue },
    "Build": { color: C.accent },
    "Validate Further": { color: C.blue },
    "Pivot": { color: C.warn },
    "Park": { color: C.danger },
  };

  const [mode, setMode] = useState(scored.length > 0 ? "candidate" : "manual");
  const [candidateId, setCandidateId] = useState(scored[0]?.id || "");
  const [manualName, setManualName] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [assumptions, setAssumptions] = useState({});
  const [attached, setAttached] = useState([]); // signal ids
  const [scores, setScores] = useState(defaultScores);
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [risks, setRisks] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentBrief, setCurrentBrief] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [edited, setEdited] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const candidate = mode === "candidate" ? scored.find((f) => f.id === candidateId) : null;
  const ideaName = mode === "candidate" ? (candidate?.name || currentBrief?.draft.ideaName || "") : manualName.trim();
  const ideaDesc = mode === "candidate" ? (candidate ? candidate.description || "" : currentBrief?.draft.ideaDesc || "") : manualDesc.trim();

  const attachedSignals = useMemo(() => signals.filter((s) => attached.includes(s.id)), [signals, attached]);
  const { average, recommendation, assessedCount, reason } = useMemo(() => scoreValidation(scores, { assumptions, evidenceCount: attachedSignals.length, evidenceReviewed }), [scores, assumptions, attachedSignals.length, evidenceReviewed]);
  const rec = REC[recommendation];
  const averageLabel = average === null ? "Not assessed" : `${average.toFixed(1)}/5`;
  const canSave = ideaName.length > 0;
  const missingSignals = (currentBrief?.draft.attachedSignals || []).filter(s => attached.includes(s.id) && !signals.some(live => live.id === s.id));
  const currentDraft = {
    mode, candidateId, ideaName, ideaDesc, manualName, manualDesc, assumptions, scores,
    evidenceReviewed, attachedSignals: [...attachedSignals.map(signalSnapshot), ...missingSignals],
    productContext: Object.fromEntries(["productSummary", "targetUsers", "strategicPriorities", "constraints", "assumptions", "successMetrics"].map(k => [k, productContext?.[k] || ""])),
    risks, nextActions,
  };
  const signature = briefFingerprint(currentDraft);
  const dirty = baseline === null ? edited : signature !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const canLeave = async () => !dirty || await dialog.confirm({ title: "Discard unsaved changes?", message: "Save this brief first if you want to keep your edits.", confirmText: "Discard changes" });
  const openBrief = async record => {
    if (saving || !(await canLeave())) return;
    const draft = record.draft;
    setCurrentBrief(record); setMode(draft.mode); setCandidateId(draft.candidateId);
    setManualName(draft.manualName); setManualDesc(draft.manualDesc);
    setAssumptions(draft.assumptions); setScores(draft.scores);
    setAttached(draft.attachedSignals.map(s => s.id));
    const unchanged = draft.attachedSignals.every(saved => {
      const live = signals.find(s => s.id === saved.id);
      return live && briefFingerprint(signalSnapshot(live)) === briefFingerprint(saved);
    });
    const contextUnchanged = briefFingerprint(draft.productContext) === briefFingerprint(currentDraft.productContext);
    const linkedCandidate = draft.mode === "candidate" ? scored.find(f => f.id === draft.candidateId) : null;
    const candidateUnchanged = draft.mode !== "candidate" || (linkedCandidate && linkedCandidate.name === draft.ideaName && (linkedCandidate.description || "") === draft.ideaDesc);
    setEvidenceReviewed(draft.evidenceReviewed && unchanged && contextUnchanged && Boolean(candidateUnchanged));
    setRisks(draft.risks); setNextActions(draft.nextActions);
    setBaseline(briefFingerprint(draft)); setEdited(false); setSaveError(""); setSaveMessage("");
  };
  const startNew = async () => {
    if (saving || !(await canLeave())) return;
    setCurrentBrief(null); setMode("manual"); setCandidateId(""); setManualName(""); setManualDesc("");
    setAssumptions({}); setScores(defaultScores()); setAttached([]); setEvidenceReviewed(false);
    setRisks(""); setNextActions(""); setBaseline(null); setEdited(false); setSaveMessage(""); setSaveError("");
  };
  const persistBrief = async () => {
    if (!onSaveBrief) return null;
    if (currentBrief && !dirty) return currentBrief;
    const record = await onSaveBrief(currentDraft, currentBrief);
    setCurrentBrief(record); setBaseline(briefFingerprint(record.draft)); setEdited(false);
    setSaveMessage(`${storageLabel} · Revision ${record.revision}`);
    return record;
  };
  const handleSaveBrief = async () => {
    if (!canSave || saving) return;
    setSaving(true); setSaveError(""); setSaveMessage("");
    try { await persistBrief(); }
    catch (err) { setSaveError(err.message || "Brief could not be saved. Your edits are still here."); }
    finally { setSaving(false); }
  };

  const setScore = (key, val) => { setEdited(true); setScores((s) => ({ ...s, [key]: val })); };
  const toggleSignal = (id) => { setEvidenceReviewed(false); setAttached((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id])); };

  const scoreSummary = `${recommendation} — ${assessedCount}/${VALIDATE_DIMENSIONS.length} dimensions assessed${average === null ? "" : `; average ${averageLabel}`}. ${reason}`;

  const briefText = useMemo(() => {
    const lines = [];
    lines.push(`Idea: ${ideaName || "(unnamed)"}`);
    if (ideaDesc) lines.push(`Description: ${ideaDesc}`);
    lines.push(`Assessment: ${scoreSummary}`);
    lines.push("");
    lines.push("Opportunity scores:");
    VALIDATE_DIMENSIONS.forEach((d) => lines.push(`  - ${d.label}: ${scores[d.key] == null ? "Not assessed" : `${scores[d.key]}/5`}`));
    const filledAssumptions = ASSUMPTION_CATEGORIES.filter((c) => (assumptions[c.key] || "").trim());
    if (filledAssumptions.length) {
      lines.push("");
      lines.push("Key assumptions:");
      filledAssumptions.forEach((c) => lines.push(`  - ${c.label}: ${assumptions[c.key].trim()}`));
    }
    if (attachedSignals.length) {
      lines.push("");
      lines.push(`Attached evidence (${attachedSignals.length}; review ${evidenceReviewed ? "completed" : "pending"}):`);
      attachedSignals.forEach((s) => lines.push(`  - ${s.title}${s.source ? ` (${s.source})` : ""}${s.confidence_impact ? ` — ${s.confidence_impact}` : ""}`));
    }
    if (missingSignals.length) {
      lines.push(""); lines.push("Unavailable sources (saved reference only; excluded from the current evidence assessment):");
      missingSignals.forEach(s => lines.push(`  - ${s.title}${s.source ? ` (${s.source})` : ""}`));
    }
    if (risks.trim()) { lines.push(""); lines.push(`Risks / unknowns: ${risks.trim()}`); }
    if (nextActions.trim()) { lines.push(""); lines.push(`Next validation actions: ${nextActions.trim()}`); }
    return lines.join("\n");
  }, [ideaName, ideaDesc, scoreSummary, scores, assumptions, attachedSignals, missingSignals, evidenceReviewed, risks, nextActions]);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true); setSaveError("");
    try {
      const savedBrief = await persistBrief();
      const payload = {
        title: `Validation: ${ideaName}`,
        chosen_candidate_id: candidate?.id || null,
        chosen_candidate_name: ideaName,
        framework_used: "Tarazu Validate",
        summary_rationale: scoreSummary,
        final_rationale: briefText,
        evidence_count: attachedSignals.length,
        tradeoffs_considered: risks.trim(),
        risks_accepted: "",
        expected_outcome: nextActions.trim(),
        status: "draft",
        recommendation_snapshot: {
          ...(savedBrief ? { validation_brief: { id: savedBrief.id, revision: savedBrief.revision, draft: savedBrief.draft } } : {}),
          framework: "Tarazu Validate",
          recommendation,
          average,
          assessment_version: 2,
          assessedCount,
          evidenceReviewed,
          reason,
          scores,
          assumptions,
          attachedSignals: attachedSignals.map((s) => ({ id: s.id, title: s.title, confidence_impact: s.confidence_impact })),
        },
      };
      await onAddDecision?.(payload);
      onScreenChange?.("decisions");
    } catch (err) {
      setSaveError(err.message || "Decision Draft could not be created. Your saved brief is still available.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "0 24px 24px" }} onChangeCapture={() => { setEdited(true); setSaveMessage(""); }} role="main" id="main-content">
      {/* Header */}
      <div style={{ padding: "16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Validate</h2>
          <Pill color={C.purple} dimColor={C.purpleDim} small>BETA</Pill>
        </div>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
          Assess your assumptions and evidence before deciding whether to build, pivot, or park.
        </p>
      </div>

      {onSaveBrief && <section aria-label="Saved validation briefs" style={{ maxWidth: 760, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Saved briefs ({briefs.length})</h3>
          <button onClick={startNew} disabled={saving}>New brief</button>
        </div>
        {briefs.length === 0 && <p style={{ fontSize: 12, color: C.textMuted }}>Save an investigation and return to its assumptions and evidence later.</p>}
        <ul style={{ padding: 0, listStyle: "none", maxHeight: 200, overflowY: "auto", marginBottom: 0 }}>
          {briefs.map(b => <li key={b.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => openBrief(b)} disabled={saving} aria-label={`Open brief: ${b.title}`} style={{ textAlign: "left", color: C.text, border: 0, background: "transparent", cursor: "pointer", width: "100%", padding: 4 }}>
              <strong>{b.title}</strong><span style={{ fontSize: 12, color: C.textMuted }}> · Revision {b.revision}{b.id === currentBrief?.id ? " · Open" : ""}</span>
            </button>
          </li>)}
        </ul>
      </section>}
      <p role="status" style={{ fontSize: 12, color: C.textMuted }}>{saveMessage || (currentBrief ? `Revision ${currentBrief.revision}${dirty ? " · Unsaved changes" : " · Saved"}` : dirty ? "Unsaved changes" : "New investigation")}</p>
      {saveError && <p role="alert" style={{ color: C.danger }}>{saveError}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, maxWidth: 760 }}>
        {/* 1. Idea */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16 }}>
          <div style={sectionLabel}>Idea</div>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
            <button onClick={() => { setMode("candidate"); setEvidenceReviewed(false); }} disabled={scored.length === 0} style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)",
              border: `1px solid ${mode === "candidate" ? C.accent : C.border}`,
              background: mode === "candidate" ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent",
              color: scored.length === 0 ? C.textDim : mode === "candidate" ? C.accent : C.textMuted,
              cursor: scored.length === 0 ? "not-allowed" : "pointer", opacity: scored.length === 0 ? 0.5 : 1,
            }}>Existing candidate</button>
            <button onClick={() => { setMode("manual"); setEvidenceReviewed(false); }} style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)",
              border: `1px solid ${mode === "manual" ? C.accent : C.border}`,
              background: mode === "manual" ? "color-mix(in srgb, var(--success) 8%, transparent)" : "transparent",
              color: mode === "manual" ? C.accent : C.textMuted, cursor: "pointer",
            }}>New idea</button>
          </div>

          {mode === "candidate" && !candidate && currentBrief && <p role="status">The linked candidate is no longer available. Its saved name and description are preserved.</p>}
          {mode === "candidate" ? (
            scored.length > 0 || currentBrief ? (
              <div>
                <label htmlFor="validate-candidate" style={labelStyle}>CANDIDATE</label>
                <select id="validate-candidate" value={candidateId} onChange={(e) => { setCandidateId(e.target.value); setEvidenceReviewed(false); }} style={{ ...inputStyle, cursor: "pointer" }}>
                  {!candidate && currentBrief && <option value={candidateId}>{ideaName} (unavailable)</option>}
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
                <input id="validate-idea-name" value={manualName} onChange={(e) => { setManualName(e.target.value); setEvidenceReviewed(false); }} placeholder="e.g. Slack weekly digest" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="validate-idea-desc" style={labelStyle}>DESCRIPTION (OPTIONAL)</label>
                <textarea id="validate-idea-desc" value={manualDesc} onChange={(e) => { setManualDesc(e.target.value); setEvidenceReviewed(false); }} rows={2} placeholder="What is it, in one or two sentences?" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
          )}
          {productContext?.productSummary && (
            <p style={{ fontSize: 10, color: C.textDim, margin: "12px 0 0", lineHeight: 1.5, fontFamily: "var(--mono)" }}>
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
            <div style={sectionLabel}>Attached evidence</div>
            <Pill color={C.blue} dimColor={C.blueDim} small>{attachedSignals.length} attached</Pill>
          </div>
          {missingSignals.map(s => <p key={s.id} role="status" style={{ color: C.warn, fontSize: 12 }}>Unavailable source: {s.title}. Saved details are retained; this source does not count as current evidence.</p>)}
          {currentBrief?.draft.evidenceReviewed && !evidenceReviewed && <p style={{ fontSize: 12, color: C.warn }}>Evidence review is pending. Check for changed sources or product context before drawing a conclusion.</p>}
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
                        {s.source && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "var(--mono)" }}>{s.source}</span>}
                        {s.theme && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "var(--mono)" }}>{s.theme}</span>}
                        {s.confidence_impact && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "var(--mono)" }}>{s.confidence_impact}</span>}
                        {s.linked_candidate_name && <span style={{ fontSize: 9, color: C.blue, fontFamily: "var(--mono)" }}>↳ {s.linked_candidate_name}</span>}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {attachedSignals.length > 0 && <label style={{ display: "flex", gap: 10, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
          <input type="checkbox" checked={evidenceReviewed} onChange={(e) => setEvidenceReviewed(e.target.checked)} />
          I have reviewed the sources, limitations, and conflicting signals and reflected them in my ratings. Attachment alone is not validation.
        </label>}

        {/* 4. Scorecard */}
        <section style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: 16 }}>
          <div style={sectionLabel}>Opportunity scorecard</div>
          <p style={{ fontSize: 11, color: C.textDim, margin: "6px 0 12px", lineHeight: 1.5 }}>Rate each assessed dimension 1 (weak) to 5 (strong). Leave unknown dimensions unassessed; select a rating again to clear it. Evidence strength is your judgment of quality, not the number of attached signals.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {VALIDATE_DIMENSIONS.map((d) => (
              <div key={d.key} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                <span style={{ flex: 1, fontSize: 12, color: C.text }}>{d.label}{scores[d.key] == null && <span style={{ display: "block", fontSize: 11, color: C.textMuted }}>Not assessed</span>}</span>
                <div role="group" aria-label={d.label} style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = scores[d.key] === n;
                    return (
                      <button key={n} onClick={() => setScore(d.key, active ? null : n)} aria-label={`${d.label}: ${n} of 5`} aria-pressed={active} style={{
                        width: 28, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--mono)",
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
            <Pill color={rec.color} dimColor={rec.color + "20"}>{average === null ? `${assessedCount}/7 assessed` : averageLabel}</Pill>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>{reason}</p>
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
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, lineHeight: 1.6, color: C.textMuted, fontFamily: "var(--mono)" }}>
            {briefText}
          </pre>
        </section>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 10 }}>
          {onSaveBrief && <button onClick={handleSaveBrief} disabled={!canSave || saving} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${C.accent}`, background: C.surface, color: C.text, fontSize: 12, cursor: !canSave || saving ? "not-allowed" : "pointer" }}>{saving ? "Saving…" : "Save brief"}</button>}
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            padding: "10px 18px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)",
            background: canSave && !saving ? C.accent : C.border,
            color: canSave && !saving ? C.bg : C.textDim,
            cursor: canSave && !saving ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span aria-hidden="true">⚖</span> {saving ? "Saving…" : onSaveBrief ? "Create Decision Draft" : "Save as Decision Draft"}
          </button>
        </div>
        {!canSave && (
          <p style={{ fontSize: 10, color: C.textDim, margin: "-6px 0 0", textAlign: "right", fontFamily: "var(--mono)" }}>
            Choose a candidate or name an idea to save.
          </p>
        )}
      </div>
      </fieldset>
    </div>
  );
};
