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
  expect(normalizeCandidateBasis(null)).toEqual({ reach: '', impact: '', evidence: '', effort: '', claims: [] });
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
