import Link from "next/link";

// The prepared fictional story, not a generated recommendation or live record.
export function RelayDecisionPreview({ compact = false }) {
  const Heading = compact ? "h2" : "h3";
  return <article className={`relay-preview${compact ? " relay-preview-compact" : ""}`} aria-label={compact ? "Fictional Relay decision preview" : "Fictional Relay worked decision"}>
    <div className="relay-preview-top"><strong>Relay · fictional example</strong><span className="relay-draft">Draft</span></div>
    <div className="relay-preview-body">
      {!compact && <p className="relay-preview-meta">Saved decision · Round B</p>}
      <Heading>{compact ? "Test a readiness checklist" : "Test a readiness checklist first"}</Heading>
      <dl className="relay-preview-beats">
        {compact ? <>
          <div><dt>Chosen action</dt><dd>Test request readiness before a reminder-only build.</dd></div>
          <div><dt>Evidence change</dt><dd>Four of five invented overdue cases lacked documents.</dd></div>
          <div><dt>Next test</dt><dd>Try a paper checklist before committing to software.</dd></div>
        </> : <>
          <div><dt>The choice</dt><dd>Test a paper readiness checklist before committing engineering time.</dd></div>
          <div><dt>What changed</dt><dd>Four of five invented overdue cases lacked required documents; one was overlooked. This made readiness worth testing before a reminder-only build.</dd></div>
          <div><dt>Next test</dt><dd>Try the paper checklist with five hypothetical requesters; observe missing owner, due date and documents. Planned review: October 30, 2026.</dd></div>
        </>}
      </dl>
      <p className="relay-preview-caveat">{compact ? "Fictional evidence. Effectiveness remains unknown." : "Fictional evidence. Small sample; effectiveness and prevalence remain unknown. No real participants or results are represented."}</p>
    </div>
    <div className="relay-preview-bottom">
      {!compact && <p>The choice keeps the evidence and tradeoffs attached.</p>}
      <Link href="/demo">Explore this decision <span aria-hidden="true">→</span></Link>
    </div>
  </article>;
}
