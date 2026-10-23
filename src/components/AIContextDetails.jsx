import { SCORING_FIELDS, CANDIDATE_QUESTIONS } from '../../lib/scoring-basis';
import { BRIEF_FIELDS } from '../../lib/scoring-context';
import { CLAIM_KINDS } from '../../lib/scoring-claims';

export function referenceLabel(reference, context) {
  if (!context) return 'Supplied context';
  const [kind, ...parts] = reference.split(':');
  const id = parts.join(':');
  if (kind === 'brief') return `Strategy Brief: ${BRIEF_FIELDS[id] || 'field'}`;
  if (kind === 'scoring') return id === 'rubric' ? 'Shared score definitions' : `Shared scoring basis: ${SCORING_FIELDS[id]?.label || id}`;
  if (kind === 'candidate') return `Candidate: ${[context.candidate, ...context.candidates].find(c => c?.id === id)?.name || 'unnamed candidate'}`;
  if (kind === 'signal') return `Signal: ${context.evidence.find(s => s.id === id)?.title || 'untitled signal'}`;
  if (kind === 'decision') return `Decision: ${context.decisions.find(d => d.id === id)?.title || 'untitled decision'}`;
  return 'Supplied context';
}

export function EvidenceReferences({ references = [], context }) {
  if (!references.length) return <p>No supplied evidence cited</p>;
  return <ul>{references.map((reference, index) => {
    const signal = reference.startsWith('signal:') && context?.evidence?.find(s => `signal:${s.id}` === reference);
    return <li key={`${reference}:${index}`}>{signal ? <details><summary style={{ cursor: 'pointer' }}>{referenceLabel(reference, context)}</summary><p style={{ whiteSpace: 'pre-wrap' }}>{signal.body}</p><p>Source: {signal.source || 'Origin not recorded'}</p></details> : referenceLabel(reference, context)}</li>;
  })}</ul>;
}

export function AIContextDetails({ context, showAssessments = true }) {
  if (!context) return null;
  const savedAssessments = context.decisions.filter(decision => decision.validationAssessment);
  return <div style={{ fontSize: 14, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
    {showAssessments && savedAssessments.length > 0 && <section aria-label="Saved validation assessments">
      <strong>Saved validation assessments</strong>
      <p>Calculated from saved briefs. Each count describes its decision snapshot.</p>
      <ul>{savedAssessments.map(decision => <li key={decision.id}>
        <strong>{decision.title || 'Untitled decision'}</strong> ({decision.status || 'status not supplied'})
        <p>Recorded assessment: {decision.validationAssessment.assessedCount}/{decision.validationAssessment.totalDimensions} dimensions assessed; {decision.validationAssessment.unassessedCount} not assessed.</p>
      </li>)}</ul>
    </section>}
    <details>
    <summary>Context used: {6 - context.missing.length}/6 brief fields · {context.evidence.length} linked signals</summary>
    <p>Missing: {context.missing.map(k => BRIEF_FIELDS[k]).join(', ') || 'No brief fields missing'}. Populated fields may still need evidence.</p>
    <dl>{Object.entries(context.brief).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt><strong>{BRIEF_FIELDS[key]}</strong></dt><dd style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{value}</dd></div>)}</dl>
    {context.scoring && <section aria-label="Shared scoring context"><strong>Shared scoring basis</strong><dl>{Object.entries(SCORING_FIELDS).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{context.scoring[key] || 'Not supplied'}</dd></div>)}</dl>
      <details><summary>Score definitions used</summary>{Object.entries(context.rubric).map(([key, anchors]) => <div key={key}><strong>{key}</strong><ul>{anchors.map(anchor => <li key={anchor.pos}>{anchor.pos} · {anchor.label}: {anchor.description}</li>)}</ul></div>)}</details>
    </section>}
    {context.candidate?.scoringBasis && <section aria-label="Candidate scoring answers"><strong>Candidate answers · user-supplied</strong><dl>{Object.entries(CANDIDATE_QUESTIONS).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{context.candidate.scoringBasis[key] || 'Unknown / not supplied'}</dd></div>)}</dl></section>}
    {context.candidate?.scoringBasis?.claims?.length > 0 && <section aria-label="Claims supplied to AI"><strong>Claims supplied to AI</strong><p>Reported facts are user assertions. Source availability and excerpt matching do not establish that a source proves a claim.</p><ul>{context.candidate.scoringBasis.claims.map(claim => <li key={claim.id}><strong>{claim.dimension} · {CLAIM_KINDS[claim.kind]}</strong><p>{claim.text}</p>{claim.origin === 'ai' && <p>Originally proposed by AI</p>}{claim.question && <p>Answer to: {claim.question}</p>}{claim.sources.length ? <ul>{claim.sources.map(source => <li key={source.signalId}>{referenceLabel(`signal:${source.signalId}`, context)} · {source.relation} · {source.status}{source.quote && <blockquote>{source.quote}</blockquote>}</li>)}</ul> : <p>No source linked</p>}</li>)}</ul></section>}
    {context.candidate && <p><strong>Candidate being assessed:</strong> {context.candidate.name}. {context.candidate.description}</p>}
    <details><summary>{context.candidates.length} competing candidates</summary><ul>{context.candidates.map(candidate => <li key={candidate.id}><strong>{candidate.name || 'Unnamed candidate'}</strong>{candidate.description && ` — ${candidate.description}`}</li>)}</ul></details>
    <details><summary>{context.evidence.length} linked signals</summary>{context.evidence.length === 0 ? <p>No linked customer evidence supplied.</p> : <ul>{context.evidence.map(signal => <li key={signal.id}><strong>{signal.title || 'Untitled signal'}</strong><p>{signal.body}</p><p>{signal.source && `Source: ${signal.source}. `}{signal.direction && `Recorded confidence effect: ${signal.direction}. `}{signal.candidateId ? `Candidate link: ${referenceLabel(`candidate:${signal.candidateId}`, context).replace('Candidate: ', '')}.` : 'Selected as a claim source; no candidate link.'}</p></li>)}</ul>}</details>
    <details><summary>{context.decisions.length} related recorded decisions</summary><p>These records may be drafts; they are not automatically approved roadmap commitments.</p><ul>{context.decisions.map(decision => <li key={decision.id}><strong>{decision.title || 'Untitled decision'}</strong> ({decision.status || 'status not supplied'})<p>{decision.rationale}</p>{decision.tradeoffs && <p>Tradeoffs: {decision.tradeoffs}</p>}{decision.expectedOutcome && <p>Expected outcome, not an observed result: {decision.expectedOutcome}</p>}</li>)}</ul></details>
    {context.omissions.map(notice => <p key={notice}>{notice === 'Long text shortened' ? 'Some longer descriptions were shortened to keep the AI request manageable.' : notice}</p>)}
    </details>
  </div>;
}
