import { SCORING_FIELDS, normalizeScoringSettings } from './scoring-basis';

export const NEXT_TEST_FIELDS = {
  hypothesis: { label: 'Test question or assumption', placeholder: 'What do you need to learn before choosing or committing?', maxLength: 2000 },
  method: { label: 'Method', placeholder: 'How will you learn? A conversation, paper test or data check can be enough.', maxLength: 2000 },
  participants: { label: 'Who and in what context?', placeholder: 'Relevant people, situations or records. Leave unknown if undecided.', maxLength: 1000 },
  decisionRule: { label: 'What would change the choice?', placeholder: 'Which observation would lead you to keep, revise or stop this direction? Numbers are optional.', maxLength: 2000 },
  owner: { label: 'Test owner', placeholder: 'Who will take the next learning action?', maxLength: 200 },
  reviewDate: { label: 'Planned test review date', maxLength: 10 },
};

export const normalizeNextTest = plan => Object.fromEntries(Object.keys(NEXT_TEST_FIELDS).map(key => [key, typeof plan?.[key] === 'string' ? plan[key] : '']));
export const hasNextTest = plan => Object.values(normalizeNextTest(plan)).some(value => value.trim());

export function nextTestText(plan) {
  if (!hasNextTest(plan)) return '';
  const value = normalizeNextTest(plan);
  return Object.entries(NEXT_TEST_FIELDS).map(([key, field]) => `${field.label}: ${value[key].trim() || 'Not recorded'}`).join('\n');
}

export function comparisonContextText(scoring) {
  if (!scoring || typeof scoring !== 'object' || Array.isArray(scoring)) return '';
  const value = normalizeScoringSettings(scoring);
  return Object.entries(SCORING_FIELDS).map(([key, field]) => `${field.label}: ${value[key].trim() || 'Not recorded'}`).join('\n');
}

export function briefExtensionLines(draft) {
  const lines = [];
  if (draft.productContext?.scoring) lines.push('', 'Recorded comparison context:', comparisonContextText(draft.productContext.scoring));
  if (hasNextTest(draft.nextTest)) lines.push('', 'Proposed next test:', nextTestText(draft.nextTest));
  return lines;
}
