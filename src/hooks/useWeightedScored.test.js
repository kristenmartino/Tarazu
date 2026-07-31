import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { weightedRice, scenarioContributions, useWeightedScored } from "./useWeightedScored";
import { rice } from "../utils";

const UNIT = { reach: 1, impact: 1, confidence: 1, effort: 1 };

// reach-heavy vs impact-heavy candidates with identical RICE
const reachHeavy = { id: "r", reach: 90, impact: 50, confidence: 50, effort: 50 };
const impactHeavy = { id: "i", reach: 50, impact: 90, confidence: 50, effort: 50 };

describe("weightedRice", () => {
  it("reduces to standard RICE at unit weights", () => {
    for (const f of [reachHeavy, impactHeavy, { reach: 33, impact: 71, confidence: 12, effort: 88 }]) {
      expect(weightedRice(f, UNIT)).toBe(rice(f));
    }
  });

  it("ties when RICE ties at unit weights", () => {
    expect(weightedRice(reachHeavy, UNIT)).toBe(weightedRice(impactHeavy, UNIT));
  });

  it("reorders candidates when a weight changes (a linear multiplier could not)", () => {
    const reachWeighted = { ...UNIT, reach: 3 };
    expect(weightedRice(reachHeavy, reachWeighted)).toBeGreaterThan(weightedRice(impactHeavy, reachWeighted));

    const impactWeighted = { ...UNIT, impact: 3 };
    expect(weightedRice(impactHeavy, impactWeighted)).toBeGreaterThan(weightedRice(reachHeavy, impactWeighted));
  });

  it("penalizes higher effort relatively more as the effort weight rises", () => {
    const low = { reach: 50, impact: 50, confidence: 50, effort: 40 };
    const high = { reach: 50, impact: 50, confidence: 50, effort: 80 };
    const heavyEffort = { ...UNIT, effort: 2 };
    // Exponentiating effort shrinks all scores but widens the low:high ratio.
    const ratio = (w) => weightedRice(low, w) / weightedRice(high, w);
    expect(ratio(heavyEffort)).toBeGreaterThan(ratio(UNIT));
  });
});

// These tests assert the ordering of each dimension's contribution to a single
// candidate's weighted score. They do NOT assert pairwise rank causality —
// rank movement is comparative across the whole list, which this does not model.
describe("scenarioContributions", () => {
  it("returns no effect at unit weights", () => {
    for (const c of scenarioContributions(reachHeavy, UNIT)) {
      expect(c.delta === 0).toBe(true); // tolerates -0
    }
  });

  it("names the up-weighted high-value dimension as the top driver", () => {
    const driver = scenarioContributions(reachHeavy, { ...UNIT, reach: 3 })[0];
    expect(driver.dim).toBe("reach");
    expect(driver.delta).toBeGreaterThan(0);
  });

  it("treats a raised effort weight as a negative driver", () => {
    const top = scenarioContributions(reachHeavy, { ...UNIT, effort: 3 })[0];
    expect(top.dim).toBe("effort");
    expect(top.delta).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Below: exact delta values (the tests above assert only ordering and sign, so
// every `*` could become `/` undetected), plus the hook itself — 18 mutants had
// no coverage at all because nothing ever rendered it.
//
// @testing-library/react is added for this. The repo previously worked around
// its absence by instantiating component classes directly, which works for a
// class but not for a hook: useMemo cannot run outside a render, and the
// dependency array needs an actual re-render to test at all.
// ---------------------------------------------------------------------------

describe("scenarioContributions — exact contributions", () => {
  const flat = { reach: 100, impact: 100, confidence: 100, effort: 100 };
  const LN100 = Math.log(100);

  it("scales each dimension by (weight - 1) * ln(value), negated for effort", () => {
    const out = scenarioContributions(flat, { reach: 2, impact: 3, confidence: 4, effort: 5 });

    // sorted by |delta| desc: effort 4x, confidence 3x, impact 2x, reach 1x
    expect(out.map((c) => c.dim)).toEqual(["effort", "confidence", "impact", "reach"]);
    expect(out[0].delta).toBeCloseTo(-4 * LN100, 9);
    expect(out[1].delta).toBeCloseTo(3 * LN100, 9);
    expect(out[2].delta).toBeCloseTo(2 * LN100, 9);
    expect(out[3].delta).toBeCloseTo(1 * LN100, 9);
  });

  it("names all four dimensions", () => {
    const dims = scenarioContributions(flat, { reach: 2, impact: 3, confidence: 4, effort: 5 })
      .map((c) => c.dim)
      .sort();
    expect(dims).toEqual(["confidence", "effort", "impact", "reach"]);
  });

  it("floors values at 1 before taking the log", () => {
    // ln(max(0,1)) === 0, so a zero-valued dimension contributes nothing rather
    // than -Infinity.
    const out = scenarioContributions({ reach: 0, impact: 0, confidence: 0, effort: 0 }, { reach: 5, impact: 5, confidence: 5, effort: 5 });
    // `=== 0` rather than toBe(0): effort's negation yields -0, and Object.is
    // distinguishes the two. Same convention as the unit-weights test above.
    for (const c of out) expect(c.delta === 0).toBe(true);
  });

  it("sorts by absolute magnitude, so a large negative outranks a small positive", () => {
    const out = scenarioContributions(flat, { reach: 2, impact: 1, confidence: 1, effort: 9 });
    expect(out[0].dim).toBe("effort");
    expect(out[0].delta).toBeLessThan(0);
    expect(Math.abs(out[0].delta)).toBeGreaterThan(Math.abs(out[1].delta));
  });
});

describe("useWeightedScored", () => {
  const A = { id: "a", reach: 90, impact: 50, confidence: 50, effort: 50 };
  const B = { id: "b", reach: 50, impact: 90, confidence: 50, effort: 50 };
  const Cc = { id: "c", reach: 10, impact: 10, confidence: 10, effort: 90 };

  it("attaches weightedScore and a 0-100 scenarioIndex to every feature", () => {
    const { result } = renderHook(() => useWeightedScored([A, B, Cc], UNIT));
    const { scored, maxScore } = result.current;

    expect(scored).toHaveLength(3);
    for (const f of scored) {
      expect(f.weightedScore).toBe(weightedRice(f, UNIT));
      expect(f.scenarioIndex).toBe(Math.round((f.weightedScore / maxScore) * 100));
      expect(f.scenarioIndex).toBeLessThanOrEqual(100);
    }
  });

  it("indexes the top-scoring feature at exactly 100", () => {
    const { result } = renderHook(() => useWeightedScored([A, B, Cc], UNIT));
    const top = [...result.current.scored].sort((x, y) => y.weightedScore - x.weightedScore)[0];
    expect(top.scenarioIndex).toBe(100);
  });

  it("reports maxScore as the highest weighted score", () => {
    const { result } = renderHook(() => useWeightedScored([A, B, Cc], UNIT));
    expect(result.current.maxScore).toBe(
      Math.max(...[A, B, Cc].map((f) => weightedRice(f, UNIT)))
    );
  });

  it("preserves input order in `scored` and sorts `sorted` descending", () => {
    const { result } = renderHook(() => useWeightedScored([Cc, A, B], UNIT));
    expect(result.current.scored.map((f) => f.id)).toEqual(["c", "a", "b"]);

    const order = result.current.sorted.map((f) => f.weightedScore);
    expect([...order]).toEqual([...order].sort((x, y) => y - x));
    expect(result.current.sorted.at(-1).id).toBe("c"); // lowest score last
  });

  it("does not mutate the array it sorts", () => {
    const { result } = renderHook(() => useWeightedScored([Cc, A, B], UNIT));
    expect(result.current.scored.map((f) => f.id)).toEqual(["c", "a", "b"]);
    expect(result.current.sorted).not.toBe(result.current.scored);
  });

  it("falls back to a maxScore of 1 rather than dividing by zero", () => {
    const { result } = renderHook(() => useWeightedScored([], UNIT));
    expect(result.current.maxScore).toBe(1);
    expect(result.current.scored).toEqual([]);
    expect(result.current.sorted).toEqual([]);
  });

  it("recomputes when the weights change", () => {
    // Guards the useMemo dependency array: with [] the hook would keep serving
    // the first render's scores while the UI shows new weights.
    const { result, rerender } = renderHook(
      ({ weights }) => useWeightedScored([A, B], weights),
      { initialProps: { weights: UNIT } }
    );

    expect(result.current.sorted[0].weightedScore).toBe(result.current.sorted[1].weightedScore);

    rerender({ weights: { ...UNIT, reach: 3 } });

    expect(result.current.sorted[0].id).toBe("a");
    expect(result.current.sorted[0].weightedScore).toBeGreaterThan(
      result.current.sorted[1].weightedScore
    );
  });

  it("recomputes when the feature list changes", () => {
    const { result, rerender } = renderHook(
      ({ features }) => useWeightedScored(features, UNIT),
      { initialProps: { features: [A] } }
    );
    expect(result.current.scored).toHaveLength(1);

    rerender({ features: [A, B, Cc] });
    expect(result.current.scored).toHaveLength(3);
  });

  it("returns all three keys", () => {
    const { result } = renderHook(() => useWeightedScored([A], UNIT));
    expect(Object.keys(result.current).sort()).toEqual(["maxScore", "scored", "sorted"]);
  });
});
