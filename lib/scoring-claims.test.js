import { it, expect } from 'vitest';
import { normalizeCandidateBasis } from './scoring-basis';
import { candidateBasisSchema } from './scoring-basis-validation';
import { buildScoringContext, contextReferences } from './scoring-context';
import { scoringResponseSchema } from './scoring-review-validation';
import { sourceStatus } from './scoring-claims';

const claim = { id: 'c1', dimension: 'reach', text: '30 of 100 accounts', kind: 'estimate', origin: 'user', sources: [{ signalId: 's1', relation: 'supports', quote: '30 accounts' }] };
const signal = { id: 's1', workspace_id: 'w', title: 'Pilot note', body: 'We observed 30   accounts in the pilot.' };
const context = input => buildScoringContext({ workspaceId: 'w', featureName: 'Reminders', scoringBasis: { reach: 'Legacy narrative', claims: [claim] }, signals: [signal], ...input });
const result = { score: 35, justification: 'Segment from a planning estimate.', evidence: ['signal:s1'], assumptions: [], gaps: [], nextAction: 'Verify pilot coverage', claimReviews: [{ claimId: 'c1', status: 'supported', explanation: 'The pilot note describes 30 accounts; population still needs verification.', evidence: ['signal:s1'] }], followUp: { question: 'Did the pilot cover the full 100-account target population?', whyItChangesScore: 'Different population coverage could move reach into a different audience-share band.', claimIds: ['c1'] } };
const parse = (value, ctx = context()) => scoringResponseSchema(['reach'], contextReferences(ctx), ctx).safeParse({ reach: value }).success;

it('preserves provenance, sources, AI origin and old narrative without upgrading labels', () => {
  const basis = normalizeCandidateBasis({ reach: 'Legacy narrative', claims: [{ ...claim, kind: 'ai_assumption', origin: 'ai', question: 'How many accounts?' }] });
  expect(basis.reach).toBe('Legacy narrative');
  expect(basis.claims[0]).toMatchObject({ kind: 'ai_assumption', origin: 'ai', question: 'How many accounts?', sources: claim.sources });
  expect(normalizeCandidateBasis({ claims: [{ ...claim, kind: 'verified' }] }).claims[0].kind).toBe('unclassified');
});

it('rejects ambiguous IDs, unsupported labels and oversized writes', () => {
  for (const claims of [[claim, claim], [{ ...claim, kind: 'verified' }], [{ ...claim, text: 'a'.repeat(701) }], [{ ...claim, sources: [...claim.sources, ...claim.sources] }], Array.from({ length: 13 }, (_, i) => ({ ...claim, id: String(i) }))]) {
    expect(candidateBasisSchema.safeParse({ claims }).success).toBe(false);
  }
  expect(candidateBasisSchema.safeParse({ claims: [claim] }).success).toBe(true);
});

it('resolves explicitly selected sources for unsaved candidates and checks excerpts without claiming proof', () => {
  const c = context();
  expect(c.evidence.map(s => s.id)).toEqual(['s1']);
  expect(c.candidate.scoringBasis.claims[0].sources[0].status).toBe('Excerpt matches source');
  expect(sourceStatus({ signalId: 's1', quote: '300 accounts' }, [signal])).toBe('Excerpt not found in source');
  expect(sourceStatus({ signalId: 's1' }, [signal])).toBe('Source linked · no excerpt');
  expect(sourceStatus({ signalId: 'missing' }, [signal])).toBe('Source unavailable');
});

it('keeps missing and foreign source links visible but never supplies their contents', () => {
  const c = context({ signals: [{ ...signal, workspace_id: 'foreign' }] });
  expect(c.evidence).toEqual([]);
  expect(c.candidate.scoringBasis.claims[0].sources[0]).toMatchObject({ signalId: 's1', status: 'Source unavailable' });
  expect(contextReferences(c)).not.toContain('signal:s1');
});

it('deduplicates shared sources and prioritizes explicit links under the context cap', () => {
  const c = context({ candidateId: 'saved', signals: [...Array.from({ length: 45 }, (_, i) => ({ id: `s${i + 2}`, linked_candidate_id: 'saved' })), signal, signal], scoringBasis: { claims: [claim, { ...claim, id: 'c2' }] } });
  expect(c.evidence).toHaveLength(40);
  expect(c.evidence.filter(s => s.id === 's1')).toHaveLength(1);
  expect(c.evidence[0].id).toBe('s1');
  expect(c.omissions).toContain('6 signals omitted');
});

it('bounds competing claim context for the advisor and includes explicit source links', () => {
  const c = buildScoringContext({ workspaceId: 'w', features: Array.from({ length: 60 }, (_, i) => ({ id: `f${i}`, scoringBasis: { claims: Array.from({ length: 12 }, (_, j) => ({ ...claim, id: `c${j}` })) } })), signals: [signal] });
  expect(c.candidates.flatMap(f => f.scoringBasis.claims)).toHaveLength(24);
  expect(c.evidence[0].id).toBe('s1');
  expect(c.omissions.some(s => s.includes('scoring claims omitted'))).toBe(true);
});

it('accepts a source-linked estimate review and targeted question without changing its provenance', () => {
  expect(parse(result)).toBe(true);
  expect(context().candidate.scoringBasis.claims[0].kind).toBe('estimate');
});

it('rejects unknown claims, invented sources, omitted reviews and source-free support', () => {
  expect(parse({ ...result, claimReviews: [] })).toBe(false);
  expect(parse({ ...result, claimReviews: [{ ...result.claimReviews[0], claimId: 'invented' }] })).toBe(false);
  expect(parse({ ...result, followUp: { ...result.followUp, claimIds: ['invented'] } })).toBe(false);
  expect(parse({ ...result, claimReviews: [{ ...result.claimReviews[0], evidence: ['signal:invented'] }] })).toBe(false);
  expect(parse(result, context({ signals: [] }))).toBe(false);
  expect(parse(result, context({ signals: [{ ...signal, body: 'No matching observation' }] }))).toBe(false);
});

it('does not let AI promote its assumptions or unclassified prose to supported facts', () => {
  for (const kind of ['ai_assumption', 'unclassified']) expect(parse(result, context({ scoringBasis: { claims: [{ ...claim, kind }] } }))).toBe(false);
  expect(parse({ ...result, claimReviews: [{ ...result.claimReviews[0], status: 'assumption' }] }, context({ scoringBasis: { claims: [{ ...claim, kind: 'ai_assumption' }] } }))).toBe(true);
});

it('requires an actionable follow-up for an unknown score', () => {
  expect(parse({ ...result, score: null, followUp: null })).toBe(false);
  expect(parse({ ...result, score: null })).toBe(true);
});

it('requires confidence to review reach and impact claims again and gives exact repair IDs', () => {
  const c = context({scoringBasis:{claims:[claim,{...claim,id:'c2',dimension:'impact'},{...claim,id:'c3',dimension:'confidence'}]}});
  const schema = scoringResponseSchema(['confidence'],contextReferences(c),c);
  const review = id => ({...result.claimReviews[0],claimId:id,status:'needs_review'});
  const incomplete = schema.safeParse({confidence:{...result,score:20,claimReviews:[review('c3')]}});
  expect(incomplete.success).toBe(false);
  expect(incomplete.error.issues[0].message).toContain('Missing: ["c1","c2"]');
  expect(schema.safeParse({confidence:{...result,score:20,claimReviews:[review('c1'),review('c2'),review('c3')]}}).success).toBe(true);
});
