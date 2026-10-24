import { beforeEach, describe, expect, it, vi } from 'vitest';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('./ai', () => ({ requestJson: request }));
import { applyQuestionReview, questionAnswerSources, questionReviewSchema, reviewScoringQuestions } from './scoring-question-review';
import { buildScoringContext } from './scoring-context';

const answer = { id: 'saved', dimension: 'reach', kind: 'estimate', origin: 'user', sources: [],
  question: 'What share of the 100 pilot users have had at least one overdue request in a comparable 30-day period?',
  text: 'No measured eligible-user count exists. Retain the forecast of 60 of 100 users over 30 days. Opt-outs are unknown.' };
const context = () => buildScoringContext({ featureName: 'Reminders', candidateId: 'a',
  scoringBasis: { claims: [answer] }, productContext: { scoring: { timeframe: '30 days', audience: '100 pilot users', impactMetric: 'Approvals overdue by over 48 hours' } },
  signals: [{ id: 's1', linked_candidate_id: 'a', title: 'Synthetic cases', body: 'Of five fictional cases, four awaited documents and one was overlooked.' }],
  features: [{ id: 'b', name: 'Other', scoringBasis: { claims: [{ ...answer, id: 'other', text: 'Other candidate has 99 users' }] } }],
});
const repeated = 'How many of the 100 pilot users had at least one request overdue by more than 48 hours in the most recent comparable 30-day period?';
const score = (question = repeated) => ({ score: 55, justification: 'Forecast maps to Broad', evidence: [], assumptions: ['Unmeasured'], gaps: ['No measurement'], claimReviews: [],
  followUp: { question, whyItChangesScore: 'Eligibility changes the band', claimIds: ['saved'] }, nextAction: 'Ask how many pilot users had an overdue request in a prior 30-day period.' });
const matched = id => ({ id, status: 'answered', sourceId: 'claim:saved', quote: 'No measured eligible-user count exists.' });
const research = 'Review event records if available; otherwise track unique affected users prospectively during the scoring period.';
const fresh = (id, action = research) => ({ id, status: 'new', sourceId: null, quote: null, ...(id.endsWith(':nextAction') ? { researchAction: action } : {}) });
const run = result => reviewScoringQuestions({ result, context: context(), apiKey: 'test', model: 'test-model' });
beforeEach(() => vi.clearAllMocks());

it('checks the observed live paraphrase and repeated next action, retaining scores and exact source text', async () => {
  request.mockImplementation(async options => {
    expect(options.prompt).toContain(repeated);
    expect(options.prompt).toContain(answer.text);
    expect(options.prompt).not.toContain('Other candidate has 99 users');
    expect(options.timeoutMs).toBe(25000);
    expect(options.totalTimeoutMs).toBe(25000);
    return { reviews: [matched('reach:followUp'), matched('reach:nextAction')] };
  });
  const initial = { reach: score() };
  const result = await run(initial);
  expect(result.reach.followUp).toBeNull();
  expect(result.reach.followUpResolution).toEqual({ status: 'answered', sourceId: 'claim:saved', label: 'Recorded claim · User estimate', text: 'No measured eligible-user count exists.' });
  expect(result.reach.nextAction).not.toMatch(/Ask/);
  for (const key of ['score', 'justification', 'evidence', 'assumptions', 'gaps', 'claimReviews']) expect(result.reach[key]).toEqual(initial.reach[key]);
  expect(initial.reach.followUp.question).toBe(repeated);
});

it('keeps genuinely different period, denominator, adoption, causality and scope questions available', async () => {
  for (const question of ['How many of 100 users qualify over 90 days?', 'Is the denominator 100 users or 100 accounts?', 'How many eligible users actually adopt reminders?', 'Did reminders cause a reduction in overdue approvals?', 'How much work is required for production rather than the pilot?']) {
    request.mockResolvedValue({ reviews: [fresh('reach:followUp'), fresh('reach:nextAction')] });
    const initial = { reach: score(question) };
    const result = await run(initial);
    expect(result.reach.followUp).toEqual(initial.reach.followUp);
    expect(result.reach.nextAction).toBe(`Suggested research: ${research}`);
  }
});

it('acknowledges exact recorded answers without relying on the semantic reviewer', async () => {
  request.mockRejectedValue(new Error('Provider unavailable'));
  const result = await run({ reach: score(answer.question) });
  expect(result.reach.followUp).toBeNull();
  expect(result.reach.followUpResolution.text).toBe(answer.text);
});

it('withholds unchecked questions and repeated-looking actions on unavailable review without losing valid or null scores', async () => {
  request.mockRejectedValue(new Error('Timeout'));
  for (const value of [55, null]) {
    const result = await run({ reach: { ...score(), score: value } });
    expect(result.reach.score).toBe(value);
    expect(result.reach.followUp).toBeNull();
    expect(result.reach.followUpResolution.status).toBe('unavailable');
    expect(result.reach.nextAction).toBe('Review the supplied context before choosing the next research step.');
  }
});

it('withholds ambiguous questions without claiming that they were answered', async () => {
  request.mockResolvedValue({ reviews: [{ ...fresh('reach:followUp'), status: 'uncertain' }, fresh('reach:nextAction')] });
  const result = await run({ reach: score() });
  expect(result.reach.followUp).toBeNull();
  expect(result.reach.followUpResolution).toEqual({ status: 'uncertain' });
});

it('recognizes that a source can already supply a case count, without promoting fiction to measurements', async () => {
  const action = 'Run a pilot comparing overdue outcomes with the current workflow for the recorded audience.';
  request.mockResolvedValue({ reviews: [{ id: 'impact:followUp', status: 'answered', sourceId: 'signal:s1', quote: 'four awaited documents and one was overlooked.' }, fresh('impact:nextAction', action)] });
  const result = await run({ impact: { ...score('In the five cases how many awaited documents versus being overlooked?'), score: 55, nextAction: 'Run a real pilot.' } });
  expect(result.impact.followUp).toBeNull();
  expect(result.impact.followUpResolution.label).toBe('Signal · Synthetic cases');
  expect(result.impact.nextAction).toBe(`Suggested research: ${action}`);
});

it('replaces the observed ask-ops action with a separate proposed collection method', async () => {
  request.mockResolvedValue({ reviews: [matched('reach:followUp'), fresh('reach:nextAction')] });
  const result = await run({ reach: { ...score(), nextAction: 'Ask ops teams: how many of the 100 pilot users had at least one overdue request last month?' } });
  expect(result.reach.followUpResolution.status).toBe('answered');
  expect(result.reach.nextAction).toBe(`Suggested research: ${research}`);
  expect(result.reach.score).toBe(55);
});

it('never reuses an unchecked original action when a new review has no proposed method', async () => {
  request.mockResolvedValue({ reviews: [matched('reach:followUp'), { id: 'reach:nextAction', status: 'new', sourceId: null, quote: null }] });
  const result = await run({ reach: score() });
  expect(result.reach.nextAction).toBe('Review the supplied context before choosing the next research step.');
});

it('uses only supplied current context and excludes unverified AI reasoning as an answer', () => {
  const ctx = context();
  ctx.candidate.scoringBasis.claims.push({ ...answer, id: 'ai', origin: 'ai', kind: 'ai_assumption', text: 'AI invented adoption' });
  const sources = questionAnswerSources(ctx);
  expect(sources.some(source => source.text.includes('99 users') || source.text.includes('AI invented'))).toBe(false);
  expect(sources.find(source => source.id === 'claim:saved').question).toBe(answer.question);
});

it('does not add a semantic call when there is no supplied answer context', async () => {
  const result = { reach: score() };
  expect(await reviewScoringQuestions({ result, context: buildScoringContext({ featureName: 'Empty' }) })).toBe(result);
  expect(request).not.toHaveBeenCalled();
});

describe('semantic review output boundary', () => {
  const items = [{ id: 'reach:followUp', dimension: 'reach', field: 'followUp' }, { id: 'reach:nextAction', dimension: 'reach', field: 'nextAction' }];
  const schema = questionReviewSchema(items, questionAnswerSources(context()));
  it('requires exact requested IDs and verbatim source-backed acknowledgements', () => {
    expect(schema.safeParse({ reviews: [matched(items[0].id), fresh(items[1].id)] }).success).toBe(true);
    for (const reviews of [[matched(items[0].id)], [matched(items[0].id), matched(items[0].id)], [matched('invented'), fresh(items[1].id)], [{ ...matched(items[0].id), sourceId: 'claim:other' }, fresh(items[1].id)], [{ ...matched(items[0].id), quote: 'The true measured count is 60' }, fresh(items[1].id)], [{ ...matched(items[0].id), status: 'new' }, fresh(items[1].id)]]) expect(schema.safeParse({ reviews }).success).toBe(false);
  });
  it('does not invent an answer for a missing review', () => {
    const result = applyQuestionReview({ reach: score() }, items, questionAnswerSources(context()), null);
    expect(result.reach.followUpResolution).toEqual({ status: 'unavailable' });
  });
  it('requires a method for new next actions and forbids attaching plans to questions or answered reviews', () => {
    const missing = { id: items[1].id, status: 'new', sourceId: null, quote: null };
    for (const action of [undefined, null, '', 'Ask ops', 'x'.repeat(241)])
      expect(schema.safeParse({ reviews: [matched(items[0].id), { ...missing, researchAction: action }] }).success).toBe(false);
    expect(schema.safeParse({ reviews: [matched(items[0].id), fresh(items[1].id)] }).success).toBe(true);
    expect(schema.safeParse({ reviews: [{ ...fresh(items[0].id), researchAction: research }, fresh(items[1].id)] }).success).toBe(false);
    expect(schema.safeParse({ reviews: [matched(items[0].id), { ...matched(items[1].id), researchAction: research }] }).success).toBe(false);
  });
});
