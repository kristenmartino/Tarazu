import { describe, it, expect } from "vitest";
import { pageMetadata } from "./metadata";
import { findRoute } from "./routes";
import { SITE_NAME } from "./site";

const base = {
  path: "/frameworks/rice",
  title: "RICE scoring explained",
  description: "x".repeat(80),
  lastModified: "2026-08-11",
  changeFrequency: "monthly",
  priority: 0.9,
  nav: null,
  schemaType: "WebPage",
  llmsSection: "Guides",
};

describe("pageMetadata", () => {
  it("throws when handed an unknown route, rather than emitting empty tags", () => {
    // findRoute returns null for a path with no entry; failing loudly here is the
    // difference between "you forgot lib/routes.js" and a page that silently
    // ships with no title.
    expect(() => pageMetadata(null)).toThrow(/lib\/routes\.js/);
  });

  it("uses the brand-first title form for the landing", () => {
    expect(pageMetadata(findRoute("/")).title).toBe(`${SITE_NAME} — Weigh what to build next`);
  });

  it("uses the subject-first title form for every other page", () => {
    expect(pageMetadata(base).title).toBe(`RICE scoring explained · ${SITE_NAME}`);
  });

  // metadataBase in app/layout.jsx absolutizes this. Keeping it relative is what
  // makes a preview deploy still emit the production canonical.
  it("keeps the canonical relative", () => {
    expect(pageMetadata(base).alternates.canonical).toBe("/frameworks/rice");
    expect(pageMetadata(findRoute("/")).alternates.canonical).toBe("/");
  });

  // Regression: `alternates` is replaced wholesale by a child, not deep-merged.
  // Declaring only `canonical` here dropped the root layout's markdown pointer
  // from every page that uses this helper.
  it("carries the llms.txt pointer alongside the canonical", () => {
    expect(pageMetadata(base).alternates.types).toEqual({ "text/markdown": "/llms.txt" });
    expect(pageMetadata(findRoute("/")).alternates.types).toEqual({
      "text/markdown": "/llms.txt",
    });
  });

  it("mirrors the title across openGraph and twitter", () => {
    const meta = pageMetadata(base);
    expect(meta.openGraph.title).toBe(meta.title);
    expect(meta.twitter.title).toBe(meta.title);
    expect(meta.twitter.card).toBe("summary_large_image");
    expect(meta.openGraph.siteName).toBe(SITE_NAME);
  });

  it("falls back to the meta description for social cards", () => {
    const meta = pageMetadata(base);
    expect(meta.openGraph.description).toBe(base.description);
    expect(meta.twitter.description).toBe(base.description);
  });

  it("prefers socialDescription for social cards when supplied", () => {
    const meta = pageMetadata({ ...base, socialDescription: "shorter card copy" });
    expect(meta.description).toBe(base.description);
    expect(meta.openGraph.description).toBe("shorter card copy");
    expect(meta.twitter.description).toBe("shorter card copy");
  });

  // app/opengraph-image.jsx sits at the app/ segment root and is inherited by
  // every route. Declaring images here would override that inheritance.
  it("does not declare its own og:image", () => {
    expect(pageMetadata(base).openGraph.images).toBeUndefined();
    expect(pageMetadata(base).twitter.images).toBeUndefined();
  });
});
