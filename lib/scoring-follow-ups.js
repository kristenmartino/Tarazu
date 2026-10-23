import { relevantClaims } from './scoring-claims';

export function answeredClaimsForInput(dimension, claims = []) {
  return relevantClaims({ candidate: { scoringBasis: { claims: Array.isArray(claims) ? claims : [] } } }, dimension)
    .filter(claim => typeof claim.question === 'string' && claim.question.trim() && typeof claim.text === 'string' && claim.text.trim());
}

const auxiliaries = new Set(['a', 'an', 'the', 'have', 'has', 'had', 'do', 'does', 'did', 'is', 'are', 'was', 'were']);
function tokens(question) {
  return String(question || '').toLowerCase().replace(/[’']/g, '').replace(/\bcomparable\s+(?:prior|previous|historical)\b/g, 'comparable').match(/[a-z]+|\d+(?:\.\d+)?/g)?.filter(word => !auxiliaries.has(word)) || [];
}
function sameQuestion(left, right) {
  const a = tokens(left), b = tokens(right);
  // Match only formatting and auxiliary changes. Similar topics or shared claim
  // IDs are not enough: a new denominator, period, or causal question stays open.
  return a.length > 0 && a.join(' ') === b.join(' ');
}

export function findFollowUpAnswer(followUp, dimension, claims = []) {
  if (typeof followUp?.question !== 'string' || !followUp.question.trim()) return null;
  return answeredClaimsForInput(dimension, claims).find(claim => sameQuestion(claim.question, followUp.question)) || null;
}
