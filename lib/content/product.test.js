import { describe, it, expect } from "vitest";
import { FAQS, CATEGORY_COMPARISON, SPREADSHEET_PROBLEMS } from "./product";

describe("FAQS", () => {
  it("asks unique questions", () => {
    const qs = FAQS.map((f) => f.question);
    expect(new Set(qs).size).toBe(qs.length);
  });

  it("phrases every entry as a question", () => {
    for (const f of FAQS) expect(f.question.endsWith("?"), f.question).toBe(true);
  });

  // An answer that opens with framing does not get extracted into an AI answer.
  // A first sentence short enough to stand alone is the extractable unit.
  it("leads with a first sentence that stands alone", () => {
    for (const f of FAQS) {
      const first = f.answer.split(/(?<=\.)\s/)[0];
      expect(first.length, `${f.question} — first sentence too long`).toBeLessThanOrEqual(180);
      expect(first.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every answer real substance", () => {
    for (const f of FAQS) {
      expect(f.answer.length, f.question).toBeGreaterThanOrEqual(60);
    }
  });

  it("answers the questions most likely to be asked of an AI assistant", () => {
    const joined = FAQS.map((f) => f.question.toLowerCase()).join(" | ");
    for (const topic of ["free", "account", "rice", "data", "export", "import"]) {
      expect(joined, `no FAQ covers "${topic}"`).toContain(topic);
    }
  });
});

describe("CATEGORY_COMPARISON", () => {
  it("gives every row a cell for every column", () => {
    for (const row of CATEGORY_COMPARISON.rows) {
      expect(row, row[0]).toHaveLength(CATEGORY_COMPARISON.columns.length);
      for (const cell of row) expect(String(cell).trim()).not.toBe("");
    }
  });

  // Naming competitors means making factual claims that go stale and that we
  // then have to defend. The spec's columns are categories on purpose.
  it("compares categories, not named products", () => {
    const text = JSON.stringify(CATEGORY_COMPARISON).toLowerCase();
    for (const brand of ["jira", "productboard", "airfocus", "aha!", "roadmunk", "asana"]) {
      expect(text, `comparison names ${brand}`).not.toContain(brand);
    }
  });
});

describe("SPREADSHEET_PROBLEMS", () => {
  it("names three distinct failure modes with real bodies", () => {
    expect(SPREADSHEET_PROBLEMS).toHaveLength(3);
    for (const p of SPREADSHEET_PROBLEMS) {
      expect(p.title.trim()).not.toBe("");
      expect(p.body.length).toBeGreaterThan(60);
    }
  });
});
