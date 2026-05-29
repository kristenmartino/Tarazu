import { useMemo } from "react";

const EPS = 1e-9;
const pow = (v, e) => Math.pow(Math.max(v, EPS), e);

/**
 * Weighted RICE using per-dimension exponents.
 *
 * At weights (1,1,1,1) this is exactly standard RICE, so the "Standard RICE"
 * preset matches the default ranking. Crucially, unequal weights *reorder*
 * candidates — unlike a linear multiplier (reach·w · impact·w · …), which
 * factors out to RICE × (w_r·w_i·w_c/w_e), a single constant applied to every
 * candidate that can never change their relative order.
 */
export const weightedRice = (f, w) =>
  Math.round(
    (pow(f.reach, w.reach) * pow(f.impact, w.impact) * pow(f.confidence, w.confidence)) /
      pow(Math.max(f.effort, 1), w.effort)
  );

/**
 * Explains why a candidate's standing shifts relative to standard RICE, per
 * dimension. In log space the score is additive:
 *   ln(score) = w_r·ln(reach) + w_i·ln(impact) + w_c·ln(confidence) − w_e·ln(effort)
 * so the shift from baseline (all weights 1) attributable to dimension d is
 * (w_d − 1)·ln(value_d), negated for effort (more effort lowers the score).
 * Returned sorted by absolute impact, largest driver first.
 */
export const scenarioContributions = (f, w) => {
  const ln = (v) => Math.log(Math.max(v, 1));
  return [
    { dim: "reach", delta: (w.reach - 1) * ln(f.reach) },
    { dim: "impact", delta: (w.impact - 1) * ln(f.impact) },
    { dim: "confidence", delta: (w.confidence - 1) * ln(f.confidence) },
    { dim: "effort", delta: -(w.effort - 1) * ln(f.effort) },
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
};

export const useWeightedScored = (features, weights) =>
  useMemo(() => {
    const raw = features.map((f) => ({ ...f, weightedScore: weightedRice(f, weights) }));
    const maxScore = raw.reduce((m, f) => Math.max(m, f.weightedScore), 0) || 1;
    // Raw exponential magnitudes aren't meaningful to read; expose a normalized
    // 0–100 index for display. Ranking still uses weightedScore.
    const scored = raw.map((f) => ({
      ...f,
      scenarioIndex: Math.round((f.weightedScore / maxScore) * 100),
    }));
    const sorted = [...scored].sort((a, b) => b.weightedScore - a.weightedScore);
    return { scored, sorted, maxScore };
  }, [features, weights]);
