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

/**
 * Convenience: average + recommendation for a set of dimension scores.
 * @param {Record<string, number>} scores
 * @returns {{ average: number, recommendation: ReturnType<typeof recommendationFor> }}
 */
export const scoreValidation = (scores) => {
  const average = averageScore(scores);
  return { average, recommendation: recommendationFor(average) };
};
