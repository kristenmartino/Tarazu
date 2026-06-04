import { describe, it, expect, vi } from "vitest";
import { rice, clamp, getTier, getConfidenceColor, getStatusColor, relativeTime, parseCSV, mapCSVToFeatures } from "./utils";
import { C } from "./theme";

describe("rice", () => {
  it("calculates standard RICE score", () => {
    expect(rice({ reach: 80, impact: 60, confidence: 90, effort: 30 })).toBe(Math.round((80 * 60 * 90) / 30));
  });

  it("handles effort of 0 without dividing by zero", () => {
    const result = rice({ reach: 50, impact: 50, confidence: 50, effort: 0 });
    expect(result).toBe(Math.round((50 * 50 * 50) / 1));
  });

  it("calculates all-100s", () => {
    expect(rice({ reach: 100, impact: 100, confidence: 100, effort: 100 })).toBe(10000);
  });

  it("calculates all-1s", () => {
    expect(rice({ reach: 1, impact: 1, confidence: 1, effort: 1 })).toBe(1);
  });
});

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to lo when below", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it("clamps to hi when above", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("returns lo when equal to lo", () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it("returns hi when equal to hi", () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe("getTier", () => {
  it("returns QUICK WIN for low effort, high impact", () => {
    const tier = getTier({ effort: 30, impact: 70 }, C);
    expect(tier.label).toBe("QUICK WIN");
    expect(tier.color).toBe(C.accent);
  });

  it("returns STRATEGIC for high effort, high impact", () => {
    const tier = getTier({ effort: 70, impact: 70 }, C);
    expect(tier.label).toBe("STRATEGIC");
    expect(tier.color).toBe(C.blue);
  });

  it("returns FILL-IN for low effort, low impact", () => {
    const tier = getTier({ effort: 30, impact: 30 }, C);
    expect(tier.label).toBe("FILL-IN");
    expect(tier.color).toBe(C.warn);
  });

  it("returns AVOID for high effort, low impact", () => {
    const tier = getTier({ effort: 70, impact: 30 }, C);
    expect(tier.label).toBe("AVOID");
    expect(tier.color).toBe(C.danger);
  });

  it("boundary: effort=50 impact=51 is QUICK WIN", () => {
    expect(getTier({ effort: 50, impact: 51 }, C).label).toBe("QUICK WIN");
  });

  it("boundary: effort=51 impact=50 is AVOID", () => {
    expect(getTier({ effort: 51, impact: 50 }, C).label).toBe("AVOID");
  });

  it("boundary: effort=50 impact=50 is FILL-IN", () => {
    expect(getTier({ effort: 50, impact: 50 }, C).label).toBe("FILL-IN");
  });
});

describe("getConfidenceColor", () => {
  it("returns accent for confidence >= 75", () => {
    expect(getConfidenceColor(75, C)).toBe(C.accent);
    expect(getConfidenceColor(100, C)).toBe(C.accent);
  });

  it("returns blue for confidence >= 50", () => {
    expect(getConfidenceColor(50, C)).toBe(C.blue);
    expect(getConfidenceColor(74, C)).toBe(C.blue);
  });

  it("returns warn for confidence >= 25", () => {
    expect(getConfidenceColor(25, C)).toBe(C.warn);
    expect(getConfidenceColor(49, C)).toBe(C.warn);
  });

  it("returns danger for confidence < 25", () => {
    expect(getConfidenceColor(24, C)).toBe(C.danger);
    expect(getConfidenceColor(0, C)).toBe(C.danger);
  });
});

describe("getStatusColor", () => {
  it("returns accent for active", () => {
    expect(getStatusColor("active", C)).toBe(C.accent);
  });

  it("returns blue for review", () => {
    expect(getStatusColor("review", C)).toBe(C.blue);
  });

  it("returns danger for blocked", () => {
    expect(getStatusColor("blocked", C)).toBe(C.danger);
  });

  it("returns textDim for done", () => {
    expect(getStatusColor("done", C)).toBe(C.textDim);
  });

  it("returns textMuted for unknown status", () => {
    expect(getStatusColor("unknown", C)).toBe(C.textMuted);
    expect(getStatusColor("", C)).toBe(C.textMuted);
  });
});

describe("relativeTime", () => {
  it("returns empty string for null", () => {
    expect(relativeTime(null)).toBe("");
    expect(relativeTime(undefined)).toBe("");
  });

  it("returns 'just now' for future dates", () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(relativeTime(future)).toBe("just now");
  });

  it("returns 'just now' for < 60 seconds ago", () => {
    const recent = new Date(Date.now() - 30000).toISOString();
    expect(relativeTime(recent)).toBe("just now");
  });

  it("returns minutes for < 60 minutes", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours for < 24 hours", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days for < 30 days", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(fiveDaysAgo)).toBe("5d ago");
  });

  it("returns months for >= 30 days", () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(fortyFiveDaysAgo)).toBe("1mo ago");
  });
});

describe("parseCSV", () => {
  it("parses simple CSV", () => {
    const result = parseCSV("Name,Score\nAlpha,10\nBeta,20");
    expect(result).toEqual({
      headers: ["Name", "Score"],
      rows: [["Alpha", "10"], ["Beta", "20"]],
    });
  });

  it("handles quoted fields with commas", () => {
    const result = parseCSV('Name,Desc\n"Hello, World",test');
    expect(result.rows[0][0]).toBe("Hello, World");
  });

  it("handles escaped quotes", () => {
    const result = parseCSV('Name\n"say ""hello"""\n');
    expect(result.rows[0][0]).toBe('say "hello"');
  });

  it("handles CRLF line endings", () => {
    const result = parseCSV("A,B\r\n1,2\r\n3,4");
    expect(result.rows.length).toBe(2);
    expect(result.rows[0]).toEqual(["1", "2"]);
  });

  it("returns null for header-only CSV", () => {
    expect(parseCSV("Name,Score")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseCSV("")).toBeNull();
  });
});

describe("mapCSVToFeatures", () => {
  it("maps standard columns", () => {
    const parsed = {
      headers: ["Name", "Description", "Reach", "Impact", "Confidence", "Effort"],
      rows: [["Feature A", "Desc A", "80", "60", "90", "30"]],
    };
    const result = mapCSVToFeatures(parsed);
    expect(result.features.length).toBe(1);
    expect(result.features[0].name).toBe("Feature A");
    expect(result.features[0].reach).toBe(80);
    expect(result.features[0].impact).toBe(60);
    expect(result.features[0].confidence).toBe(90);
    expect(result.features[0].effort).toBe(30);
    expect(result.hasRice).toBe(true);
  });

  it("handles alias columns", () => {
    const parsed = {
      headers: ["Title", "Notes", "Reach", "Impact", "Confidence", "Estimate"],
      rows: [["Feature B", "Some notes", "50", "50", "50", "50"]],
    };
    const result = mapCSVToFeatures(parsed);
    expect(result.features[0].name).toBe("Feature B");
    expect(result.features[0].effort).toBe(50);
  });

  it("returns null when name column is missing", () => {
    const parsed = {
      headers: ["Score", "Value"],
      rows: [["10", "20"]],
    };
    expect(mapCSVToFeatures(parsed)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(mapCSVToFeatures(null)).toBeNull();
  });

  it("defaults RICE values to 50 for out-of-range values", () => {
    const parsed = {
      headers: ["Name", "Reach", "Impact", "Confidence", "Effort"],
      rows: [["Test", "200", "-5", "0", "101"]],
    };
    const result = mapCSVToFeatures(parsed);
    expect(result.features[0].reach).toBe(50);
    expect(result.features[0].impact).toBe(50);
    expect(result.features[0].confidence).toBe(50);
    expect(result.features[0].effort).toBe(50);
  });

  it("filters out rows with empty names", () => {
    const parsed = {
      headers: ["Name", "Reach", "Impact", "Confidence", "Effort"],
      rows: [["Valid", "50", "50", "50", "50"], ["", "50", "50", "50", "50"]],
    };
    const result = mapCSVToFeatures(parsed);
    expect(result.features.length).toBe(1);
  });

  it("defaults all RICE to 50 when RICE columns missing", () => {
    const parsed = {
      headers: ["Name"],
      rows: [["Feature"]],
    };
    const result = mapCSVToFeatures(parsed);
    expect(result.features[0].reach).toBe(50);
    expect(result.features[0].impact).toBe(50);
    expect(result.features[0].confidence).toBe(50);
    expect(result.features[0].effort).toBe(50);
    expect(result.hasRice).toBe(false);
  });
});
