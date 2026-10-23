import { useState } from 'react';
import { useC } from '../ThemeProvider';
import { CLAIM_KINDS, CLAIM_DIMENSIONS, MAX_CLAIMS, sourceStatus } from '../../lib/scoring-claims';

export function newScoringClaim(dimension = 'reach', text = '', kind = 'unclassified', extra = {}) {
  return { id: crypto.randomUUID(), dimension, text, kind, origin: 'user', question: '', sources: [], ...extra };
}

export function workspaceSignals(signals, workspaceId) {
  return signals.filter(s => s?.id && (!s.workspace_id || s.workspace_id === workspaceId));
}

function useControlStyle() {
  const C = useC();
  return { padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, font: 'inherit', width: '100%', minWidth: 0, boxSizing: 'border-box' };
}

export function ClaimSources({ sources, signals, onChange, label }) {
  const style = useControlStyle();
  return <div style={{ display: 'grid', gap: 8 }}>
    {sources.map((source, index) => {
      const signal = signals.find(s => s.id === source.signalId);
      const update = next => onChange(sources.map((s, i) => i === index ? { ...s, ...next } : s));
      return <div key={source.signalId} style={{ borderLeft: '2px solid currentColor', paddingLeft: 10 }}>
        <strong>{signal?.title || 'Source unavailable'}</strong>
        <label style={{ display: 'grid', gap: 4 }}>Source relationship
          <select aria-label={`Source relationship ${index + 1} for ${label}`} value={source.relation} onChange={e => update({ relation: e.target.value })} style={style}>
            <option value="supports">Supports claim</option><option value="conflicts">Conflicts with claim</option><option value="context">Background context</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>Verbatim excerpt (optional)
          <textarea aria-label={`Excerpt ${index + 1} for ${label}`} value={source.quote || ''} maxLength={700} rows={2} style={style} onChange={e => update({ quote: e.target.value })} />
        </label>
        <p role="status">{sourceStatus(source, signals)}. Linking a source does not verify the claim.</p>
        {signal && <details><summary>Read source</summary><p style={{ whiteSpace: 'pre-wrap' }}>{signal.body || 'No source body'}</p><p>{signal.source || 'Origin not recorded'}</p></details>}
        <button type="button" style={{ ...style, width: 'auto', cursor: 'pointer' }} onClick={() => onChange(sources.filter((_, i) => i !== index))}>Remove source</button>
      </div>;
    })}
    {sources.length < 3 && <label style={{ display: 'grid', gap: 4 }}>Link a Signal to this claim
      <select aria-label={`Evidence for ${label}`} value="" style={style} onChange={e => { if (e.target.value) onChange([...sources, { signalId: e.target.value, relation: 'context', quote: '' }]); }}>
        <option value="">Choose a Signal…</option>
        {signals.filter(s => !sources.some(source => source.signalId === s.id)).map(s => <option key={s.id} value={s.id}>{s.title || 'Untitled Signal'}</option>)}
      </select>
      {signals.length === 0 && <span>No Signals yet. Add research or observations in Signals, then link them here.</span>}
    </label>}
  </div>;
}

function ClaimEditor({ claim, index, signals, onChange, onRemove }) {
  const [open, setOpen] = useState(!claim.text);
  const C = useC(); const style = useControlStyle();
  const label = `claim ${index + 1}`;
  return <details open={open} onToggle={e => setOpen(e.currentTarget.open)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, overflowWrap: 'anywhere' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{claim.dimension} · {CLAIM_KINDS[claim.kind]} · {claim.text || 'New scoring claim'} · {claim.sources.length} source(s)</summary>
    <div style={{ display: 'grid', gap: 10, paddingTop: 10 }}>
      {claim.question && <p>Answer to: {claim.question}</p>}
      <label style={{ display: 'grid', gap: 4 }}>Scoring input
        <select aria-label={`Scoring input for ${label}`} style={style} value={claim.dimension} onChange={e => onChange({ ...claim, dimension: e.target.value })}>{CLAIM_DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}</select>
      </label>
      <label style={{ display: 'grid', gap: 4 }}>One scoring claim
        <textarea aria-label={`Claim ${index + 1}`} style={style} rows={2} value={claim.text} maxLength={700} onChange={e => onChange({ ...claim, text: e.target.value })} placeholder="One observation or estimate, including date, sample and segment where relevant" />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>Provenance
        <select aria-label={`Provenance for ${label}`} style={style} value={claim.kind} onChange={e => onChange({ ...claim, kind: e.target.value })}>{Object.entries(CLAIM_KINDS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select>
      </label>
      {claim.origin === 'ai' && <p>Originally proposed by AI. Changing its label is a human judgment.</p>}
      {claim.kind === 'fact' && !claim.sources.length && <p role="status">Reported fact · source missing. Add the observation or measurement that supports it.</p>}
      <ClaimSources sources={claim.sources} signals={signals} label={label} onChange={sources => onChange({ ...claim, sources })} />
      <button type="button" style={{ ...style, cursor: 'pointer' }} onClick={onRemove}>Remove claim</button>
    </div>
  </details>;
}

export function ScoringClaims({ claims = [], signals = [], onChange }) {
  const style = useControlStyle();
  return <section aria-label="Scoring claims and sources" style={{ fontSize: 12, lineHeight: 1.6, display: 'grid', gap: 10, minWidth: 0 }}>
    <strong>Scoring claims and sources</strong>
    <p style={{ margin: 0 }}>Record one claim at a time. A reported fact is your assertion; source links and AI review do not independently verify it. Keep forecasts and AI assumptions labeled. Include conflicting evidence.</p>
    {claims.map((claim, index) => <ClaimEditor key={claim.id} claim={claim} index={index} signals={signals} onChange={next => onChange(claims.map(c => c.id === claim.id ? next : c))} onRemove={() => onChange(claims.filter(c => c.id !== claim.id))} />)}
    <button type="button" style={{ ...style, cursor: 'pointer' }} disabled={claims.length >= MAX_CLAIMS} onClick={() => onChange([...claims, newScoringClaim()])}>Add scoring claim</button>
    {claims.length >= MAX_CLAIMS && <p>Up to {MAX_CLAIMS} claims per candidate. Edit or remove a claim to add another.</p>}
  </section>;
}

export function ScoringFollowUp({ followUp, dimension, claims, signals, onAdd }) {
  const [answer, setAnswer] = useState('');
  const [kind, setKind] = useState('estimate');
  const [sources, setSources] = useState([]);
  const style = useControlStyle();
  if (!followUp) return null;
  const answered = claims.some(c => c.question === followUp.question);
  return <section aria-label={`${dimension} follow-up`} style={{ display: 'grid', gap: 8, padding: 10, border: '1px solid currentColor', borderRadius: 8 }}>
    <strong>Question that could change this score</strong>
    <p style={{ margin: 0 }}>{followUp.question}</p><p style={{ margin: 0 }}>{followUp.whyItChangesScore}</p>
    {answered ? <p role="status">Answer added to the scoring basis. Request fresh suggestions to review it.</p> : <>
      <textarea aria-label={`Answer ${dimension} follow-up`} style={style} value={answer} rows={2} maxLength={700} placeholder="Answer what you know, with date, sample and segment. Keep uncertainty explicit." onChange={e => setAnswer(e.target.value)} />
      <select aria-label={`Provenance for ${dimension} answer`} style={style} value={kind} onChange={e => setKind(e.target.value)}><option value="estimate">User estimate</option><option value="fact">Reported fact</option><option value="unclassified">Unclassified</option></select>
      <ClaimSources sources={sources} signals={signals} label={`${dimension} answer`} onChange={setSources} />
      <button type="button" style={{ ...style, cursor: 'pointer', opacity: !answer.trim() || claims.length >= MAX_CLAIMS ? 0.5 : 1 }} disabled={!answer.trim() || claims.length >= MAX_CLAIMS} onClick={() => onAdd(newScoringClaim(dimension, answer.trim(), kind, { sources, question: followUp.question }))}>Add answer to scoring basis</button>
      {claims.length >= MAX_CLAIMS && <p>Edit an existing claim to record this answer; the candidate already has {MAX_CLAIMS} claims.</p>}
    </>}
  </section>;
}
