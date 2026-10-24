import { dateOnly, localToday } from '../src/dateOnly';

const text = value => typeof value === 'string' ? value.trim() : '';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const REVIEW_ACTIONS = ['keep', 'revise', 'retire'];

export function getDecisionBrief(decision = {}) {
  const source = decision.recommendation_snapshot?.validation_brief;
  const draft = object(source?.draft) ? source.draft : {};
  return {
    problem: text(draft.assumptions?.problem),
    choice: text(decision.chosen_candidate_name),
    rationale: text(decision.summary_rationale) || text(decision.final_rationale),
    tradeoffs: text(decision.tradeoffs_considered),
    unknowns: [text(draft.risks), text(decision.risks_accepted)].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join('\n\n'),
    nextTest: text(draft.nextActions),
    evidence: Array.isArray(draft.attachedSignals) ? draft.attachedSignals.filter(object).map(snapshotSignal) : [],
    sourceName: text(draft.ideaName),
    sourceRevision: Number.isSafeInteger(source?.revision) && source.revision > 0 ? source.revision : null,
    evidenceReviewed: typeof draft.evidenceReviewed === 'boolean' ? draft.evidenceReviewed : null,
    originatingCandidate: text(draft.ideaName),
  };
}

export function snapshotSignal(signal) {
  return Object.fromEntries(['id', 'title', 'body', 'source', 'confidence_impact', 'type', 'linked_candidate_id', 'created_at'].map(key => [key, text(signal[key])]));
}

export function evidenceGroups(decision) {
  const evidence = getDecisionBrief(decision).evidence;
  return [
    { key: 'supports', label: 'Supports', items: evidence.filter(s => s.confidence_impact === 'increases') },
    { key: 'challenges', label: 'Challenges', items: evidence.filter(s => s.confidence_impact === 'decreases') },
    { key: 'context', label: 'Context', items: evidence.filter(s => !['increases', 'decreases'].includes(s.confidence_impact)) },
  ];
}

export function latestReview(decision) {
  return (Array.isArray(decision?.reviews) ? decision.reviews : []).filter(r => object(r) && REVIEW_ACTIONS.includes(r.action) && Number.isFinite(Date.parse(r.reviewed_at)))
    .sort((a, b) => Date.parse(b.reviewed_at) - Date.parse(a.reviewed_at) || text(b.id).localeCompare(text(a.id)))[0] || null;
}

export function decisionReviewState(decision, today = localToday()) {
  const review = latestReview(decision);
  const dueDate = review?.action === 'retire' ? '' : dateOnly(review ? review.next_review_date : decision.review_date);
  const isDue = Boolean(dueDate && dueDate <= today && decision.status !== 'archived');
  return { action: review?.action || null, dueDate, isDue, label: review?.action === 'retire' ? 'Retired after review' : isDue ? 'Review due' : review?.action === 'revise' ? 'Revised direction' : review ? 'Reviewed' : 'Not reviewed yet' };
}

// Markdown is a portable, human-readable handoff, not a full workspace backup.
// Retain complete source bodies so synthetic labels and caveats cannot be lost
// simply because the screen uses a shorter excerpt.
export function decisionBriefMarkdown(decision) {
  const brief = getDecisionBrief(decision);
  const value = v => text(v) || 'Not recorded';
  const lines = [
    `# ${value(decision.title)}`, '',
    `Original decision status: ${value(decision.status)}`,
    `Owner: ${value(decision.owner)}`,
    `Decision date: ${dateOnly(decision.decision_date) || 'Not recorded'}`, '',
    '## Problem', value(brief.problem), '',
    '## Options and choice', `Chosen: ${value(brief.choice)}`, '',
    '## Reasoning', value(brief.rationale), '',
    '## Tradeoffs', value(brief.tradeoffs), '',
    '## Evidence',
    `Source brief: ${value(brief.sourceName)}; revision ${brief.sourceRevision || 'not recorded'}.`,
    `Evidence marked reviewed: ${brief.evidenceReviewed === null ? 'not recorded' : brief.evidenceReviewed ? 'yes' : 'no'}. This is not independent verification.`,
    `Relationships below refer to the originating candidate: ${value(brief.originatingCandidate)}. They do not automatically support the chosen option.`,
  ];
  for (const group of evidenceGroups(decision)) {
    lines.push('', `### ${group.label}`);
    if (!group.items.length) lines.push('No sources recorded in this group.');
    for (const s of group.items) lines.push(`- ${value(s.title)}\n  Source: ${value(s.source)}\n${value(s.body)}`);
  }
  lines.push('', '## Unknowns and accepted risks', value(brief.unknowns), '', '## Expected outcome', value(decision.expected_outcome), '', '## Next test proposed in source brief', value(brief.nextTest), '', `Next review date: ${decisionReviewState(decision).dueDate || 'Not scheduled'}`);
  const reviews = Array.isArray(decision.reviews) ? decision.reviews.filter(r => object(r) && REVIEW_ACTIONS.includes(r.action)) : [];
  if (reviews.length) {
    lines.push('', '## Dated reviews', 'Reported outcomes and review choices; not independently verified.');
    for (const r of [...reviews].sort((a, b) => text(a.reviewed_at).localeCompare(text(b.reviewed_at)))) {
      lines.push('', `### ${value(r.reviewed_at)} — ${r.action}`, `Recorded by: ${value(r.reviewed_by_name)}`, `Reviewed choice: ${value(r.decision_snapshot?.chosen_candidate_name)}`, `Expected then: ${value(r.decision_snapshot?.expected_outcome)}`, `Reported outcome: ${value(r.outcome)}`, `New evidence / caveats: ${value(r.new_evidence)}`, `Next action / revised direction: ${value(r.next_action)}`);
      for (const s of Array.isArray(r.evidence_snapshots) ? r.evidence_snapshots.filter(object) : []) lines.push(`- ${value(s.title)}\n  Source: ${value(s.source)}\n${value(s.body)}`);
    }
  }
  return lines.join('\n');
}

export function validateReview(input) {
  if (!object(input) || !REVIEW_ACTIONS.includes(input.action)) throw new Error('Choose Keep, Revise or Retire.');
  const clean = { action: input.action };
  for (const key of ['outcome', 'new_evidence', 'next_action']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Review fields must be text.');
    clean[key] = text(input[key]);
    if (clean[key].length > 12000) throw new Error('Keep each review field under 12,000 characters.');
  }
  if (!clean.outcome || !clean.next_action) throw new Error('Record what happened and your reasoning or next action. Unknown outcomes are allowed.');
  if (input.next_review_date && (!dateOnly(input.next_review_date) || !/^\d{4}-\d{2}-\d{2}$/.test(input.next_review_date))) throw new Error('Choose a valid next review date.');
  clean.next_review_date = clean.action === 'retire' ? null : dateOnly(input.next_review_date) || null;
  if (input.signal_ids != null && (!Array.isArray(input.signal_ids) || input.signal_ids.some(id => typeof id !== 'string' || !id || id.length > 200))) throw new Error('Choose valid evidence sources.');
  clean.signal_ids = [...new Set(input.signal_ids || [])];
  if (clean.signal_ids.length > 50) throw new Error('Attach at most 50 evidence sources.');
  return clean;
}

export function makeDecisionReview(decision, input, signals = [], metadata = {}) {
  const clean = validateReview(input);
  const selected = clean.signal_ids.map(id => signals.find(s => s.id === id));
  if (selected.some(s => !s)) throw new Error('An evidence source is no longer available. Review your selection.');
  const { reviews: _reviews, ...snapshot } = decision;
  const { signal_ids: _ids, ...fields } = clean;
  return {
    ...fields,
    id: metadata.id || globalThis.crypto.randomUUID(),
    reviewed_at: metadata.reviewed_at || new Date().toISOString(),
    reviewed_by_name: metadata.reviewed_by_name || 'Browser user',
    evidence_snapshots: selected.map(snapshotSignal),
    decision_snapshot: JSON.parse(JSON.stringify(snapshot)),
  };
}
