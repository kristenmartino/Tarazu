import { normalizeClaims } from './scoring-claims';

// One rubric shared by the form, context preview, and AI. Scores remain relative;
// workspace definitions establish what the bands mean for this comparison.
export const SCORING_ANCHORS = {
  reach: [
    { pos: 15, label: 'Niche', description: 'About 10% of the workspace audience' },
    { pos: 35, label: 'Segment', description: 'About 30% of the workspace audience' },
    { pos: 55, label: 'Broad', description: 'About 60% of the workspace audience' },
    { pos: 75, label: 'Majority', description: 'About 80% of the workspace audience' },
    { pos: 95, label: 'Everyone', description: 'About 100% of the workspace audience' },
  ],
  impact: [
    { pos: 15, label: 'Minimal', description: 'Small convenience; little change to the target outcome' },
    { pos: 35, label: 'Low', description: 'Removes minor friction in the target workflow' },
    { pos: 55, label: 'Medium', description: 'Meaningful improvement to the target outcome per affected user' },
    { pos: 75, label: 'High', description: 'Substantial improvement to a core workflow or outcome' },
    { pos: 95, label: 'Massive', description: 'Enables a critical outcome previously out of reach' },
  ],
  confidence: [
    { pos: 20, label: 'Assumed', description: 'Reach and impact rely mainly on explicit assumptions' },
    { pos: 50, label: 'Directional', description: 'Some relevant evidence, with limited coverage or unresolved conflicts' },
    { pos: 80, label: 'Supported', description: 'Consistent direct evidence supports both reach and impact for the target segment' },
    { pos: 95, label: 'Measured', description: 'Recent, representative measurements support both reach and impact' },
  ],
  effort: [
    { pos: 15, label: 'XS', description: 'Up to 1 person-day' },
    { pos: 35, label: 'S', description: 'Over 1 and up to 3 person-days' },
    { pos: 55, label: 'M', description: 'Over 3 and up to 10 person-days' },
    { pos: 75, label: 'L', description: 'Over 10 and up to 30 person-days' },
    { pos: 95, label: 'XL', description: 'Over 30 person-days' },
  ],
};

export const SCORING_FIELDS = {
  decisionQuestion: { label: 'Decision question', placeholder: 'What do you need to decide? Unknowns are welcome.' },
  problem: { label: 'Whose problem are we addressing?', placeholder: 'Who experiences the problem, and what happens today? Distinguish observations from assumptions.' },
  timeframe: { label: 'Scoring timeframe', placeholder: 'Example: first 90 days after rollout; use the same period for every candidate' },
  audience: { label: 'Audience unit and size', placeholder: 'Example: 1,000 active accounts. Count accounts consistently, rather than mixing accounts and users.' },
  impactMetric: { label: 'Target outcome and baseline', placeholder: 'Example: reduce approvals overdue by 48 hours; current baseline is 25%. Write unknown if it has not been measured.' },
};

export const CANDIDATE_QUESTIONS = {
  reach: { label: 'Who will this reach?', placeholder: 'Which segment, how many within the shared timeframe, and why will they encounter or adopt it? Separate measured counts from assumptions.' },
  impact: { label: 'What should improve per user?', placeholder: 'Current baseline, expected change to the target outcome, and how this change would cause that benefit. Mark untested expectations.' },
  evidence: { label: 'What supports these estimates?', placeholder: 'Research or analytics source, date, sample size and segment, plus conflicting findings. Link supporting Signals when available. State what is only assumed.' },
  effort: { label: 'What will it take to deliver?', placeholder: 'Prototype, pilot or production? Include scope, exclusions, reuse, dependencies, and total person-days across product, design, engineering and testing. Mark estimates needing team review.' },
};

// Normalize bounded, known keys for prompts and older saved records. Persistence
// validates before calling these helpers, rather than silently truncating writes.
export function normalizeCandidateBasis(value) {
  const claims = normalizeClaims(value?.claims);
  const basisClaimIds = Object.fromEntries(['reach', 'impact', 'confidence', 'effort'].flatMap(dimension => {
    const id = value?.basisClaimIds?.[dimension];
    return typeof id === 'string' && id.length <= 100 && claims.some(claim => claim.id === id && claim.dimension === dimension) ? [[dimension, id]] : [];
  }));
  return { ...Object.fromEntries(Object.keys(CANDIDATE_QUESTIONS).map(key => [key, typeof value?.[key] === 'string' ? value[key].slice(0, 1400) : ''])), claims, basisClaimIds };
}

export function normalizeScoringSettings(value) {
  const fields = Object.fromEntries(Object.keys(SCORING_FIELDS).map(key => [key, typeof value?.[key] === 'string' ? value[key].slice(0, 700) : '']));
  for (const dimension of ['impact', 'effort']) {
    fields[`${dimension}Bands`] = Object.fromEntries(SCORING_ANCHORS[dimension].map(anchor => [anchor.pos, typeof value?.[`${dimension}Bands`]?.[anchor.pos] === 'string' ? value[`${dimension}Bands`][anchor.pos].slice(0, 400) : '']));
  }
  return fields;
}

export function scoringRubric(settings) {
  const normalized = normalizeScoringSettings(settings);
  return Object.fromEntries(Object.entries(SCORING_ANCHORS).map(([dimension, anchors]) => [dimension, anchors.map(anchor => ({
    ...anchor, description: normalized[`${dimension}Bands`]?.[anchor.pos]?.trim() || anchor.description,
  }))]));
}

export const SCORING_RULES = `Use the supplied shared scoring rubric for every candidate. Select a listed anchor score when suggesting a number; do not invent precision between bands. Reach uses the closest audience-share anchor within the shared timeframe. Effort uses the stated work band, combining work across roles, not calendar waiting time or available capacity. Workspace impact and effort descriptions replace the default band descriptions. Existing candidate scores are judgments, not calibration evidence. Candidate scoring answers are user-supplied claims: separate measured facts, estimates, and assumptions; they are not automatically customer evidence. If the shared audience/timeframe or candidate reach basis is missing, return reach:null. If the target outcome or a credible per-user benefit basis is missing, return impact:null. If delivery scope or a credible work estimate is missing, return effort:null. Relevant facts explicitly supplied elsewhere in the context may fill a blank answer; never infer them from a candidate name alone. Confidence describes the evidence supporting reach AND impact; with no direct evidence, use the Assumed band only when explicit assumptions are supplied, otherwise return null. Synthetic examples cannot establish real customer confidence. In justification identify the selected band and its factual basis. Use gaps for unresolved information, followUp for a materially new question, and nextAction for a proposed method to collect the evidence most likely to change the estimate. An unknown stays unknown; do not force a number.`;
