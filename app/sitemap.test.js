import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { ROUTES } from "../lib/routes";
import { allPosts } from "../lib/content/posts";
import { SITE_URL } from "../lib/site";

describe("sitemap.xml", () => {
  const entries = sitemap();
  const posts = allPosts().filter((p) => !p.canonical);

  it("emits one entry per registered route plus one per post", () => {
    expect(entries).toHaveLength(ROUTES.length + posts.length);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });

  it("includes every published post", () => {
    for (const post of posts) {
      expect(
        entries.some((e) => e.url === `${SITE_URL}/blog/${post.slug}`),
        `sitemap missing /blog/${post.slug}`
      ).toBe(true);
    }
  });

  // A cross-post tells Google the canonical lives elsewhere. Advertising the
  // URL here would contradict that.
  it("excludes a post whose canonical points off-site", () => {
    const crossPosted = allPosts().filter((p) => p.canonical);
    for (const post of crossPosted) {
      expect(entries.some((e) => e.url.endsWith(`/blog/${post.slug}`))).toBe(false);
    }
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
