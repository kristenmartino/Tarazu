import { hasNextTest, normalizeNextTest, nextTestText, comparisonContextText } from './decision-plan';
import { dateOnly, localToday } from '../src/dateOnly';
import { sameRecordedText, isGeneratedBriefText } from './decision-text';

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
    nextTest: hasNextTest(draft.nextTest) ? nextTestText(draft.nextTest) : text(draft.nextActions),
    testPlan: hasNextTest(draft.nextTest) ? normalizeNextTest(draft.nextTest) : null,
    nextActionNotes: text(draft.nextActions),
    comparisonContext: object(draft.productContext?.scoring) ? draft.productContext.scoring : null,
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

// The summary references repeated recorded text; full source versions remain
// in an appendix. Only exact whitespace-normalized matches are reused.
export function decisionBriefMarkdown(decision) {
  const brief = getDecisionBrief(decision);
  const value = v => text(v) || 'Not recorded';
  const lines = [`# ${value(decision.title)}`, '',
    `Original decision status: ${value(decision.status)}`,
    `Owner: ${value(decision.owner)}`,
    `Decision date: ${dateOnly(decision.decision_date) || 'Not recorded'}`];
  const recorded = [];
  const write = (label, content, heading = true, referenceLabel = label) => {
    if (heading) lines.push('', `## ${label}`);
    else lines.push('', `${label}:`);
    if (!text(content)) { lines.push('Not recorded'); return; }
    for (const paragraph of text(content).split(/\n\s*\n/)) {
      const previous = recorded.find(entry => sameRecordedText(entry.content, paragraph));
      if (previous) lines.push(`See ${previous.label}.`);
      else { lines.push(paragraph); recorded.push({ label: referenceLabel, content: paragraph }); }
    }
  };
  write('Problem', brief.problem);
  write('Recorded comparison context', comparisonContextText(brief.comparisonContext) || (object(decision.recommendation_snapshot?.validation_brief?.draft) ? 'Comparison context was not preserved in this older brief.' : 'Comparison context was not recorded with this decision.'));
  lines.push('', '## Choice', `Chosen: ${value(brief.choice)}`);
  write('Reasoning', brief.rationale);
  write('Tradeoffs', brief.tradeoffs);
  write('Unknowns and accepted risks', brief.unknowns);
  if (sameRecordedText(decision.expected_outcome, brief.nextTest)) {
    lines.push('', '## Expected outcome', 'Recorded with the same text as Next test below.');
  } else write('Expected outcome', decision.expected_outcome);
  write('Next test', brief.nextTest);
  if (brief.testPlan && brief.nextActionNotes) write('Next-action notes from saved brief', brief.nextActionNotes);
  lines.push('', `Next review date: ${decisionReviewState(decision).dueDate || 'Not scheduled'}`, '',
    '## Evidence', `Source brief: ${value(brief.sourceName)}; revision ${brief.sourceRevision || 'not recorded'}.`,
    `Evidence marked reviewed: ${brief.evidenceReviewed === null ? 'not recorded' : brief.evidenceReviewed ? 'yes' : 'no'}. Review is not independent verification.`,
    `Groups refer to the originating candidate: ${value(brief.originatingCandidate)}.${brief.choice && brief.choice !== brief.originatingCandidate ? ` Chosen option: ${brief.choice}.` : ''}`,
    'Full source text and caveats are in the Source appendix.');
  const sources = [];
  const sourceReference = signal => {
    const source = snapshotSignal(signal);
    const key = JSON.stringify(source);
    let index = sources.findIndex(entry => entry.key === key);
    if (index < 0) { index = sources.length; sources.push({ key, source }); }
    return `E${index + 1}`;
  };
  for (const group of evidenceGroups(decision)) {
    lines.push('', `### ${group.label}`);
    if (!group.items.length) lines.push('No sources recorded in this group.');
    for (const source of group.items) lines.push(`- [${sourceReference(source)}] ${value(source.title)} — ${value(source.source)}`);
  }
  const reviews = Array.isArray(decision.reviews) ? decision.reviews.filter(r => object(r) && REVIEW_ACTIONS.includes(r.action)) : [];
  if (reviews.length) {
    lines.push('', '## Dated reviews', 'Reported outcomes; the original decision remains unchanged.');
    for (const review of [...reviews].sort((a, b) => (Date.parse(a.reviewed_at) || 0) - (Date.parse(b.reviewed_at) || 0))) {
      lines.push('', `### ${value(review.reviewed_at)} — ${review.action}`, `Recorded by: ${value(review.reviewed_by_name)}`, `Reviewed choice: ${value(review.decision_snapshot?.chosen_candidate_name)}`);
      const reviewText = (label, content) => write(label, content, false, `${label} in the ${value(review.reviewed_at)} review`);
      reviewText('Expected then', review.decision_snapshot?.expected_outcome);
      reviewText('Reported outcome', review.outcome);
      reviewText('New evidence notes', review.new_evidence);
      reviewText('Next action / revised direction', review.next_action);
      const evidence = Array.isArray(review.evidence_snapshots) ? review.evidence_snapshots.filter(object) : [];
      if (evidence.length) {
        lines.push('Sources preserved with this review:');
        for (const source of evidence) lines.push(`- [${sourceReference(source)}] ${value(source.title)}`);
      }
    }
  }
  if (sources.length) {
    lines.push('', '## Source appendix', 'Sources are preserved as recorded. Later edits to a source do not update this copy.');
    for (const { source } of sources) {
      lines.push('', `### ${sourceReference(source)} · ${value(source.title)}`, `Source: ${value(source.source)}`, `Recorded relationship: ${value(source.confidence_impact)}`);
      if (source.created_at) lines.push(`Source date: ${source.created_at}`);
      lines.push(value(source.body));
    }
  }
  if (text(decision.final_rationale) && !sameRecordedText(decision.final_rationale, brief.rationale) && !isGeneratedBriefText(decision.final_rationale, decision)) {
    write('Full recorded rationale', decision.final_rationale);
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
