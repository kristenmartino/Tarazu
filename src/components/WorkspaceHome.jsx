import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useC } from "../ThemeProvider";
import { getTier } from "../utils";
import { Pill } from "./Pill";
import { OnboardingPanel } from "./OnboardingPanel";
import { trackUsage } from "../../lib/usage-events";
import { RelayStory, hasRelayStory, relayStoryDecision } from "./RelayStory";

const StatCard = ({ label, value, color }) => {
  const C = useC();
  return (
  <div style={{ flex: 1, minWidth: 100, padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface }}>
    <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>{label}</span>
    <p style={{ fontSize: 22, fontWeight: 800, color: color || C.text, margin: "4px 0 0", fontFamily: "var(--mono)" }}>{value}</p>
  </div>
  );
};

const ShortcutButton = ({ label, icon, color, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, minWidth: 120, padding: "14px 16px", border: `1px solid ${color}30`, borderRadius: 10,
    background: `${color}08`, color, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "var(--mono)", transition: "all 0.2s",
    display: "flex", alignItems: "center", gap: 8,
  }}
    onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
    onMouseLeave={e => e.currentTarget.style.background = `${color}08`}>
    {icon}
    {label}
  </button>
);

export const WorkspaceHome = ({ scored, decisions, signals, activeWs, onScreenChange, onLoadSamples, onAddCandidate, isSignedIn, onInspectCandidate, onOpenDecision, onStoryActiveChange, guestDemo = false }) => {
  const C = useC();
  const [storyStep, setStoryStep] = useState(null);
  const startButton = useRef(null);
  const storyOpened = useRef(false);
  useEffect(() => { if (storyStep === null && storyOpened.current) startButton.current?.focus(); }, [storyStep]);

  const avgConfidence = useMemo(() => {
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((s, f) => s + f.confidence, 0) / scored.length);
  }, [scored]);

  const topCandidate = useMemo(() => {
    if (scored.length === 0) return null;
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    return sorted[0];
  }, [scored]);

  const needsValidation = useMemo(() =>
    scored.filter(f => f.confidence < 50).sort((a, b) => a.confidence - b.confidence).slice(0, 3),
  [scored]);

  const recentDecisions = useMemo(() =>
    decisions.filter(d => d.status !== "archived").sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 3),
  [decisions]);

  const topTier = topCandidate ? getTier(topCandidate, C) : null;
  const isRelayDemo = hasRelayStory({ guestDemo, activeWs, decisions });
  const storyActive = isRelayDemo && storyStep !== null;
  useEffect(() => {
    onStoryActiveChange?.(storyActive);
    return () => { if (storyActive) onStoryActiveChange?.(false); };
  }, [storyActive, onStoryActiveChange]);
  const startReview = (step = 0) => { if (isRelayDemo) { trackUsage("walkthrough_started", guestDemo ? "demo" : "personal"); storyOpened.current = true; setStoryStep(step); } else onScreenChange("priorities"); };

  const statusColor = (s) => {
    switch (s) {
      case "approved": return C.accent;
      case "rejected": return C.danger;
      case "reviewing": return C.blue;
      default: return C.textDim;
    }
  };

  if (isRelayDemo && storyStep !== null) return <RelayStory savedDecisionAvailable={Boolean(relayStoryDecision(decisions))} step={storyStep} onStep={setStoryStep} onClose={() => setStoryStep(null)} onInspectCandidate={onInspectCandidate} onScreenChange={onScreenChange} onOpenDecision={() => onOpenDecision ? onOpenDecision() : onScreenChange("decisions")} />;

  return (
    <div role="main" id="main-content" tabIndex={-1} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{activeWs?.name || "Workspace"}</h2>
        <Pill color={C.textMuted} dimColor={C.border} small>HOME</Pill>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {scored.length === 0 && (
          <OnboardingPanel guestDemo={guestDemo} onAddCandidate={onAddCandidate} onLoadSamples={onLoadSamples} isSignedIn={isSignedIn} />
        )}
        {scored.length > 0 && <section aria-label="Decision walkthrough" style={{ padding: "22px 20px", borderLeft: `3px solid ${C.brass || C.accent}`, background: C.surface, borderRadius: 8 }}>
          {isRelayDemo && <Pill color={C.warn} dimColor={C.warn + "20"} small>Fictional demo</Pill>}
          <h3 style={{ fontSize: 25, lineHeight: 1.25, letterSpacing: "-0.025em", margin: "12px 0", maxWidth: 630 }}>{isRelayDemo ? "One engineer, two weeks—which option should we test first?" : "Make your next product decision easier to defend."}</h3>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: C.textMuted, margin: "0 0 18px", maxWidth: 650 }}>{isRelayDemo ? "Follow a short, read-only story: the problem, conflicting evidence, a draft choice, and the next test. Explore the full records when you want more detail." : "Compare your options, inspect the evidence behind the scores, and save the reasoning you want to return to."}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button ref={startButton} onClick={() => startReview()} style={{ padding: "10px 16px", border: 0, borderRadius: 7, background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{isRelayDemo ? "Start the decision walkthrough" : "Review your priorities"}</button>
            <button onClick={() => onScreenChange("validate")} style={{ padding: "10px 16px", border: `1px solid ${C.border}`, borderRadius: 7, background: "transparent", color: C.text, fontSize: 14, cursor: "pointer" }}>Continue a validation brief</button>
          </div>
          <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 12, padding: "18px 0 0", margin: 0, listStyle: "none" }}>
            {[["1. Inspect the assumption", "priorities"], ["2. Find conflicting evidence", "signals"], ["3. Compare what to test", "priorities"], ["4. Reopen saved reasoning", "decisions"]].map(([label, route]) => <li key={label}><button onClick={() => isRelayDemo ? startReview(Number(label[0])-1) : onScreenChange(route)} style={{ background: "transparent", border: 0, borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, lineHeight: 1.5, textAlign: "left", padding: "8px 0", cursor: "pointer", width: "100%" }}>{label}</button></li>)}
          </ol>
        </section>}
        {guestDemo && <section aria-label="Use Tarazu for your own decision" style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px", background: C.surface }}>
          <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>Ready to work on your own decision?</h3>
          <p style={{ margin: "0 0 12px", color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>Start with a blank candidate, add your context and evidence, then save your reasoning. You can work in this browser without an account. <Link href="/sign-in?start=decision" style={{ color: C.accent }}>Sign in first</Link> if you want cloud saving and AI. The Relay example stays separate; nothing is copied into your workspace.</p>
          <Link href="/app?start=decision" style={{ color: C.accent, fontWeight: 600, fontSize: 14 }}>Start your own decision →</Link>
        </section>}
        {/* Supporting workspace context */}
        {scored.length > 0 && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="CANDIDATES" value={scored.length} color={C.accent} />
          <StatCard label="AVG CONFIDENCE" value={`${avgConfidence}/100`} color={avgConfidence >= 70 ? C.accent : avgConfidence >= 50 ? C.blue : C.warn} />
          <StatCard label="DECISIONS" value={decisions.filter(d => d.status !== "archived").length} color={C.purple} />
          <StatCard label="SIGNALS" value={signals.length} color={C.blue} />
        </div>}

        {/* Top candidate */}
        {topCandidate && (
          <div style={{ padding: 16, border: `1px solid ${topTier.color}20`, borderRadius: 10, background: `${topTier.color}08` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>HIGHEST RICE SCORE</span>
              <Pill color={topTier.color} dimColor={topTier.color + "20"} small>{topTier.label === "QUICK WIN" && topCandidate.confidence < 50 ? "POTENTIAL QUICK WIN" : topTier.label}</Pill>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>{topCandidate.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: topTier.color, fontFamily: "var(--mono)" }}>{topCandidate.score.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "var(--mono)" }}>R:{topCandidate.reach} I:{topCandidate.impact} C:{topCandidate.confidence} E:{topCandidate.effort}</span>
            </div>
          </div>
        )}

        {/* Needs validation */}
        {needsValidation.length > 0 && (
          <div style={{ padding: 16, border: `1px solid color-mix(in srgb, var(--warning) 13%, transparent)`, borderRadius: 10, background: "color-mix(in srgb, var(--warning) 3%, transparent)" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.warn, letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>NEEDS VALIDATION</span>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "6px 0 12px", lineHeight: 1.5 }}>Low confidence means the ranking needs more evidence before a build commitment.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {needsValidation.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.warn, fontFamily: "var(--mono)" }}>C:{f.confidence}</span>
                </div>
              ))}
            </div>
            {scored.filter(f => f.confidence < 50).length > 3 && (
              <button onClick={() => onScreenChange("priorities")} style={{ marginTop: 8, padding: "4px 10px", border: `1px solid color-mix(in srgb, var(--warning) 19%, transparent)`, borderRadius: 6, background: "transparent", color: C.warn, fontSize: 10, cursor: "pointer", fontFamily: "var(--mono)" }}>
                View all {scored.filter(f => f.confidence < 50).length} candidates
              </button>
            )}
          </div>
        )}

        {/* Recent decisions */}
        {recentDecisions.length > 0 && (
          <div style={{ padding: 16, border: `1px solid ${C.purple}20`, borderRadius: 10, background: `${C.purple}08` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>RECENT DECISIONS</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {recentDecisions.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.title}</span>
                  <Pill color={statusColor(d.status)} dimColor={statusColor(d.status) + "20"} small>{(d.status || "draft").toUpperCase()}</Pill>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ShortcutButton label="Priorities" color={C.accent} onClick={() => onScreenChange("priorities")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          } />
          <ShortcutButton label="Validate" color={C.purple} onClick={() => onScreenChange("validate")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5H5v16h14V5h-4M9 3h6v4H9zM9 14l2 2 4-4"/></svg>
          } />
          <ShortcutButton label="Signals" color={C.blue} onClick={() => onScreenChange("signals")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20h4V10H4z"/><path d="M10 20h4V4h-4z"/><path d="M16 20h4v-8h-4z"/></svg>
          } />
          <ShortcutButton label="Decisions" color={C.purple} onClick={() => onScreenChange("decisions")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>
          } />
          <ShortcutButton label="Scenarios" color={C.warn} onClick={() => onScreenChange("scenarios")} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg>
          } />
        </div>
      </div>
    </div>
  );
};
