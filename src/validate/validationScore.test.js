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

describe("metadata", () => {
  it("exposes 7 dimensions and 6 assumption categories with unique keys", () => {
    expect(VALIDATE_DIMENSIONS).toHaveLength(7);
    expect(ASSUMPTION_CATEGORIES).toHaveLength(6);
    expect(new Set(VALIDATE_DIMENSIONS.map((d) => d.key)).size).toBe(7);
    expect(new Set(ASSUMPTION_CATEGORIES.map((c) => c.key)).size).toBe(6);
  });
});
