import { describe, it, expect } from 'vitest';
import { answeredClaimsForInput, findFollowUpAnswer } from './scoring-follow-ups';

const question = 'What share of the 100 pilot users have had at least one overdue request in a comparable 30-day period?';
const answer = { id: 'answer', dimension: 'reach', question, text: 'No actual measurements exist; retain forecast 60/100.', kind: 'estimate' };
describe('recorded scoring answers', () => {
  it('acknowledges a saved unknown despite auxiliary or punctuation changes', () => {
    expect(findFollowUpAnswer({ question: question.replace('have had', 'had').replace('?', '.') }, 'reach', [answer])).toBe(answer);
  });
  it('does not hide new numeric, timing, adoption or negation questions', () => {
    for (const changed of [question.replace('30-day', '90-day'), question.replace('overdue', 'not overdue'), question.replace('comparable', 'after the pilot instead of a comparable'), question.replace('had at least one overdue request', 'adopted reminders')]) {
      expect(findFollowUpAnswer({ question: changed, claimIds: ['answer'] }, 'reach', [answer])).toBeNull();
    }
  });
  it('ignores blank answers and other scoring inputs, and handles missing values', () => {
    expect(answeredClaimsForInput('reach')).toEqual([]);
    expect(answeredClaimsForInput('reach', null)).toEqual([]);
    expect(findFollowUpAnswer(null, 'reach')).toBeNull();
    expect(findFollowUpAnswer({ question }, 'effort', [answer])).toBeNull();
    expect(findFollowUpAnswer({ question }, 'reach', [{ ...answer, text: ' ' }])).toBeNull();
  });
  it('includes reach and impact answers when reviewing confidence', () => {
    expect(answeredClaimsForInput('confidence', [answer])).toEqual([answer]);
  });
});
