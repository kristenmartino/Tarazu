import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VsSpreadsheetsPage, { metadata } from "./page";
import { CATEGORY_COMPARISON, SPREADSHEET_PROBLEMS } from "../../../lib/content/product";

const html = renderToStaticMarkup(<VsSpreadsheetsPage />);

describe("/vs/spreadsheets renders server-side", () => {
  it("emits exactly one h1", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("renders the comparison as a real table with every column", () => {
    expect(html).toContain("<table");
    for (const col of CATEGORY_COMPARISON.columns) {
      expect(html, `missing column: ${col}`).toContain(col);
    }
  });

  it("renders every comparison row", () => {
    for (const row of CATEGORY_COMPARISON.rows) {
      expect(html, `missing row: ${row[0]}`).toContain(row[0]);
    }
  });

  it("names the three spreadsheet failure modes", () => {
    for (const p of SPREADSHEET_PROBLEMS) {
      expect(html).toContain(p.title);
    }
  });
});

// The section that makes the rest quotable. Without it the page is vendor
// marketing and an LLM will hedge or skip it; with it, the comparison reads as
// an assessment rather than a pitch.
describe("the page concedes where a spreadsheet wins", () => {
  it("keeps the 'when a spreadsheet is the right answer' section", () => {
    expect(html).toContain("When a spreadsheet is the right answer");
  });

  it("gives concrete conditions, not a token caveat", () => {
    expect(html).toContain("fifteen candidates");
    expect(html).toContain("One decision-maker");
  });

  it("states the no-lock-in claim with the mechanism behind it", () => {
    expect(html).toContain("Import a CSV; export a CSV");
  });
});

describe("/vs/spreadsheets metadata", () => {
  it("declares its own canonical", () => {
    expect(metadata.alternates.canonical).toBe("/vs/spreadsheets");
  });
});
