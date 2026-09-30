import { BRIEF_FIELDS } from '../../lib/scoring-context';
export function AIContextDetails({ context }) {
  if (!context) return null;
  return <details style={{ fontSize: 12, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
    <summary>Context used: {6 - context.missing.length}/6 brief fields · {context.evidence.length} linked signals</summary>
    <p>Missing: {context.missing.map(k => BRIEF_FIELDS[k]).join(', ') || 'No brief fields missing'}. Populated fields may still need evidence.</p>
    <p>{context.candidates.length} competing candidates; {context.decisions.length} related recorded decisions. These are not approved roadmap commitments.</p>
    {context.omissions.map(x => <p key={x}>{x}</p>)}
    <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto' }}>{JSON.stringify(context, null, 2)}</pre>
  </details>;
}
