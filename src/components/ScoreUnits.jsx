import { useC } from '../ThemeProvider';
import { CLAIM_KINDS } from '../../lib/scoring-claims';
import { scoreBand, selectedBasisClaim } from '../../lib/scoring-units';

// Keep the recorded claim as the authority: display its words, never parse a
// second numeric estimate from prose or choose a claim on the user's behalf.
export function ScoreUnits({ dimension, value, settings, basis }) {
  const C = useC();
  const band = scoreBand(dimension, value, settings);
  const claim = selectedBasisClaim(dimension, basis);
  const preview = claim?.text.length > 150 ? `${claim.text.slice(0, 147)}…` : claim?.text;
  return <div className="tz-score-units" style={{ fontSize: 14, lineHeight: 1.5, margin: '10px 0', overflowWrap: 'anywhere' }}>
    <p style={{ margin: 0 }}><strong>{band ? `${band.label} band` : 'Custom score'}</strong>{band ? ` · ${band.description}` : ' · Between defined bands; no band definition applies.'}</p>
    {dimension === 'confidence' && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textMuted }}>Evidence strength, not a probability of success.</p>}
    {claim ? <details className="tz-recorded-basis" style={{ marginTop: 8 }}>
      <summary style={{ cursor: 'pointer' }}>
        <span style={{ display: 'block', color: C.textMuted, fontSize: 13 }}>Recorded basis · {CLAIM_KINDS[claim.kind] || 'Unclassified'}{claim.origin === 'ai' && ' · Originally AI'}</span>
        <span style={{ display: 'block' }}>{preview || 'Claim text is empty'}</span>
        <span style={{ display: 'block', color: C.textMuted, fontSize: 13 }}>Read full claim & caveats</span>
      </summary>
      <p style={{ whiteSpace: 'pre-wrap' }}>{claim.text || 'No claim text recorded.'}</p>
      <p style={{ color: C.textMuted, fontSize: 13 }}>{claim.sources?.length || 0} linked {claim.sources?.length === 1 ? 'source' : 'sources'}. Selecting a basis does not verify it or establish that the score fits. Review sources and conflicting evidence below.</p>
    </details> : <p style={{ margin: '8px 0 0', fontSize: 13, color: C.textMuted }}>No recorded basis selected. Add or choose a claim; the score alone does not supply a quantity.</p>}
  </div>;
}
