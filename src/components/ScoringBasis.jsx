import { useC } from '../ThemeProvider';
import { SCORING_FIELDS, CANDIDATE_QUESTIONS, normalizeScoringSettings, scoringRubric } from '../../lib/scoring-basis';
import { ScoringClaims } from './ScoringClaims';

function BasisField({ label, value, placeholder, onChange, maxLength = 700 }) {
  const C = useC();
  return <label style={{ display: 'grid', gap: 5, fontSize: 14, color: C.textMuted }}>
    <span>{label}</span>
    <textarea aria-label={label} value={value || ''} placeholder={placeholder} maxLength={maxLength} rows={2} onChange={event => onChange(event.target.value)}
      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, font: 'inherit', resize: 'vertical' }} />
  </label>;
}

export function SharedScoringBasis({ settings, onChange }) {
  const C = useC();
  const value = normalizeScoringSettings(settings);
  const rubric = scoringRubric(value);
  return <details style={{ fontSize: 14, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Shared score definitions</summary>
    <p>Set once for this workspace. Compare candidates against the same audience, period and score definitions. Changes apply to future suggestions; review existing scores separately.</p>
    <div style={{ display: 'grid', gap: 10 }}>
      {Object.entries(SCORING_FIELDS).map(([key, field]) => <BasisField key={key} {...field} value={value[key]} onChange={next => onChange({ ...value, [key]: next })} />)}
    </div>
    <p>Effort defaults to total person-days across product, design, engineering and testing. Capacity and calendar deadlines belong in Constraints.</p>
    {['reach', 'confidence'].map(dimension => <div key={dimension}><strong style={{ textTransform: 'capitalize' }}>{dimension} score definitions</strong><ul>{rubric[dimension].map(anchor => <li key={anchor.pos}>{anchor.pos} · {anchor.label}: {anchor.description}</li>)}</ul></div>)}
    <details>
      <summary style={{ cursor: 'pointer' }}>Impact and effort · view or customize</summary>
      <p>Keep these definitions consistent across this workspace. Add metric-specific impact examples or adjust effort ranges to match your team. Blank definitions use the displayed defaults.</p>
      {['impact', 'effort'].map(dimension => <fieldset key={dimension} style={{ border: 0, padding: 0, margin: '12px 0', display: 'grid', gap: 8, minWidth: 0 }}>
        <legend style={{ textTransform: 'capitalize', fontWeight: 600 }}>{dimension} score definitions</legend>
        {rubric[dimension].map(anchor => <BasisField key={anchor.pos} label={`${dimension === 'impact' ? 'Impact' : 'Effort'} ${anchor.pos} · ${anchor.label}`} value={value[`${dimension}Bands`][anchor.pos]} placeholder={anchor.description} maxLength={400}
          onChange={next => onChange({ ...value, [`${dimension}Bands`]: { ...value[`${dimension}Bands`], [anchor.pos]: next } })} />)}
      </fieldset>)}
    </details>
  </details>;
}

export function CandidateScoringBasis({ basis, onChange, signals = [] }) {
  return <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10, minWidth: 0 }}>
    <legend style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>What supports this candidate?</legend>

    <ScoringClaims claims={basis.claims} signals={signals} onChange={claims => onChange({ ...basis, claims })} />
    <details><summary>Background answers</summary><p>Optional context for AI. Record specific observations or estimates as claims above.</p>
    {Object.entries(CANDIDATE_QUESTIONS).map(([key, field]) => <BasisField key={key} {...field} value={basis[key]} maxLength={1400} onChange={next => onChange({ ...basis, [key]: next })} />)}
    </details>
    <details style={{ fontSize: 13 }}><summary>How claim types and sources work</summary><p>A reported fact is a user assertion, not independent verification. A matching excerpt confirms the wording appears in the source; it does not establish that the source proves the claim. Keep forecasts and AI assumptions labeled, and include conflicting evidence.</p></details>
  </fieldset>;
}
