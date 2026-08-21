import { test, expect } from "@playwright/test";

// Every public route, kept in step with lib/routes.js by
// scripts/check-prerender.mjs (which reads the generated sitemap) and by
// lib/routes.test.js (which walks app/ on disk). Blog posts are NOT in
// lib/routes.js at all — they're auto-discovered from content/blog/*.md by
// lib/content/posts.js — so nothing enforces adding a new post's slug here.
// Add it by hand in the same PR, or "matches the sitemap exactly" below fails.
const ROUTES = [
  "/",
  "/how-it-works",
  "/frameworks/rice",
  "/vs/spreadsheets",
  "/faq",
  "/pricing",
  "/blog",
  "/about",
  "/blog/a-decision-record-is-not-a-changelog",
  "/blog/let-the-model-draft-the-score",
  "/blog/reach-is-the-number-youre-guessing-at",
  "/blog/what-the-number-on-the-slider-means",
  "/blog/the-argument-already-happened",
  "/blog/reopening-a-decision-six-months-later",
  "/blog/tie-break-is-the-real-decision",
];

// The whole point of this file. With JavaScript disabled, anything the page
// shows is unambiguously in the HTML — which is the condition a text-extracting
// crawler and a non-rendering LLM fetcher operate under. A passing assertion
// here cannot be satisfied by client-side hydration.
test.describe("public pages work with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  for (const route of ROUTES) {
    test(`${route} serves real content without JS`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response.status()).toBe(200);

      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toBeVisible();
      expect((await h1.innerText()).trim().length).toBeGreaterThan(0);

      await expect(page).toHaveTitle(/Tarazu/);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      const href = await canonical.getAttribute("href");
      expect(href).toBe(
        route === "/" ? "https://tarazu.app" : `https://tarazu.app${route}`
      );

      await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

      // Structured data must be in the served bytes, not injected at runtime.
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(ld.length).toBeGreaterThan(0);
      for (const block of ld) {
        const doc = JSON.parse(block);
        expect(doc["@context"]).toBe("https://schema.org");
        expect(Array.isArray(doc["@graph"])).toBe(true);
      }

      // A shell that renders chrome but no prose would pass every check above.
      const text = await page.locator("body").innerText();
      expect(text.length).toBeGreaterThan(1200);
    });
  }

  test("the marketing nav is usable without JS", async ({ page }) => {
    await page.goto("/how-it-works");
    // The mobile menu is a native <details>, so it needs no client runtime.
    await expect(page.locator("details.nav-mobile summary")).toHaveCount(1);
    await page.locator('header a[href="/faq"], footer a[href="/faq"]').first().click();
    await expect(page).toHaveURL(/\/faq$/);
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("crawler-facing endpoints", () => {
  test("robots.txt allows the AI retrieval crawlers and protects /api/", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();

    for (const agent of ["OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Bingbot"]) {
      expect(body, `robots.txt does not name ${agent}`).toContain(agent);
    }
    expect(body).toContain("Sitemap: https://tarazu.app/sitemap.xml");

    // Every agent record must repeat the disallow list: a crawler that finds a
    // record naming itself ignores the * record entirely, so a named rule
    // without Disallow would GRANT that agent /api/.
    const records = body.split(/\n\s*\n/).filter((b) => b.includes("User-Agent:"));
    expect(records.length).toBeGreaterThan(1);
    for (const record of records) {
      expect(record, `record missing Disallow:\n${record}`).toContain("Disallow: /api/");
    }
  });

  // Playwright needs the route list at collection time, so ROUTES above is
  // literal. This asserts it still matches the generated sitemap in BOTH
  // directions — otherwise adding a page silently leaves it untested here,
  // which is exactly what happened when the blog landed.
  test("the tested route list matches the sitemap exactly", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    const fromSitemap = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname)
      .map((p) => (p === "/" ? "/" : p.replace(/\/$/, "")))
      .sort();
    expect(fromSitemap).toEqual([...ROUTES].sort());
  });

  test("sitemap.xml lists every public route with a lastmod", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    for (const route of ROUTES) {
      const url = route === "/" ? "https://tarazu.app/" : `https://tarazu.app${route}`;
      expect(body, `sitemap missing ${route}`).toContain(`<loc>${url}</loc>`);
    }
    expect(body).toContain("<lastmod>");
    // Noindex routes must never be advertised.
    for (const path of ["/app", "/sign-in", "/sign-up"]) {
      expect(body).not.toContain(`<loc>https://tarazu.app${path}</loc>`);
    }
  });

  test("llms.txt is served as plain text in the expected shape", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body.startsWith("# Tarazu")).toBe(true);
    expect(body).toContain("> Tarazu is a free, browser-based decision-intelligence app");
    expect(body).toContain("https://tarazu.app/frameworks/rice");
  });

  test("llms-full.txt carries the quotable facts", async ({ request }) => {
    const res = await request.get("/llms-full.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("round((reach × impact × confidence) / max(effort, 1))");
    expect(body).toContain("Tarazu is free.");
  });

  test("the workspace and auth routes are noindex", async ({ page }) => {
    for (const route of ["/app", "/sign-in"]) {
      await page.goto(route);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/
      );
    }
  });

  test("/rice permanently redirects to the canonical path", async ({ page }) => {
    const res = await page.goto("/rice");
    expect(res.request().redirectedFrom()).not.toBeNull();
    await expect(page).toHaveURL(/\/frameworks\/rice$/);
  });

  test("the manifest and icons are reachable", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const { icons } = await manifest.json();
    for (const icon of icons) {
      const res = await request.get(icon.src);
      expect(res.status(), `${icon.src} is not served`).toBe(200);
    }
    expect((await request.get("/favicon.ico")).status()).toBe(200);
  });
});
