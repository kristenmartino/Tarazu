import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { draftFixture } from '../test/fixtures/validation-brief';
import { BriefDraftSchema, briefFingerprint, saveLocalBrief, loadLocalBriefs } from './validation-brief';
import { normalizeScoringSettings } from './scoring-basis';
import { scoringSettingsSchema } from './scoring-basis-validation';
import { buildScoringContext, contextReferences } from './scoring-context';
import { nextTestText, hasNextTest } from './decision-plan';
import { getDecisionBrief, decisionBriefMarkdown } from './decision-record';
import { validationBriefText, isGeneratedBriefText } from './decision-text';
import { saveWsContextChecked, loadWsContext } from './local-storage';
import { scoreValidation } from '../src/validate/validationScore';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('preserves bounded optional framing through guest storage and AI reference context without replacing custom score definitions', () => {
  const scoring = { decisionQuestion: 'What should we test before a build?', problem: 'Requesters lack required information; prevalence unknown', audience: 'Hypothetical administrators', timeframe: 'Next 30 days', impactMetric: 'Fewer incomplete requests; baseline unknown', effortBands: { 35: 'Up to five person-days' } };
  expect(scoringSettingsSchema.parse(scoring)).toEqual(scoring);
  saveWsContextChecked('mine', { constraints: 'Keep this', scoring });
  expect(loadWsContext('other')).toBeNull();
  const context = buildScoringContext({ productContext: loadWsContext('mine'), featureName: 'Paper checklist' });
  expect(context.scoring.decisionQuestion).toBe(scoring.decisionQuestion);
  expect(context.scoring.problem).toBe(scoring.problem);
  expect(context.rubric.effort[1].description).toBe('Up to five person-days');
  expect(contextReferences(context)).toContain('scoring:decisionQuestion');
  expect(contextReferences(context)).toContain('scoring:problem');
  const before = JSON.stringify(context);
  expect(JSON.stringify(buildScoringContext({ productContext: { scoring: { ...scoring, problem: 'A materially different problem' } }, featureName: 'Paper checklist' }))).not.toBe(before);
  expect(normalizeScoringSettings({ decisionQuestion: 12, problem: 'x'.repeat(900) }).decisionQuestion).toBe('');
  expect(normalizeScoringSettings({ problem: 'x'.repeat(900) }).problem).toHaveLength(700);
  for (const key of ['decisionQuestion', 'problem']) expect(scoringSettingsSchema.safeParse({ [key]: 'x'.repeat(701) }).success).toBe(false);
});

it('checks explicit frame persistence and retains the previous durable record on quota failure', () => {
  saveWsContextChecked('mine', { scoring: { decisionQuestion: 'Original' } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  expect(() => saveWsContextChecked('mine', { scoring: { decisionQuestion: 'Changed' } })).toThrow('Quota');
  expect(loadWsContext('mine').scoring.decisionQuestion).toBe('Original');
});

it('accepts legacy drafts without materializing optional context or a test, and treats only empty new fields as unchanged', () => {
  const legacy = draftFixture();
  expect(BriefDraftSchema.parse(legacy)).toEqual(legacy);
  expect(BriefDraftSchema.parse(legacy)).not.toHaveProperty('nextTest');
  expect(briefFingerprint({ ...legacy, nextTest: { hypothesis: '', method: ' ' }, productContext: { ...legacy.productContext, scoring: normalizeScoringSettings() } })).toBe(briefFingerprint(legacy));
  expect(briefFingerprint({ ...legacy, nextTest: { hypothesis: 'A new learning question' } })).not.toBe(briefFingerprint(legacy));
  expect(briefFingerprint({ ...legacy, productContext: { ...legacy.productContext, scoring: { decisionQuestion: 'A real edit' } } })).not.toBe(briefFingerprint(legacy));
  expect(BriefDraftSchema.safeParse({ ...legacy, productContext: { ...legacy.productContext, scoring: { injected: 'unknown key' } } }).success).toBe(false);
});

it('allows partial test plans but rejects invalid dates, invented fields and oversized answers', () => {
  const draft = draftFixture();
  expect(BriefDraftSchema.parse({ ...draft, nextTest: { method: 'Review a paper prototype' } }).nextTest).toEqual({ method: 'Review a paper prototype' });
  for (const date of ['2026-02-30', 'tomorrow', '2026-10-30T00:00:00Z']) expect(BriefDraftSchema.safeParse({ ...draft, nextTest: { reviewDate: date } }).success).toBe(false);
  expect(BriefDraftSchema.safeParse({ ...draft, nextTest: { reviewDate: '2026-10-30' } }).success).toBe(true);
  expect(BriefDraftSchema.safeParse({ ...draft, nextTest: { observedResult: 'Worked' } }).success).toBe(false);
  for (const [key, limit] of Object.entries({ hypothesis: 2000, method: 2000, participants: 1000, decisionRule: 2000, owner: 200 })) expect(BriefDraftSchema.safeParse({ ...draft, nextTest: { [key]: 'x'.repeat(limit + 1) } }).success).toBe(false);
  expect(hasNextTest({ hypothesis: '  ' })).toBe(false);
  expect(nextTestText()).toBe('');
  expect(nextTestText({ method: 'Paper exercise' })).toContain('Test question or assumption: Not recorded');
});

it('preserves frame and full learning plans in frozen source records, generated rationale and copy without promoting notes to outcomes', () => {
  const draft = { ...draftFixture(), nextTest: { hypothesis: 'Does missing context block action?', method: 'Paper checklist', participants: 'Five hypothetical requesters', decisionRule: 'Revise if complete requests remain delayed', owner: 'Research owner', reviewDate: '2026-12-18' } };
  draft.productContext.scoring = { decisionQuestion: 'Readiness or reminders?', problem: 'Incomplete requests', audience: 'Hypothetical requesters', timeframe: '30 days', impactMetric: 'Completeness; baseline unknown' };
  const saved = saveLocalBrief('a', draft);
  const assessment = scoreValidation(draft.scores, { assumptions: draft.assumptions, evidenceCount: 1 });
  const decision = { title: 'A test first', chosen_candidate_name: 'Paper checklist', expected_outcome: 'Outcome unknown', recommendation_snapshot: { ...assessment, reason: assessment.reason, validation_brief: { revision: saved.revision, draft: saved.draft } } };
  decision.final_rationale = validationBriefText(saved.draft, decision.recommendation_snapshot);
  expect(isGeneratedBriefText(decision.final_rationale, decision)).toBe(true);
  expect(isGeneratedBriefText(decision.final_rationale + '\nOwner changed the reasoning.', decision)).toBe(false);
  draft.nextTest.hypothesis = 'Changed later';
  draft.productContext.scoring.decisionQuestion = 'Changed later';
  expect(getDecisionBrief(decision).testPlan.hypothesis).toBe('Does missing context block action?');
  expect(getDecisionBrief(decision).choice).toBe('Paper checklist');
  expect(getDecisionBrief(decision).originatingCandidate).toBe('Approval reminders');
  expect(getDecisionBrief(decision).comparisonContext.decisionQuestion).toBe('Readiness or reminders?');
  const copy = decisionBriefMarkdown(decision);
  expect(copy).toContain('Recorded comparison context');
  expect(copy).toContain('What would change the choice?: Revise if complete requests remain delayed');
  expect(copy).toContain('Next-action notes from saved brief');
  expect(copy).toContain('Next review date: Not scheduled');
  expect(copy).toContain('Outcome unknown');
  expect(loadLocalBriefs('a')[0].draft.nextTest.hypothesis).toBe('Does missing context block action?');
  expect(decisionBriefMarkdown({ title: 'Manual record' })).toContain('Comparison context was not recorded with this decision.');
});
