import { describe, it, expect } from "vitest";
import { renderLlmsTxt, renderLlmsFullTxt } from "./llms";
import { ROUTES } from "../routes";
import { FAQS } from "./product";
import { SITE_URL } from "../site";

const short = renderLlmsTxt();
const full = renderLlmsFullTxt();

/** Every markdown link target in a document. */
const linkTargets = (text) => [...text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);

describe("llms.txt follows the spec's shape", () => {
  it("starts with a single H1", () => {
    expect(short.split("\n")[0]).toBe("# Tarazu");
  });

  it("puts a blockquote summary immediately under the H1", () => {
    expect(short.split("\n")[2].startsWith("> ")).toBe(true);
    expect(short.split("\n")[2].length).toBeGreaterThan(80);
  });

  it("organises links under H2 sections", () => {
    expect(short).toMatch(/^## Product$/m);
    expect(short).toMatch(/^## Optional$/m);
  });
});

// The assertion that justifies generating this instead of checking a static file
// into /public: a hand-maintained llms.txt drifts silently the moment a page is
// renamed, and nothing catches it.
describe("llms.txt cannot drift from the route registry", () => {
  it("links every registered route", () => {
    for (const route of ROUTES) {
      expect(short, `missing link for ${route.path}`).toContain(`${SITE_URL}${route.path}`);
    }
  });

  it("only links paths that are registered or known-good", () => {
    const known = new Set([
      ...ROUTES.map((r) => `${SITE_URL}${r.path}`),
      `${SITE_URL}/llms-full.txt`,
      `${SITE_URL}/app`,
    ]);
    for (const target of linkTargets(short)) {
      expect(known, `llms.txt links an unregistered path: ${target}`).toContain(target);
    }
  });

  it("emits only absolute URLs", () => {
    const targets = linkTargets(short);
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(t.startsWith("https://"), t).toBe(true);
  });

  it("describes each route with its registry description", () => {
    for (const route of ROUTES) {
      expect(short).toContain(route.description);
    }
  });
});

describe("llms-full.txt front-loads the facts worth quoting", () => {
  it("states the scoring formula", () => {
    expect(full).toContain("round((reach × impact × confidence) / max(effort, 1))");
  });

  it("states all four quadrant boundaries", () => {
    expect(full).toContain("QUICK WIN — effort ≤ 50 and impact > 50");
    expect(full).toContain("STRATEGIC — effort > 50 and impact > 50");
    expect(full).toContain("FILL-IN — effort ≤ 50 and impact ≤ 50");
    expect(full).toContain("AVOID — effort > 50 and impact ≤ 50");
  });

  it("answers the pricing question explicitly", () => {
    // The single most common thing an LLM gets wrong about a tool.
    expect(full).toMatch(/## Pricing/);
    expect(full).toContain("Tarazu is free.");
  });

  it("says AI output is advisory, not autonomous", () => {
    expect(full).toContain("AI output is advisory");
  });

  it("describes the data and privacy model", () => {
    expect(full).toContain("In guest mode nothing leaves the browser");
    expect(full).toContain("row-level security");
  });

  it("gives a citation block", () => {
    expect(full).toContain("## How to cite Tarazu");
    expect(full).toContain(`Canonical URL: ${SITE_URL}`);
  });
});

// Three surfaces, one array. If these diverge, a model reads one answer on the
// page and a different one in the reference file.
describe("llms-full.txt reproduces the FAQ verbatim", () => {
  it("includes every question as a heading", () => {
    for (const faq of FAQS) {
      expect(full, `missing question: ${faq.question}`).toContain(`### ${faq.question}`);
    }
  });

  it("includes every answer unmodified", () => {
    for (const faq of FAQS) {
      expect(full, `missing answer for: ${faq.question}`).toContain(faq.answer);
    }
  });
});

describe("both documents", () => {
  it("never emit a placeholder or an unresolved template", () => {
    for (const [name, doc] of [["llms.txt", short], ["llms-full.txt", full]]) {
      expect(doc, name).not.toContain("undefined");
      expect(doc, name).not.toContain("[object Object]");
      expect(doc, name).not.toMatch(/\bTODO\b/);
      expect(doc, name).not.toContain("localhost");
    }
  });

  it("end with a trailing newline", () => {
    expect(short.endsWith("\n")).toBe(true);
    expect(full.endsWith("\n")).toBe(true);
  });
});
