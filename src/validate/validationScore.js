// Pure, deterministic scoring for the Tarazu Validate screen.
// No React, no I/O — kept separate so it's easy to unit-test.

/** The six assumption categories a validation brief captures. */
export const ASSUMPTION_CATEGORIES = [
  { key: "problem", label: "Problem" },
  { key: "audience", label: "Audience" },
  { key: "workaround", label: "Current workaround" },
  { key: "willingness", label: "Willingness to pay / adopt" },
  { key: "differentiation", label: "Differentiation" },
  { key: "feasibility", label: "Feasibility" },
];

/** The seven opportunity dimensions, each scored 1–5. */
export const VALIDATE_DIMENSIONS = [
  { key: "problemSeverity", label: "Problem severity" },
  { key: "evidenceStrength", label: "Evidence strength" },
  { key: "marketPull", label: "Market pull" },
  { key: "differentiation", label: "Differentiation" },
  { key: "monetizationClarity", label: "Monetization clarity" },
  { key: "buildFeasibility", label: "Build feasibility" },
  { key: "strategicFit", label: "Strategic fit" },
];

/**
 * Mean of the seven opportunity dimensions (denominator is always 7).
 * Missing/non-numeric values count as 0.
 * @param {Record<string, number>} scores
 * @returns {number}
 */
export const averageScore = (scores = {}) => {
  const sum = VALIDATE_DIMENSIONS.reduce((acc, d) => {
    const v = Number(scores[d.key]);
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
  return sum / VALIDATE_DIMENSIONS.length;
};

/**
 * Map an average opportunity score to a recommendation.
 *   >= 4.0           → Build
 *   >= 3.2 and < 4.0 → Validate Further
 *   >= 2.4 and < 3.2 → Pivot
 *   < 2.4            → Park
 * @param {number} avg
 * @returns {"Build"|"Validate Further"|"Pivot"|"Park"}
 */
export const recommendationFor = (avg) => {
  if (avg >= 4.0) return "Build";
  if (avg >= 3.2) return "Validate Further";
  if (avg >= 2.4) return "Pivot";
  return "Park";
};

/** New assessments require explicit ratings and an evidence review.
 * Existing saved snapshots are not recalculated or migrated.
 * The original average and recommendation thresholds remain unchanged.
 */
export const scoreValidation = (scores = {}, { assumptions = {}, evidenceCount = 0, evidenceReviewed = false } = {}) => {
  const assessedCount = VALIDATE_DIMENSIONS.filter(({ key }) =>
    typeof scores[key] === "number" && Number.isInteger(scores[key]) && scores[key] >= 1 && scores[key] <= 5
  ).length;
  if (assessedCount === 0) return { average: null, assessedCount, recommendation: "Not assessed", reason: "Rate the dimensions you have assessed. Unknown is different from weak." };
  if (assessedCount < VALIDATE_DIMENSIONS.length) return { average: null, assessedCount, recommendation: "Assessment incomplete", reason: "Assess the remaining dimensions before comparing the overall opportunity." };
  const average = averageScore(scores);
  let reason;
  if (!assumptions.problem?.trim() || !assumptions.audience?.trim()) reason = "Describe the problem and audience assumptions before drawing a conclusion.";
  else if (evidenceCount < 1) reason = "Attach relevant evidence and review its quality, including evidence against the idea.";
  else if (!evidenceReviewed) reason = "Review the attached evidence and its limitations. Attaching a signal does not establish that a claim is credible.";
  else if (scores.evidenceStrength < 3) reason = "Evidence is rated weak. Gather or test evidence before choosing whether to build, pivot, or park.";
  if (reason) return { average, assessedCount, recommendation: "Validate Further", reason };
  return { average, assessedCount, recommendation: recommendationFor(average), reason: "A score-based suggestion using your ratings and evidence review, not an independent validation. Consider conflicting signals and record your judgment." };
};
