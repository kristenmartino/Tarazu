import { useC } from '../ThemeProvider';
import { Slider } from './Slider';
import { EvidenceReferences } from './AIContextDetails';
import { ScoringFollowUp } from './ScoringClaims';
import { CLAIM_KINDS, MAX_CLAIMS } from '../../lib/scoring-claims';
import { newScoringClaim } from './ScoringClaims';
import { findFollowUpAnswer, answeredClaimsForInput } from '../../lib/scoring-follow-ups';
import { ScoreUnits } from './ScoreUnits';

const REVIEW_LABELS = { supported: 'Appears supported', conflicting: 'Conflicting evidence', source_missing: 'Source missing or unusable', assumption: 'Unverified assumption', needs_review: 'Needs review' };
const PURPOSES = { reach: 'Share of the audience affected', impact: 'Benefit for each affected user', confidence: 'Strength of the supporting evidence', effort: 'Total work across the team' };
const title = value => value[0].toUpperCase() + value.slice(1);

export function ScoreCard({ dimension, value, onChange, result, loading, stale, accepted, onAccept, context, claims, signals, onAddClaim, settings, basis, onBasisClaimChange }) {
  const C = useC();
  const label = title(dimension);
  const sourceCount = new Set(claims.filter(c => (dimension === 'confidence' ? ['reach', 'impact', 'confidence'].includes(c.dimension) : c.dimension === dimension)).flatMap(c => c.sources.map(s => s.signalId))).size;
  const conflicts = result?.claimReviews?.filter(r => r.status === 'conflicting').length || 0;
  const answered = result?.followUp && findFollowUpAnswer(result.followUp, dimension, claims);
  const recorded = result?.followUpResolution?.status === 'answered' ? result.followUpResolution : result?.followUpResolution ? null : answered || (!result?.followUp && answeredClaimsForInput(dimension, claims)[0]);
  const hasScore = Number.isInteger(result?.score);
  const buttonStyle = { padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, font: 'inherit', cursor: 'pointer' };
  return <section className="tz-scoring-card" aria-label={`${label} score`} style={{ borderTop: `3px solid ${C[dimension] || C.accent}`, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderRadius: 8, padding: 16, background: C.bg, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}><div style={{ minWidth: 0 }}><h3 style={{ fontSize: 17, margin: 0 }}>{label}</h3><p style={{ margin: '4px 0 12px', fontSize: 13, color: C.textMuted }}>{PURPOSES[dimension]}</p></div><div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 110 }}><span style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)' }}>{value}</span><span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>Current band score /100</span></div></div>
    <Slider label={label} value={value} onChange={onChange} color={C[dimension] || C.accent} />
    <ScoreUnits dimension={dimension} value={value} settings={settings} basis={basis} />
    <details style={{ fontSize: 13, marginTop: 8 }}><summary style={{ cursor: 'pointer' }}>Choose recorded basis</summary>
      <label style={{ display: 'grid', gap: 5, paddingTop: 6 }}>Claim for {dimension}
        <select aria-label={`Recorded basis for ${dimension}`} value={basis?.basisClaimIds?.[dimension] || ''} onChange={event => onBasisClaimChange(event.target.value)} style={{ ...buttonStyle, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <option value="">No claim selected</option>
          {claims.filter(claim => claim.dimension === dimension).map(claim => <option key={claim.id} value={claim.id}>{CLAIM_KINDS[claim.kind]} · {claim.text ? claim.text.length > 100 ? `${claim.text.slice(0, 97)}…` : claim.text : 'Empty claim'}</option>)}
        </select>
      </label>
      <p style={{ marginBottom: 0 }}>Choose an existing {dimension} claim. Add or edit claims below; save the candidate to keep this selection.</p>
    </details>
    <p style={{ fontSize: 13, margin: '12px 0 8px', color: conflicts ? C.danger : C.textMuted }}>{conflicts ? `${conflicts} conflicting claim review${conflicts === 1 ? '' : 's'}` : sourceCount ? `${sourceCount} source${sourceCount === 1 ? '' : 's'} linked to claims` : 'No claim sources linked'}</p>
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, fontSize: 14, lineHeight: 1.5 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{loading ? 'AI review in progress…' : !result ? 'AI has not reviewed this score' : stale ? `Previous AI ${hasScore ? `${result.score}/100` : 'review'} · needs refresh` : accepted ? `AI ${result.score}/100 · accepted in draft` : hasScore ? `AI suggests ${result.score}/100` : 'AI needs more information'}</p>
      {hasScore && <button type="button" style={{ ...buttonStyle, opacity: stale || loading || accepted ? 0.55 : 1 }} disabled={stale || loading || accepted} onClick={onAccept}>{accepted ? `${label} suggestion accepted` : `Accept ${dimension} suggestion`}</button>}
      {recorded && <p role="status" style={{ margin: '10px 0', fontSize: 13 }}>{result?.followUpResolution?.status === 'answered' ? 'Answer already supplied; original uncertainty retained.' : recorded.kind === 'fact' && recorded.sources?.length ? 'Answer recorded; source still needs review.' : 'Answer recorded; measured evidence still needed.'}{stale && ' Refresh AI to review the new answer.'}</p>}
      {result && <details style={{ marginTop: 12 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{result.followUp && !answered ? 'Review reasoning & next question' : 'Review reasoning & evidence'}</summary><div style={{ paddingTop: 8 }}>
        <p>{result.justification}</p>
        <strong>Sources used</strong><EvidenceReferences references={result.evidence} context={context} />
        {!!result.claimReviews?.length && <details><summary>AI review of {result.claimReviews.length} claims</summary><p>AI interpretation; claim types stay as recorded.</p><ul>{result.claimReviews.map(review => {
          const claim = context?.candidate?.scoringBasis?.claims?.find(c => c.id === review.claimId);
          return <li key={review.claimId}><strong>{CLAIM_KINDS[claim?.kind] || 'Unclassified'} · {claim?.text || 'Claim unavailable'}</strong><p>{REVIEW_LABELS[review.status]}: {review.explanation}</p><EvidenceReferences references={review.evidence} context={context} /></li>;
        })}</ul></details>}
        {!!result.assumptions?.length && <details><summary>AI assumptions · {result.assumptions.length} unverified</summary><ul>{result.assumptions.map((assumption, index) => <li key={index}><p>{assumption}</p><button type="button" style={buttonStyle} disabled={claims.length >= MAX_CLAIMS || claims.some(c => c.origin === 'ai' && c.text === assumption)} onClick={() => onAddClaim(newScoringClaim(dimension, assumption, 'ai_assumption', { origin: 'ai' }))}>Add as AI assumption</button></li>)}</ul><p>Adding an assumption changes this draft. Save to keep it.</p></details>}
        {!!result.gaps?.length && <p><strong>Still unknown:</strong> {result.gaps.join('; ')}</p>}
        <ScoringFollowUp key={`${dimension}:${result.followUp?.question}`} followUp={result.followUp} resolution={result.followUpResolution} dimension={dimension} claims={claims} signals={signals} onAdd={onAddClaim} />
      </div></details>}
      {result && <p style={{ margin: '10px 0 0', fontSize: 14 }}>{result.nextAction}</p>}
      {!result && <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>Adjust manually or ask AI to review the supplied context.</p>}
    </div>
  </section>;
}
