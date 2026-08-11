import { describe, it, expect } from "vitest";
import robots, { AI_AGENTS, DISALLOW } from "./robots";
import { SITE_URL } from "../lib/site";

describe("robots.txt", () => {
  const { rules, sitemap } = robots();

  it("has a wildcard rule", () => {
    expect(rules.filter((r) => r.userAgent === "*")).toHaveLength(1);
  });

  // The load-bearing test. Per spec, a crawler that finds a record naming its own
  // user-agent ignores the `*` record entirely — so a named rule that omits the
  // disallow list silently GRANTS that agent everything `*` blocks. Without this
  // assertion, adding an agent later is a one-line way to expose /api/.
  it("repeats the full disallow list on every named agent rule", () => {
    for (const r of rules) {
      expect(r.disallow, `rule for ${r.userAgent} is missing the disallow list`).toEqual(DISALLOW);
    }
  });

  it("never allows /api/ through any rule", () => {
    for (const r of rules) {
      expect(r.disallow).toContain("/api/");
      expect(r.allow).toBe("/");
    }
  });

  it("names each AI agent exactly once", () => {
    const named = rules.map((r) => r.userAgent).filter((ua) => ua !== "*");
    expect(named).toEqual(AI_AGENTS);
    expect(new Set(named).size).toBe(named.length);
  });

  it("covers the retrieval crawlers that produce citations", () => {
    const named = rules.map((r) => r.userAgent);
    for (const ua of ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "PerplexityBot", "Bingbot"]) {
      expect(named).toContain(ua);
    }
  });

  // These carry noindex instead (app/app/layout.jsx, app/(auth)/layout.jsx).
  // Disallowing them would stop crawlers from ever reading that tag.
  it("does not disallow the noindex routes", () => {
    for (const path of ["/app", "/sign-in", "/sign-up"]) {
      expect(DISALLOW).not.toContain(path);
    }
  });

  it("points at an absolute sitemap URL", () => {
    expect(sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(sitemap.startsWith("https://")).toBe(true);
  });
});
