import { BRIEF_FIELDS } from '../../lib/scoring-context';

export function referenceLabel(reference, context) {
  if (!context) return 'Supplied context';
  const [kind, ...parts] = reference.split(':');
  const id = parts.join(':');
  if (kind === 'brief') return `Strategy Brief: ${BRIEF_FIELDS[id] || 'field'}`;
  if (kind === 'candidate') return `Candidate: ${[context.candidate, ...context.candidates].find(c => c?.id === id)?.name || 'unnamed candidate'}`;
  if (kind === 'signal') return `Signal: ${context.evidence.find(s => s.id === id)?.title || 'untitled signal'}`;
  if (kind === 'decision') return `Decision: ${context.decisions.find(d => d.id === id)?.title || 'untitled decision'}`;
  return 'Supplied context';
}

export function AIContextDetails({ context }) {
  if (!context) return null;
  return <details style={{ fontSize: 12, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
    <summary>Context available: {6 - context.missing.length}/6 brief fields · {context.evidence.length} linked signals</summary>
    <p>Missing: {context.missing.map(k => BRIEF_FIELDS[k]).join(', ') || 'No brief fields missing'}. Populated fields may still need evidence.</p>
    <dl>{Object.entries(context.brief).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt><strong>{BRIEF_FIELDS[key]}</strong></dt><dd style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{value}</dd></div>)}</dl>
    {context.candidate && <p><strong>Candidate being assessed:</strong> {context.candidate.name}. {context.candidate.description}</p>}
    <details><summary>{context.candidates.length} competing candidates</summary><ul>{context.candidates.map(candidate => <li key={candidate.id}><strong>{candidate.name || 'Unnamed candidate'}</strong>{candidate.description && ` — ${candidate.description}`}</li>)}</ul></details>
    <details><summary>{context.evidence.length} linked signals</summary>{context.evidence.length === 0 ? <p>No linked customer evidence supplied.</p> : <ul>{context.evidence.map(signal => <li key={signal.id}><strong>{signal.title || 'Untitled signal'}</strong><p>{signal.body}</p><p>{signal.source && `Source: ${signal.source}. `}{signal.direction && `Recorded confidence effect: ${signal.direction}. `}Linked to {referenceLabel(`candidate:${signal.candidateId}`, context).replace('Candidate: ', '')}.</p></li>)}</ul>}</details>
    <details><summary>{context.decisions.length} related recorded decisions</summary><p>These records may be drafts; they are not automatically approved roadmap commitments.</p><ul>{context.decisions.map(decision => <li key={decision.id}><strong>{decision.title || 'Untitled decision'}</strong> ({decision.status || 'status not supplied'}){decision.validationAssessment && <p>Recorded assessment: {decision.validationAssessment.assessedCount}/{decision.validationAssessment.totalDimensions} dimensions assessed; {decision.validationAssessment.unassessedCount} not assessed. These counts come from the saved brief, not the generated reasoning.</p>}<p>{decision.rationale}</p>{decision.tradeoffs && <p>Tradeoffs: {decision.tradeoffs}</p>}{decision.expectedOutcome && <p>Expected outcome, not an observed result: {decision.expectedOutcome}</p>}</li>)}</ul></details>
    {context.omissions.map(notice => <p key={notice}>{notice === 'Long text shortened' ? 'Some longer descriptions were shortened to keep the AI request manageable.' : notice}</p>)}
  </details>;
}
