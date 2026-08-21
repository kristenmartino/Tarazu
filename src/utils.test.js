import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rice, clamp, getTier, getConfidenceColor, getStatusColor, relativeTime, parseCSV, mapCSVToFeatures, exportCSV, downloadSignalsTemplate } from "./utils";
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

  it("returns THANKLESS for high effort, low impact", () => {
    const tier = getTier({ effort: 70, impact: 30 }, C);
    expect(tier.label).toBe("THANKLESS");
    expect(tier.color).toBe(C.danger);
  });

  it("boundary: effort=50 impact=51 is QUICK WIN", () => {
    expect(getTier({ effort: 50, impact: 51 }, C).label).toBe("QUICK WIN");
  });

  it("boundary: effort=51 impact=50 is THANKLESS", () => {
    expect(getTier({ effort: 51, impact: 50 }, C).label).toBe("THANKLESS");
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

// ---------------------------------------------------------------------------
// Below: the 63 survivors plus the 71 mutants with no coverage at all. The
// uncovered block is exportCSV / downloadSignalsTemplate / csvSafe — including
// a CSV-injection guard that had never been executed by a test.
// ---------------------------------------------------------------------------

/** Runs a download helper and returns the CSV text it handed to the Blob. */
async function captureDownload(run) {
  const anchor = { href: "", download: "", click: vi.fn() };
  const created = [];
  vi.spyOn(document, "createElement").mockReturnValue(anchor);
  URL.createObjectURL = vi.fn((blob) => {
    created.push(blob);
    return "blob:mock";
  });
  URL.revokeObjectURL = vi.fn();

  run();

  return { text: await created[0].text(), anchor, revoked: URL.revokeObjectURL };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("csvSafe — spreadsheet formula injection", () => {
  // A cell beginning = + - @ (or tab/CR) is executed as a formula by Excel and
  // Sheets. The guard prefixes an apostrophe so the value is inert. This is a
  // security control and it had zero test coverage.
  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "neutralises a name starting with %j",
    async (lead) => {
      const { text } = await captureDownload(() =>
        exportCSV([{ name: `${lead}HYPERLINK("http://evil")`, description: "d", reach: 1, impact: 1, confidence: 1, effort: 1, score: 1 }], "ws", C)
      );
      expect(text).toContain(`"'${lead}HYPERLINK(""http://evil"")"`);
    }
  );

  it("leaves an ordinary value unquoted-prefixed", async () => {
    const { text } = await captureDownload(() =>
      exportCSV([{ name: "Bulk edit", description: "d", reach: 1, impact: 1, confidence: 1, effort: 1, score: 1 }], "ws", C)
    );
    expect(text).toContain('"Bulk edit"');
    expect(text).not.toContain(`"'Bulk edit"`);
  });

  it("doubles embedded quotes", async () => {
    const { text } = await captureDownload(() =>
      exportCSV([{ name: 'He said "hi"', description: "", reach: 1, impact: 1, confidence: 1, effort: 1, score: 1 }], "ws", C)
    );
    expect(text).toContain('"He said ""hi"""');
  });

  it("renders a null/undefined field as an empty quoted cell", async () => {
    const { text } = await captureDownload(() =>
      exportCSV([{ name: "n", description: undefined, reach: 1, impact: 1, confidence: 1, effort: 1, score: 1 }], "ws", C)
    );
    expect(text).toContain('"n","",');
  });
});

describe("exportCSV", () => {
  const rows = [
    // effort 30 / impact 60 -> QUICK WIN; 80/70 -> STRATEGIC; 90/20 -> THANKLESS
    { name: "A", description: "da", reach: 80, impact: 60, confidence: 90, effort: 30, score: 14400 },
    { name: "B", description: "db", reach: 70, impact: 70, confidence: 60, effort: 80, score: 3675 },
    { name: "C", description: "dc", reach: 10, impact: 20, confidence: 30, effort: 90, score: 67 },
  ];

  it("writes the header and one 1-indexed row per feature", async () => {
    const { text } = await captureDownload(() => exportCSV(rows, "My Backlog", C));
    const lines = text.split("\n");
    expect(lines[0]).toBe("Rank,Name,Description,Reach,Impact,Confidence,Effort,RICE Score,Tier");
    expect(lines[1]).toBe(`1,"A","da",80,60,90,30,14400,"QUICK WIN"`);
    expect(lines[2]).toBe(`2,"B","db",70,70,60,80,3675,"STRATEGIC"`);
    expect(lines[3]).toBe(`3,"C","dc",10,20,30,90,67,"THANKLESS"`);
    expect(lines).toHaveLength(4);
  });

  it("slugifies the workspace name into the filename", async () => {
    const { anchor } = await captureDownload(() => exportCSV(rows, "My  Big Backlog", C));
    expect(anchor.download).toBe("my-big-backlog.csv");
  });

  it("falls back to backlog.csv when the workspace is unnamed", async () => {
    const { anchor } = await captureDownload(() => exportCSV(rows, "", C));
    expect(anchor.download).toBe("backlog.csv");
  });

  it("clicks the anchor and revokes the object URL", async () => {
    const { anchor, revoked } = await captureDownload(() => exportCSV(rows, "ws", C));
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.href).toBe("blob:mock");
    expect(revoked).toHaveBeenCalledWith("blob:mock");
  });
});

describe("downloadSignalsTemplate", () => {
  it("emits the signals header and four example rows", async () => {
    const { text, anchor } = await captureDownload(() => downloadSignalsTemplate());
    const lines = text.split("\n");
    expect(lines[0]).toBe("title,body,source,type,theme,tags");
    expect(lines).toHaveLength(5);
    expect(anchor.download).toBe("signals-template.csv");
  });

  it("covers every signal type the importer recognises", async () => {
    const { text } = await captureDownload(() => downloadSignalsTemplate());
    for (const type of ["research", "support", "feedback", "note"]) {
      expect(text).toContain(`"${type}"`);
    }
  });
});

describe("mapCSVToFeatures — header aliases", () => {
  const withHeader = (header) => mapCSVToFeatures({ headers: [header], rows: [["x"]] });

  it.each(["name", "summary", "title", "feature", "issue"])(
    "recognises %s as the name column",
    (alias) => {
      const result = withHeader(alias);
      expect(result).not.toBeNull();
      expect(result.nameHeader).toBe(alias);
    }
  );

  it.each(["description", "desc", "details", "body", "notes"])(
    "recognises %s as the description column",
    (alias) => {
      const result = mapCSVToFeatures({ headers: ["name", alias], rows: [["n", "d"]] });
      expect(result.descHeader).toBe(alias);
      expect(result.features[0].description).toBe("d");
    }
  );

  it.each(["effort", "estimate"])("recognises %s as the effort column", (alias) => {
    const result = mapCSVToFeatures({
      headers: ["name", "reach", "impact", "confidence", alias],
      rows: [["n", "10", "20", "30", "40"]],
    });
    expect(result.hasRice).toBe(true);
    expect(result.features[0].effort).toBe(40);
  });

  it("normalises case and punctuation in headers", () => {
    const result = mapCSVToFeatures({ headers: ["  Na_me! "], rows: [["x"]] });
    expect(result).not.toBeNull();
  });

  it("reports descHeader as null when no description column exists", () => {
    const result = mapCSVToFeatures({ headers: ["name"], rows: [["x"]] });
    expect(result.descHeader).toBeNull();
    expect(result.features[0].description).toBe("");
  });
});

describe("mapCSVToFeatures — hasRice needs all four columns", () => {
  const dims = ["reach", "impact", "confidence", "effort"];

  it.each(dims)("is false when %s is missing", (missing) => {
    const headers = ["name", ...dims.filter((d) => d !== missing)];
    const row = ["n", ...headers.slice(1).map(() => "10")];
    const result = mapCSVToFeatures({ headers, rows: [row] });

    expect(result.hasRice).toBe(false);
    // every dimension falls back to 50, including the three that were present
    expect(result.features[0]).toMatchObject({ reach: 50, impact: 50, confidence: 50, effort: 50 });
  });

  it("is true when all four are present", () => {
    const result = mapCSVToFeatures({
      headers: ["name", ...dims],
      rows: [["n", "11", "22", "33", "44"]],
    });
    expect(result.hasRice).toBe(true);
    expect(result.features[0]).toMatchObject({ reach: 11, impact: 22, confidence: 33, effort: 44 });
  });
});

describe("mapCSVToFeatures — score clamping and rows", () => {
  const parse = (value) =>
    mapCSVToFeatures({
      headers: ["name", "reach", "impact", "confidence", "effort"],
      rows: [["n", value, "50", "50", "50"]],
    }).features[0].reach;

  it.each([
    ["0", 50],
    ["1", 1],
    ["100", 100],
    ["101", 50],
    ["-5", 50],
    ["abc", 50],
    ["", 50],
    ["42.9", 42],
  ])("maps %s to %i", (input, expected) => {
    expect(parse(input)).toBe(expected);
  });

  it("skips rows with a blank name and trims the rest", () => {
    const result = mapCSVToFeatures({
      headers: ["name"],
      rows: [["  spaced  "], [""], ["   "], ["ok"]],
    });
    expect(result.features.map((f) => f.name)).toEqual(["spaced", "ok"]);
  });

  it("gives each imported feature a distinct id", () => {
    const result = mapCSVToFeatures({ headers: ["name"], rows: [["a"], ["b"], ["c"]] });
    const ids = result.features.map((f) => f.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toMatch(/^imp-\d+-0$/);
    expect(ids[2]).toMatch(/^imp-\d+-2$/);
  });
});

describe("parseCSV — line and field edge cases", () => {
  it("drops rows whose every field is empty", () => {
    const parsed = parseCSV("a,b\n1,2\n,\n3,4");
    expect(parsed.rows).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("keeps a row where only some fields are empty", () => {
    expect(parseCSV("a,b\n1,\n").rows).toEqual([["1", ""]]);
  });

  it("captures the final row when there is no trailing newline", () => {
    expect(parseCSV("a,b\n1,2").rows).toEqual([["1", "2"]]);
  });

  it("ignores a trailing newline rather than adding a blank row", () => {
    expect(parseCSV("a,b\n1,2\n").rows).toEqual([["1", "2"]]);
  });

  it("treats a bare CR (not CRLF) as field content", () => {
    const parsed = parseCSV("a,b\n1,x\ry");
    expect(parsed.rows).toEqual([["1", "x\ry"]]);
  });

  it("trims whitespace around unquoted fields", () => {
    expect(parseCSV("a,b\n  1  ,  2  ").rows).toEqual([["1", "2"]]);
  });

  it("preserves newlines inside quoted fields", () => {
    const parsed = parseCSV('a,b\n"line1\nline2",2');
    expect(parsed.rows).toEqual([["line1\nline2", "2"]]);
  });

  it("returns headers separately from rows", () => {
    const parsed = parseCSV("h1,h2\nv1,v2");
    expect(parsed.headers).toEqual(["h1", "h2"]);
  });
});

describe("relativeTime — exact unit boundaries", () => {
  const NOW = new Date("2026-06-15T12:00:00Z").getTime();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const ago = (ms) => relativeTime(new Date(NOW - ms).toISOString());
  const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR;

  it("59s is 'just now', 60s is '1m ago'", () => {
    expect(ago(59 * SEC)).toBe("just now");
    expect(ago(60 * SEC)).toBe("1m ago");
  });

  it("59m is minutes, 60m is '1h ago'", () => {
    expect(ago(59 * MIN)).toBe("59m ago");
    expect(ago(60 * MIN)).toBe("1h ago");
  });

  it("23h is hours, 24h is '1d ago'", () => {
    expect(ago(23 * HR)).toBe("23h ago");
    expect(ago(24 * HR)).toBe("1d ago");
  });

  it("29d is days, 30d is '1mo ago'", () => {
    expect(ago(29 * DAY)).toBe("29d ago");
    expect(ago(30 * DAY)).toBe("1mo ago");
  });

  it("a future timestamp is 'just now', not a negative duration", () => {
    expect(relativeTime(new Date(NOW + 5 * DAY).toISOString())).toBe("just now");
  });

  it("exactly now is 'just now'", () => {
    expect(ago(0)).toBe("just now");
  });
});

describe("getTier — remaining boundaries", () => {
  it("effort=51, impact=51 is STRATEGIC", () => {
    expect(getTier({ effort: 51, impact: 51 }, C).label).toBe("STRATEGIC");
  });

  it("effort=51, impact=50 is THANKLESS", () => {
    expect(getTier({ effort: 51, impact: 50 }, C).label).toBe("THANKLESS");
  });

  it("effort=50, impact=51 is QUICK WIN", () => {
    expect(getTier({ effort: 50, impact: 51 }, C).label).toBe("QUICK WIN");
  });
});

describe("csvSafe — the guard must be anchored", () => {
  // Dropping the ^ from /^[=+\-@\t\r]/ turns the guard into a substring test,
  // and every hyphen or @ anywhere in a value gets an apostrophe glued to the
  // front. That corrupts ordinary data — emails, hyphenated names — on export,
  // silently and for every user.
  it.each([
    "user@example.com",
    "re-order the backlog",
    "1+1 planning",
    "A=B comparison",
  ])("does not prefix %j, which merely contains a trigger character", async (name) => {
    const { text } = await captureDownload(() =>
      exportCSV([{ name, description: "", reach: 1, impact: 1, confidence: 1, effort: 1, score: 1 }], "ws", C)
    );
    expect(text).toContain(`"${name}"`);
    expect(text).not.toContain(`"'${name}"`);
  });
});

describe("download plumbing", () => {
  it("creates an anchor element and labels the blob as CSV", async () => {
    const anchor = { href: "", download: "", click: vi.fn() };
    const createEl = vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const blobs = [];
    URL.createObjectURL = vi.fn((b) => (blobs.push(b), "blob:mock"));
    URL.revokeObjectURL = vi.fn();

    exportCSV([{ name: "n", description: "", reach: 1, impact: 1, confidence: 1, effort: 1, score: 1 }], "ws", C);

    expect(createEl).toHaveBeenCalledWith("a");
    expect(blobs[0].type).toBe("text/csv");
  });

  it("labels the signals template blob as CSV too", async () => {
    const anchor = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const blobs = [];
    URL.createObjectURL = vi.fn((b) => (blobs.push(b), "blob:mock"));
    URL.revokeObjectURL = vi.fn();

    downloadSignalsTemplate();

    expect(blobs[0].type).toBe("text/csv");
  });
});

describe("parseCSV / mapCSVToFeatures — trailing-row and trim details", () => {
  it("keeps a partially-empty final row that has no trailing newline", () => {
    // Exercises the push after the loop, not the in-loop newline branch.
    expect(parseCSV("a,b\n1,").rows).toEqual([["1", ""]]);
  });

  it("drops a wholly-empty final row that has no trailing newline", () => {
    expect(parseCSV("a,b\n1,2\n,").rows).toEqual([["1", "2"]]);
  });

  it("trims whitespace around an imported description", () => {
    const result = mapCSVToFeatures({
      headers: ["name", "description"],
      rows: [["n", "  padded  "]],
    });
    expect(result.features[0].description).toBe("padded");
  });
});
