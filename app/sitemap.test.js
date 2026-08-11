import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { ROUTES } from "../lib/routes";
import { SITE_URL } from "../lib/site";

describe("sitemap.xml", () => {
  const entries = sitemap();

  it("emits exactly one entry per registered route", () => {
    expect(entries).toHaveLength(ROUTES.length);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });

  it("emits absolute production URLs", () => {
    for (const e of entries) {
      expect(e.url.startsWith(SITE_URL), e.url).toBe(true);
    }
  });

  it("carries a real lastModified date for every entry", () => {
    for (const e of entries) {
      expect(e.lastModified).toBeInstanceOf(Date);
      expect(Number.isNaN(e.lastModified.getTime())).toBe(false);
      // Build-time dates would make every route claim to change on every deploy,
      // which is how a lastmod signal gets discounted. These come from the
      // hand-set values in lib/routes.js.
      expect(e.lastModified.getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  it("carries priority and changeFrequency from the registry", () => {
    for (const e of entries) {
      expect(e.priority).toBeGreaterThanOrEqual(0);
      expect(e.priority).toBeLessThanOrEqual(1);
      expect(["weekly", "monthly", "yearly"]).toContain(e.changeFrequency);
    }
  });

  it("never advertises a noindex route", () => {
    for (const path of ["/app", "/sign-in", "/sign-up"]) {
      expect(entries.some((e) => e.url === `${SITE_URL}${path}`)).toBe(false);
    }
  });

  it("includes the landing page at top priority", () => {
    const home = entries.find((e) => e.url === `${SITE_URL}/`);
    expect(home).toBeDefined();
    expect(home.priority).toBe(1.0);
  });
});
