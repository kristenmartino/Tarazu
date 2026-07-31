import { describe, it, expect } from "vitest";
import {
  VALIDATE_DIMENSIONS,
  ASSUMPTION_CATEGORIES,
  averageScore,
  recommendationFor,
  scoreValidation,
} from "./validationScore";

const allDims = (v) => Object.fromEntries(VALIDATE_DIMENSIONS.map((d) => [d.key, v]));

describe("averageScore", () => {
  it("averages the seven dimensions", () => {
    expect(averageScore(allDims(3))).toBe(3);
    expect(averageScore(allDims(5))).toBe(5);
  });

  it("uses 7 as the denominator and treats missing dims as 0", () => {
    // one dim = 7, the rest absent → 7/7 = 1
    expect(averageScore({ problemSeverity: 7 })).toBe(1);
  });

  it("handles a mixed set", () => {
    const scores = allDims(4);
    scores.buildFeasibility = 1; // six 4s + one 1 = 25/7
    expect(averageScore(scores)).toBeCloseTo(25 / 7, 5);
  });
});

describe("recommendationFor (threshold boundaries)", () => {
  it("4.0 => Build", () => expect(recommendationFor(4.0)).toBe("Build"));
  it("just below 4.0 => Validate Further", () => expect(recommendationFor(3.99)).toBe("Validate Further"));
  it("3.2 => Validate Further", () => expect(recommendationFor(3.2)).toBe("Validate Further"));
  it("just below 3.2 => Pivot", () => expect(recommendationFor(3.19)).toBe("Pivot"));
  it("2.4 => Pivot", () => expect(recommendationFor(2.4)).toBe("Pivot"));
  it("just below 2.4 => Park", () => expect(recommendationFor(2.39)).toBe("Park"));
  it("very low => Park", () => expect(recommendationFor(1)).toBe("Park"));
});

describe("scoreValidation", () => {
  it("returns average and recommendation together", () => {
    expect(scoreValidation(allDims(4))).toEqual({ average: 4, recommendation: "Build" });
    expect(scoreValidation(allDims(3))).toEqual({ average: 3, recommendation: "Pivot" });
  });
});

// The expected keys and labels are written out literally rather than derived
// from the module. Deriving them (`VALIDATE_DIMENSIONS.map(d => d.key)`) makes
// the assertion circular: if a key is emptied, both sides change together and
// the test still passes. That circularity is exactly why the previous
// length-and-uniqueness check let 35 mutants through — blanking one key leaves
// the array 7 long with 7 distinct values.
const EXPECTED_DIMENSIONS = [
  ["problemSeverity", "Problem severity"],
  ["evidenceStrength", "Evidence strength"],
  ["marketPull", "Market pull"],
  ["differentiation", "Differentiation"],
  ["monetizationClarity", "Monetization clarity"],
  ["buildFeasibility", "Build feasibility"],
  ["strategicFit", "Strategic fit"],
];

const EXPECTED_ASSUMPTIONS = [
  ["problem", "Problem"],
  ["audience", "Audience"],
  ["workaround", "Current workaround"],
  ["willingness", "Willingness to pay / adopt"],
  ["differentiation", "Differentiation"],
  ["feasibility", "Feasibility"],
];

describe("VALIDATE_DIMENSIONS — every key is wired into scoring", () => {
  // The consequence test, not a snapshot. averageScore reads scores[d.key], so
  // a renamed or blanked key means that dimension is silently read as 0 — every
  // score drifts down and nothing throws. Setting one dimension to 7 must yield
  // exactly 7/7 = 1; if the key no longer matches, this returns 0.
  it.each(EXPECTED_DIMENSIONS.map(([key]) => key))(
    "%s contributes to the average",
    (key) => {
      expect(averageScore({ [key]: 7 })).toBe(1);
    }
  );

  it("has exactly these keys, in this order", () => {
    expect(VALIDATE_DIMENSIONS.map((d) => d.key)).toEqual(
      EXPECTED_DIMENSIONS.map(([key]) => key)
    );
  });

  it("labels every dimension with the expected display text", () => {
    // Labels are the Validate screen's column headers — an emptied one renders
    // a blank header rather than failing, so it needs pinning somewhere.
    expect(VALIDATE_DIMENSIONS.map((d) => d.label)).toEqual(
      EXPECTED_DIMENSIONS.map(([, label]) => label)
    );
  });

  it("scores each dimension independently of the others", () => {
    // Guards the reduce: were it to read a fixed key, or double-count, these
    // would not stay distinct.
    const only = (key) => averageScore({ [key]: 7 });
    const results = EXPECTED_DIMENSIONS.map(([key]) => only(key));
    expect(results).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(averageScore({ problemSeverity: 7, strategicFit: 7 })).toBe(2);
  });
});

describe("ASSUMPTION_CATEGORIES", () => {
  it("has exactly these key/label pairs, in this order", () => {
    expect(ASSUMPTION_CATEGORIES.map((c) => [c.key, c.label])).toEqual(
      EXPECTED_ASSUMPTIONS
    );
  });

  it("keeps 'differentiation' distinct from the dimension of the same name", () => {
    // Both lists carry a `differentiation` key. They are separate concepts —
    // one is an assumption to validate, one is a scored dimension — and the
    // collision is easy to "fix" by renaming one, which would break the other.
    expect(ASSUMPTION_CATEGORIES.map((c) => c.key)).toContain("differentiation");
    expect(VALIDATE_DIMENSIONS.map((d) => d.key)).toContain("differentiation");
  });
});

describe("metadata shape", () => {
  it("exposes 7 dimensions and 6 assumption categories with unique keys", () => {
    expect(VALIDATE_DIMENSIONS).toHaveLength(7);
    expect(ASSUMPTION_CATEGORIES).toHaveLength(6);
    expect(new Set(VALIDATE_DIMENSIONS.map((d) => d.key)).size).toBe(7);
    expect(new Set(ASSUMPTION_CATEGORIES.map((c) => c.key)).size).toBe(6);
  });

  it("gives every entry a non-empty key and label", () => {
    for (const entry of [...VALIDATE_DIMENSIONS, ...ASSUMPTION_CATEGORIES]) {
      expect(entry.key).toBeTruthy();
      expect(entry.label).toBeTruthy();
    }
  });
});
