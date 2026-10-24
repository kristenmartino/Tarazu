import { it, expect } from 'vitest';
import { normalizeCandidateBasis, normalizeScoringSettings, scoringRubric } from './scoring-basis';
import { candidateBasisSchema, scoringSettingsSchema } from './scoring-basis-validation';
import { buildScoringContext, contextReferences } from './scoring-context';

it('uses the same default anchors and workspace overrides in score and advisor contexts', () => {
  const productContext = { scoring: { timeframe: '90 days', audience: '100 active accounts', impactMetric: 'Overdue approvals: 25%', impactBands: { 75: 'Reduce overdue approvals by 10 percentage points per account' }, effortBands: { 35: 'Two to five total person-days' } } };
  const scoringBasis = { reach: '30 accounts; analytics estimate', evidence: 'Pilot not run' };
  const score = buildScoringContext({ productContext, featureName: 'Reminders', scoringBasis });
  const advisor = buildScoringContext({ productContext, features: [{ id: 'a', name: 'Reminders', scoringBasis }] });
  expect(score.rubric).toEqual(scoringRubric(productContext.scoring));
  expect(advisor.rubric).toEqual(score.rubric);
  expect(score.rubric.impact.find(anchor => anchor.pos === 75).description).toContain('10 percentage points');
  expect(score.rubric.effort.find(anchor => anchor.pos === 35).description).toBe('Two to five total person-days');
  expect(score.rubric.confidence.at(-1).label).toBe('Measured');
  expect(score.candidate.scoringBasis.reach).toContain('30 accounts');
  expect(advisor.candidates[0].scoringBasis).toEqual(score.candidate.scoringBasis);
  expect(contextReferences(score)).toEqual(expect.arrayContaining(['scoring:rubric', 'scoring:audience', 'scoring:timeframe', 'scoring:impactMetric']));
});

it('handles legacy records and bounded untrusted input without inventing missing facts', () => {
  expect(normalizeCandidateBasis(null)).toEqual({ reach: '', impact: '', evidence: '', effort: '', claims: [], basisClaimIds: {} });
  expect(normalizeScoringSettings({ audience: 100 }).audience).toBe('');
  expect(normalizeCandidateBasis({ reach: 'a'.repeat(2000), rogue: 'ignore' }).reach).toHaveLength(1400);
  expect(normalizeCandidateBasis({ rogue: 'ignore' })).not.toHaveProperty('rogue');
  expect(scoringRubric({ effortBands: { 35: '   ' } }).effort[1].description).toBe('Over 1 and up to 3 person-days');
  expect(buildScoringContext().scoring.timeframe).toBe('');
});

it('rejects invalid persisted answers and definitions rather than silently shortening them', () => {
  expect(candidateBasisSchema.safeParse({ reach: 50 }).success).toBe(false);
  expect(candidateBasisSchema.safeParse({ evidence: 'a'.repeat(1401) }).success).toBe(false);
  expect(scoringSettingsSchema.safeParse({ timeframe: 'a'.repeat(701) }).success).toBe(false);
  expect(scoringSettingsSchema.safeParse({ effortBands: { 35: 'a'.repeat(401) } }).success).toBe(false);
  expect(scoringSettingsSchema.safeParse({ impactBands: { 75: 'A measurable outcome' } }).success).toBe(true);
});

it('validates same-input basis references and normalizes legacy or dangling pointers safely', () => {
  const claim = { id: 'r1', dimension: 'reach', text: 'Forecast: 60 of 100 users in 30 days', kind: 'estimate' };
  const basis = { claims: [claim], basisClaimIds: { reach: 'r1' } };
  expect(candidateBasisSchema.safeParse(basis).success).toBe(true);
  expect(candidateBasisSchema.safeParse({ ...basis, basisClaimIds: { impact: 'r1' } }).success).toBe(false);
  expect(candidateBasisSchema.safeParse({ ...basis, basisClaimIds: { reach: 'missing' } }).success).toBe(false);
  expect(normalizeCandidateBasis(basis).basisClaimIds).toEqual({ reach: 'r1' });
  expect(normalizeCandidateBasis({ ...basis, basisClaimIds: { impact: 'r1', reach: 'missing' } }).basisClaimIds).toEqual({});
});

it('prioritizes selected claims when AI comparison context is bounded without dangling references', () => {
  const claims = Array.from({ length: 12 }, (_, n) => ({ id: `r${n}`, dimension: 'reach', text: `Claim ${n}`, kind: 'estimate' }));
  const features = Array.from({ length: 8 }, (_, n) => ({ id: `f${n}`, scoringBasis: { claims, basisClaimIds: { reach: 'r11' } } }));
  const context = buildScoringContext({ features });
  expect(context.candidates[0].scoringBasis.claims[0].id).toBe('r11');
  expect(context.candidates.flatMap(c => c.scoringBasis.claims)).toHaveLength(24);
  for (const candidate of context.candidates) for (const id of Object.values(candidate.scoringBasis.basisClaimIds))
    expect(candidate.scoringBasis.claims.some(claim => claim.id === id)).toBe(true);
  expect(context.omissions.join(' ')).toContain('scoring claims omitted');
});
