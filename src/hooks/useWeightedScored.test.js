import { describe, it, expect } from "vitest";
import { weightedRice, scenarioContributions } from "./useWeightedScored";
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
