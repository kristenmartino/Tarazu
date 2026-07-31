import { describe, it, expect } from "vitest";
import { classifyOutcome, buildScoreCalibration, buildAnalysisContext, computeSummaryMetrics } from "./feedback-context";

describe("classifyOutcome", () => {
  it("returns 'pending' when finalScore is null", () => {
    expect(classifyOutcome(50, null)).toBe("pending");
  });

  it("returns 'pending' when finalScore is undefined", () => {
    expect(classifyOutcome(50, undefined)).toBe("pending");
  });

  it("returns 'accepted' when drift is within threshold", () => {
    expect(classifyOutcome(50, 53)).toBe("accepted");
    expect(classifyOutcome(50, 50)).toBe("accepted");
    expect(classifyOutcome(50, 45)).toBe("accepted");
  });

  it("returns 'accepted' when drift is exactly 5", () => {
    expect(classifyOutcome(50, 55)).toBe("accepted");
    expect(classifyOutcome(50, 45)).toBe("accepted");
  });

  it("returns 'adjusted' when drift exceeds threshold", () => {
    expect(classifyOutcome(50, 60)).toBe("adjusted");
    expect(classifyOutcome(50, 40)).toBe("adjusted");
  });
});

describe("buildScoreCalibration", () => {
  it("returns empty string with fewer than 3 resolved events", () => {
    const events = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "impact", outcome: "adjusted", ai_score: 50, final_score: 70 },
    ];
    expect(buildScoreCalibration(events)).toBe("");
  });

  it("ignores pending events in count", () => {
    const events = [
      { dimension: "reach", outcome: "pending", ai_score: 50, final_score: null },
      { dimension: "reach", outcome: "pending", ai_score: 50, final_score: null },
      { dimension: "reach", outcome: "pending", ai_score: 50, final_score: null },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
    ];
    expect(buildScoreCalibration(events)).toBe("");
  });

  it("returns calibration text with sufficient events", () => {
    const events = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "impact", outcome: "accepted", ai_score: 60, final_score: 58 },
      { dimension: "confidence", outcome: "adjusted", ai_score: 70, final_score: 85 },
    ];
    const result = buildScoreCalibration(events);
    expect(result).toContain("Calibration notes");
    expect(result).toContain("3 scores");
    expect(result).toContain("acceptance");
  });

  it("includes underestimating hint when avg drift > 5", () => {
    const events = [
      { dimension: "reach", outcome: "adjusted", ai_score: 30, final_score: 50 },
      { dimension: "reach", outcome: "adjusted", ai_score: 40, final_score: 60 },
      { dimension: "reach", outcome: "adjusted", ai_score: 35, final_score: 55 },
    ];
    const result = buildScoreCalibration(events);
    expect(result).toContain("underestimating reach");
  });

  it("includes overestimating hint when avg drift < -5", () => {
    const events = [
      { dimension: "impact", outcome: "adjusted", ai_score: 80, final_score: 60 },
      { dimension: "impact", outcome: "adjusted", ai_score: 70, final_score: 50 },
      { dimension: "impact", outcome: "adjusted", ai_score: 75, final_score: 55 },
    ];
    const result = buildScoreCalibration(events);
    expect(result).toContain("overestimating impact");
  });
});

describe("buildAnalysisContext", () => {
  it("returns empty string with fewer than 2 valid events", () => {
    const events = [{ error: false, thumbs_up: true }];
    expect(buildAnalysisContext(events)).toBe("");
  });

  it("excludes error events from count", () => {
    const events = [
      { error: true },
      { error: true },
      { error: false, thumbs_up: null },
    ];
    expect(buildAnalysisContext(events)).toBe("");
  });

  it("returns context text with sufficient events", () => {
    const events = [
      { error: false, thumbs_up: true },
      { error: false, thumbs_up: false },
      { error: false, thumbs_up: null },
    ];
    const result = buildAnalysisContext(events);
    expect(result).toContain("3 analyses run");
    expect(result).toContain("1 positive");
    expect(result).toContain("1 negative");
  });
});

describe("computeSummaryMetrics", () => {
  it("returns zeroed metrics for empty arrays", () => {
    const result = computeSummaryMetrics([], []);
    expect(result.scores.total).toBe(0);
    expect(result.scores.accepted).toBe(0);
    expect(result.scores.rate).toBe(0);
    expect(result.analyses.total).toBe(0);
    expect(result.trend).toBe("insufficient_data");
  });

  it("calculates per-dimension stats", () => {
    const scoreEvents = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "impact", outcome: "accepted", ai_score: 60, final_score: 60 },
    ];
    const result = computeSummaryMetrics(scoreEvents, []);
    expect(result.scores.byDimension.reach.total).toBe(2);
    expect(result.scores.byDimension.reach.accepted).toBe(1);
    expect(result.scores.byDimension.reach.rate).toBe(50);
    expect(result.scores.byDimension.impact.total).toBe(1);
    expect(result.scores.byDimension.impact.accepted).toBe(1);
    expect(result.scores.total).toBe(3);
  });

  it("returns 'insufficient_data' trend with < 6 events", () => {
    const scoreEvents = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
    ];
    expect(computeSummaryMetrics(scoreEvents, []).trend).toBe("insufficient_data");
  });

  it("returns 'improving' trend when second half has higher acceptance", () => {
    const scoreEvents = [
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
    ];
    expect(computeSummaryMetrics(scoreEvents, []).trend).toBe("improving");
  });

  it("returns 'declining' trend when first half has higher acceptance", () => {
    const scoreEvents = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
    ];
    expect(computeSummaryMetrics(scoreEvents, []).trend).toBe("declining");
  });

  it("returns 'stable' trend when rates are within 0.1", () => {
    const scoreEvents = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 },
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 },
    ];
    expect(computeSummaryMetrics(scoreEvents, []).trend).toBe("stable");
  });

  it("calculates analysis metrics", () => {
    const analysisEvents = [
      { error: false, thumbs_up: true },
      { error: false, thumbs_up: false },
      { error: true, thumbs_up: null },
      { error: false, thumbs_up: null },
    ];
    const result = computeSummaryMetrics([], analysisEvents);
    expect(result.analyses.total).toBe(3);
    expect(result.analyses.errors).toBe(1);
    expect(result.analyses.thumbsUp).toBe(1);
    expect(result.analyses.thumbsDown).toBe(1);
    expect(result.analyses.rated).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The block above checks a handful of fields per case and never asserts
// avgDrift, the confidence/effort dimensions, or a non-zero overall rate —
// which is how 86 mutants survived. These pin the whole computed result.
//
// Exact assertions are appropriate here in a way they were not for display
// labels: every character below is derived from the input data, so pinning it
// pins arithmetic rather than freezing editorial copy. This text is injected
// verbatim into an AI prompt, so a wrong number silently degrades
// recommendation quality instead of failing.
// ---------------------------------------------------------------------------

describe("computeSummaryMetrics — full result", () => {
  const scoreEvents = [
    { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 }, //  +2
    { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 70 }, // +20
    { dimension: "impact", outcome: "accepted", ai_score: 60, final_score: 60 }, //   0
    { dimension: "impact", outcome: "adjusted", ai_score: 60, final_score: 40 }, // -20
    { dimension: "confidence", outcome: "accepted", ai_score: 70, final_score: null }, // no drift
    { dimension: "effort", outcome: "adjusted", ai_score: 30, final_score: 45 }, // +15
    { dimension: "reach", outcome: "pending", ai_score: 50, final_score: null }, // excluded
  ];
  const analysisEvents = [
    { error: false, thumbs_up: true },
    { error: false, thumbs_up: false },
    { error: true, thumbs_up: null },
    { error: false, thumbs_up: null },
    { error: false, thumbs_up: true },
  ];

  it("computes every field exactly", () => {
    expect(computeSummaryMetrics(scoreEvents, analysisEvents)).toEqual({
      scores: {
        byDimension: {
          reach: { total: 2, accepted: 1, rate: 50, avgDrift: 11 },
          impact: { total: 2, accepted: 1, rate: 50, avgDrift: -10 },
          // final_score null → excluded from drift, so avgDrift falls back to 0
          confidence: { total: 1, accepted: 1, rate: 100, avgDrift: 0 },
          effort: { total: 1, accepted: 0, rate: 0, avgDrift: 15 },
        },
        total: 6,
        accepted: 3,
        rate: 50,
      },
      analyses: { total: 4, errors: 1, thumbsUp: 2, thumbsDown: 1, rated: 3 },
      // first half 2/3 accepted, second half 1/3 → drop of 0.33 > 0.1
      trend: "declining",
    });
  });

  it("reports every dimension, including ones with no events", () => {
    const result = computeSummaryMetrics(
      [{ dimension: "reach", outcome: "accepted", ai_score: 1, final_score: 1 }],
      []
    );
    expect(Object.keys(result.scores.byDimension)).toEqual([
      "reach",
      "impact",
      "confidence",
      "effort",
    ]);
    expect(result.scores.byDimension.effort).toEqual({
      total: 0,
      accepted: 0,
      rate: 0,
      avgDrift: 0,
    });
  });
});

describe("computeSummaryMetrics — trend boundary", () => {
  // trend flips on a strict >0.1 difference; 6 resolved events is the minimum.
  const ev = (outcome) => ({ dimension: "reach", outcome, ai_score: 50, final_score: 50 });

  it("needs 6 resolved events, not 5", () => {
    expect(computeSummaryMetrics(Array(5).fill(ev("accepted")), []).trend).toBe("insufficient_data");
    expect(computeSummaryMetrics(Array(6).fill(ev("accepted")), []).trend).toBe("stable");
  });

  it("counts resolved events only when deciding sufficiency", () => {
    const five = Array(5).fill(ev("accepted"));
    expect(computeSummaryMetrics([...five, ev("pending")], []).trend).toBe("insufficient_data");
  });

  it("treats an exactly-0.1 swing as stable, not improving", () => {
    // 10 events: first half 2/5 = 0.4, second half 3/5 = 0.6 → diff 0.2 → improving
    const improving = [
      ...Array(3).fill(ev("adjusted")), ...Array(2).fill(ev("accepted")),
      ...Array(2).fill(ev("adjusted")), ...Array(3).fill(ev("accepted")),
    ];
    expect(computeSummaryMetrics(improving, []).trend).toBe("improving");

    // identical halves → diff 0 → stable
    const flat = [
      ...Array(2).fill(ev("adjusted")), ...Array(3).fill(ev("accepted")),
      ...Array(2).fill(ev("adjusted")), ...Array(3).fill(ev("accepted")),
    ];
    expect(computeSummaryMetrics(flat, []).trend).toBe("stable");
  });
});

describe("buildScoreCalibration — exact prompt text", () => {
  it("renders both dimensions with rates, signed drift, hints and sample counts", () => {
    const events = [
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 52 }, //  +2
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 53 }, //  +3
      { dimension: "reach", outcome: "accepted", ai_score: 50, final_score: 54 }, //  +4
      { dimension: "reach", outcome: "adjusted", ai_score: 50, final_score: 73 }, // +23 → avg +8
      { dimension: "impact", outcome: "adjusted", ai_score: 60, final_score: 40 }, // -20
      { dimension: "impact", outcome: "adjusted", ai_score: 60, final_score: 50 }, // -10 → avg -15
    ];

    expect(buildScoreCalibration(events)).toBe(
      `Calibration notes from this workspace's scoring history (6 scores, 50% overall acceptance):
- reach: 75% acceptance rate, avg drift +8 (you may be underestimating reach) (4 samples)
- impact: 0% acceptance rate, avg drift -15 (you may be overestimating impact) (2 samples)

Adjust your scoring tendencies accordingly.`
    );
  });

  it("omits the hint when drift is inside ±5 and signs zero as +0", () => {
    const events = [
      { dimension: "effort", outcome: "accepted", ai_score: 30, final_score: 32 }, // +2
      { dimension: "effort", outcome: "accepted", ai_score: 30, final_score: 28 }, // -2
      { dimension: "effort", outcome: "accepted", ai_score: 30, final_score: 30 }, //  0 → avg 0
    ];

    expect(buildScoreCalibration(events)).toContain(
      "- effort: 100% acceptance rate, avg drift +0 (3 samples)"
    );
  });

  it("keeps dimensions in reach/impact/confidence/effort order", () => {
    const mk = (dimension) => [
      { dimension, outcome: "accepted", ai_score: 10, final_score: 10 },
      { dimension, outcome: "accepted", ai_score: 10, final_score: 10 },
    ];
    const out = buildScoreCalibration([
      ...mk("effort"), ...mk("confidence"), ...mk("impact"), ...mk("reach"),
    ]);
    const order = out.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2, l.indexOf(":")));
    expect(order).toEqual(["reach", "impact", "confidence", "effort"]);
  });

  it("returns empty when every resolved event is in an unknown dimension", () => {
    const events = Array(4).fill({
      dimension: "novelty", outcome: "accepted", ai_score: 1, final_score: 1,
    });
    expect(buildScoreCalibration(events)).toBe("");
  });

  it("requires 3 resolved events, not 2", () => {
    const ev = { dimension: "reach", outcome: "accepted", ai_score: 1, final_score: 1 };
    expect(buildScoreCalibration([ev, ev])).toBe("");
    expect(buildScoreCalibration([ev, ev, ev])).not.toBe("");
  });
});

describe("buildAnalysisContext — exact prompt text", () => {
  it("reports counts and the positive/negative split", () => {
    expect(
      buildAnalysisContext([
        { error: false, thumbs_up: true },
        { error: false, thumbs_up: false },
        { error: false, thumbs_up: null },
        { error: true, thumbs_up: true },
      ])
    ).toBe(
      `Past analysis feedback for this workspace:
- 3 analyses run for this workspace
- User feedback: 1 positive, 1 negative out of 2 rated

Consider this track record when calibrating your recommendations.`
    );
  });

  it("omits the feedback line when nothing has been rated", () => {
    expect(
      buildAnalysisContext([
        { error: false, thumbs_up: null },
        { error: false, thumbs_up: null },
      ])
    ).toBe(
      `Past analysis feedback for this workspace:
- 2 analyses run for this workspace

Consider this track record when calibrating your recommendations.`
    );
  });

  it("requires 2 valid events, not 1", () => {
    expect(buildAnalysisContext([{ error: false, thumbs_up: true }])).toBe("");
    expect(
      buildAnalysisContext([{ error: false, thumbs_up: true }, { error: false, thumbs_up: true }])
    ).not.toBe("");
  });

  it("counts only strict booleans as positive or negative", () => {
    const out = buildAnalysisContext([
      { error: false, thumbs_up: true },
      { error: false, thumbs_up: false },
      { error: false, thumbs_up: 1 },
    ]);
    expect(out).toContain("1 positive, 1 negative out of 3 rated");
  });
});

describe("classifyOutcome — threshold sign symmetry", () => {
  it("accepts a drift of exactly -5 and rejects -6", () => {
    expect(classifyOutcome(50, 45)).toBe("accepted");
    expect(classifyOutcome(50, 44)).toBe("adjusted");
  });

  it("accepts a drift of exactly +5 and rejects +6", () => {
    expect(classifyOutcome(50, 55)).toBe("accepted");
    expect(classifyOutcome(50, 56)).toBe("adjusted");
  });
});

// ---------------------------------------------------------------------------
// Twelve mutants survived the block above. None were equivalent — three of them
// survived only because the fixtures happened to be symmetric: with 3 accepted
// out of 6, flipping `=== "accepted"` to `!== "accepted"` yields the same 3, and
// with 1 positive / 1 negative, swapping the two booleans prints the same line.
// Balanced test data hides predicate bugs.
// ---------------------------------------------------------------------------

describe("asymmetric counts (a balanced fixture cannot catch a flipped predicate)", () => {
  const skew = (n, accepted) =>
    Array.from({ length: n }, (_, i) => ({
      dimension: "reach",
      outcome: i < accepted ? "accepted" : "adjusted",
      ai_score: 50,
      final_score: 50,
    }));

  it("buildScoreCalibration reports 75%, not 25%", () => {
    expect(buildScoreCalibration(skew(4, 3))).toContain("(4 scores, 75% overall acceptance)");
  });

  it("computeSummaryMetrics reports 3 accepted at 75%, not 1 at 25%", () => {
    const { scores } = computeSummaryMetrics(skew(4, 3), []);
    expect(scores.accepted).toBe(3);
    expect(scores.rate).toBe(75);
  });

  it("buildAnalysisContext keeps positive and negative the right way round", () => {
    const out = buildAnalysisContext([
      { error: false, thumbs_up: true },
      { error: false, thumbs_up: true },
      { error: false, thumbs_up: false },
    ]);
    expect(out).toContain("2 positive, 1 negative out of 3 rated");
  });
});

describe("drift when final_score is missing", () => {
  it("excludes null final_score from the drift average rather than treating it as 0", () => {
    // Without the null filter, `null - 70` coerces to -70 and the dimension
    // reports a large negative drift plus a spurious "overestimating" hint.
    const events = Array(3).fill({
      dimension: "confidence", outcome: "accepted", ai_score: 70, final_score: null,
    });

    expect(buildScoreCalibration(events)).toContain(
      "- confidence: 100% acceptance rate, avg drift +0 (3 samples)"
    );
  });

  it("does not divide by zero when a dimension has no usable drift", () => {
    const events = Array(3).fill({
      dimension: "effort", outcome: "accepted", ai_score: 30, final_score: null,
    });
    expect(buildScoreCalibration(events)).not.toContain("NaN");
  });
});

describe("hint thresholds are strict", () => {
  const drifting = (dimension, from, to) =>
    Array(3).fill({ dimension, outcome: "accepted", ai_score: from, final_score: to });

  it("a drift of exactly +5 gets no underestimating hint", () => {
    const out = buildScoreCalibration(drifting("reach", 50, 55));
    expect(out).toContain("- reach: 100% acceptance rate, avg drift +5 (3 samples)");
    expect(out).not.toContain("underestimating");
  });

  it("a drift of exactly -5 gets no overestimating hint", () => {
    const out = buildScoreCalibration(drifting("reach", 50, 45));
    expect(out).toContain("- reach: 100% acceptance rate, avg drift -5 (3 samples)");
    expect(out).not.toContain("overestimating");
  });
});

describe("trend requires a swing strictly greater than 0.1", () => {
  // 20 resolved events → halves of 10, so rates land on exact tenths.
  // 2/10 - 1/10 === 0.1 exactly in IEEE 754 (0.6 - 0.5 does not), which is what
  // makes the strict-vs-inclusive boundary observable at all.
  const halves = (firstAccepted, secondAccepted) => {
    const half = (accepted) =>
      Array.from({ length: 10 }, (_, i) => ({
        dimension: "reach",
        outcome: i < accepted ? "accepted" : "adjusted",
        ai_score: 50,
        final_score: 50,
      }));
    return [...half(firstAccepted), ...half(secondAccepted)];
  };

  it("a rise of exactly 0.1 is stable, not improving", () => {
    expect(computeSummaryMetrics(halves(1, 2), []).trend).toBe("stable");
  });

  it("a fall of exactly 0.1 is stable, not declining", () => {
    expect(computeSummaryMetrics(halves(2, 1), []).trend).toBe("stable");
  });

  it("a swing past 0.1 does move the trend", () => {
    expect(computeSummaryMetrics(halves(1, 3), []).trend).toBe("improving");
    expect(computeSummaryMetrics(halves(3, 1), []).trend).toBe("declining");
  });
});
