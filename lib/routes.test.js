import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ROUTES, findRoute, absoluteUrl, navGroups } from "./routes";
import { SITE_URL } from "./site";

const APP_DIR = path.join(process.cwd(), "app");

// Routes that exist but are deliberately absent from ROUTES: the API surface,
// the client-rendered workspace, and the auth flows. The latter two serve
// noindex (app/app/layout.jsx, app/(auth)/layout.jsx) rather than being hidden
// behind a robots.txt Disallow — see app/robots.js for why.
const NON_INDEXABLE = new Set(["/app", "/sign-in", "/sign-up"]);

/** Walks app/ and derives the URL path of every page.jsx. */
function discoverPageRoutes(dir = APP_DIR, segments = []) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "api") continue;
      // (group) folders are organisational and contribute no URL segment.
      const next = entry.name.startsWith("(") ? segments : [...segments, entry.name];
      found.push(...discoverPageRoutes(path.join(dir, entry.name), next));
    } else if (entry.name === "page.jsx" || entry.name === "page.js") {
      // Strip catch-all/dynamic segments down to their parent route.
      const clean = segments.filter((s) => !s.startsWith("["));
      found.push("/" + clean.join("/")).valueOf();
    }
  }
  return found.map((p) => (p === "/" ? "/" : p.replace(/\/$/, "")));
}

describe("ROUTES registry", () => {
  it("has unique, normalised paths", () => {
    const paths = ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) {
      expect(p.startsWith("/")).toBe(true);
      if (p !== "/") expect(p.endsWith("/")).toBe(false);
    }
  });

  // A description over ~160 chars gets truncated in the SERP mid-sentence; under
  // ~50 wastes the slot. Enforcing it here means a bad one fails CI, not review.
  it("keeps every description in the 50-160 character window", () => {
    for (const r of ROUTES) {
      expect(r.description.length, `${r.path} description length`).toBeGreaterThanOrEqual(50);
      expect(r.description.length, `${r.path} description length`).toBeLessThanOrEqual(160);
    }
  });

  it("has a non-empty title for every route", () => {
    for (const r of ROUTES) expect(r.title.trim()).not.toBe("");
  });

  it("uses valid, non-future lastModified dates", () => {
    for (const r of ROUTES) {
      expect(r.lastModified, `${r.path}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(r.lastModified);
      expect(Number.isNaN(d.getTime())).toBe(false);
      expect(d.getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  it("uses priorities within range and known change frequencies", () => {
    for (const r of ROUTES) {
      expect(r.priority).toBeGreaterThanOrEqual(0);
      expect(r.priority).toBeLessThanOrEqual(1);
      expect(["weekly", "monthly", "yearly"]).toContain(r.changeFrequency);
    }
  });

  it("resolves paths to absolute production URLs", () => {
    expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
    expect(absoluteUrl("/faq")).toBe(`${SITE_URL}/faq`);
  });

  it("finds a route by path and returns null for an unknown one", () => {
    expect(findRoute("/")?.path).toBe("/");
    expect(findRoute("/nope")).toBeNull();
  });
});

// The guard that keeps the registry honest. Without it, ROUTES drifts from
// reality within a couple of PRs — either advertising a 404 in the sitemap, or
// silently leaving a real page out of it.
describe("registry matches the filesystem", () => {
  const discovered = discoverPageRoutes().filter((p) => !NON_INDEXABLE.has(p));

  it("has a ROUTES entry for every indexable page.jsx on disk", () => {
    for (const p of discovered) {
      expect(findRoute(p), `${p} has a page but no lib/routes.js entry`).not.toBeNull();
    }
  });

  it("has a page.jsx on disk for every ROUTES entry", () => {
    for (const r of ROUTES) {
      expect(discovered, `${r.path} is in lib/routes.js but has no page`).toContain(r.path);
    }
  });
});

describe("navGroups", () => {
  it("omits routes with no nav placement", () => {
    // Only "/" exists today and it is intentionally not in the nav.
    expect(navGroups().every((g) => g.entries.length > 0)).toBe(true);
    expect(navGroups().flatMap((g) => g.entries).every((r) => r.nav !== null)).toBe(true);
  });

  it("sorts each group by order", () => {
    for (const { entries } of navGroups()) {
      const orders = entries.map((e) => e.nav.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });
});
