import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RicePage, { metadata } from "./page";
import { rice, getTier } from "../../../src/utils";
import { findRoute } from "../../../lib/routes";

const html = renderToStaticMarkup(<RicePage />);

describe("/frameworks/rice renders server-side", () => {
  it("emits exactly one h1", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("states the formula in plain text", () => {
    expect(html).toContain("(Reach × Impact × Confidence) ÷ Effort");
  });

  it("shows Tarazu's normalized variant including the divide-by-zero guard", () => {
    expect(html).toContain("max(effort, 1)");
  });

  it("renders the worked example and comparison tables", () => {
    expect(html.match(/<table/g).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the honest sections, not just the sales ones", () => {
    expect(html).toContain("Where RICE breaks");
    expect(html).toContain("RICE ranks; it does not sequence");
  });

  it("compares against the alternative frameworks", () => {
    for (const framework of ["ICE", "Weighted scoring", "WSJF"]) {
      expect(html).toContain(framework);
    }
  });
});

// The whole point of computing the example rather than typing it: the page and
// the product cannot disagree. If rice() changes, these numbers change with it —
// and if someone hardcodes a number into the copy, this catches the drift.
describe("worked example matches the product's own scoring", () => {
  const candidates = [
    { name: "Self-serve onboarding", reach: 80, impact: 90, confidence: 80, effort: 30 },
    { name: "Usage-based billing", reach: 60, impact: 85, confidence: 70, effort: 65 },
    { name: "SSO & SCIM", reach: 35, impact: 70, confidence: 90, effort: 50 },
    { name: "Mobile companion app", reach: 70, impact: 65, confidence: 50, effort: 90 },
  ];

  it("renders each candidate's real rice() score", () => {
    for (const c of candidates) {
      const score = rice(c).toLocaleString("en-US");
      expect(html, `${c.name} should show ${score}`).toContain(score);
    }
  });

  it("shows arithmetic whose product matches the numerator", () => {
    for (const c of candidates) {
      const numerator = (c.reach * c.impact * c.confidence).toLocaleString("en-US");
      expect(html).toContain(`${numerator} ÷ ${c.effort}`);
    }
  });

  it("orders the table by descending score", () => {
    const positions = [...candidates]
      .sort((a, b) => rice(b) - rice(a))
      .map((c) => html.indexOf(c.name.replace("&", "&amp;")));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((p) => p !== -1)).toBe(true);
  });

  it("describes a genuine quadrant-versus-rank disagreement", () => {
    const ranked = [...candidates]
      .map((c) => ({ ...c, score: rice(c), tier: getTier(c, {}).label }))
      .sort((a, b) => b.score - a.score);
    const idx = ranked.findIndex((c, i) => c.tier === "QUICK WIN" && i > 0);
    // The prose claims a QUICK WIN that does not top the ranking exists. If the
    // numbers ever stop producing one, the sentence becomes false — fail here
    // rather than publish it.
    expect(idx).toBeGreaterThan(0);
    expect(html).toContain(`ranks only ${["first", "second", "third", "fourth"][idx]}`);
  });
});

describe("/frameworks/rice metadata", () => {
  const route = findRoute("/frameworks/rice");

  it("is built from the registry entry", () => {
    expect(metadata.title).toBe(`${route.title} · Tarazu`);
    expect(metadata.alternates.canonical).toBe("/frameworks/rice");
  });
});
