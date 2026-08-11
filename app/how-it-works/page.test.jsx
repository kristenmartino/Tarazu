import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HowItWorksPage from "./page";
import { metadata } from "./page";
import { findRoute } from "../../lib/routes";

// renderToStaticMarkup runs the tree with no client runtime at all. If someone
// adds a hook to this page — or to anything in the marketing shell — turning it
// into a client component, this throws rather than silently shipping a page whose
// text a non-JS crawler cannot see. That is the whole point of the assertion.
const html = renderToStaticMarkup(<HowItWorksPage />);

describe("/how-it-works renders server-side", () => {
  it("emits exactly one h1", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("puts the scoring formula in the HTML, not behind JavaScript", () => {
    expect(html).toContain("reach × impact × confidence");
  });

  it("states the quadrant boundaries as real table content", () => {
    expect(html).toContain("QUICK WIN");
    expect(html).toContain("STRATEGIC");
    expect(html).toContain("FILL-IN");
    expect(html).toContain("AVOID");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
  });

  it("answers the no-account question in plain text", () => {
    expect(html).toContain("guest mode");
  });

  it("renders the shell chrome", () => {
    expect(html).toContain("tz-page");
    expect(html).toContain("<header");
    expect(html).toContain("<footer");
    expect(html).toContain('<main id="top"');
  });

  it("ships a mobile menu that works without JavaScript", () => {
    // A <details>/<summary> toggles natively. A useState-driven menu would not
    // appear here at all, and would have forced "use client" on the whole shell.
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
  });

  it("embeds parseable JSON-LD with the page and breadcrumb nodes", () => {
    const match = html.match(
      /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s
    );
    expect(match).not.toBeNull();
    const doc = JSON.parse(match[1]);
    const types = doc["@graph"].map((n) => n["@type"]);
    expect(types).toContain("WebPage");
    expect(types).toContain("BreadcrumbList");
  });

  it("links back to the landing page", () => {
    expect(html).toContain('href="/"');
  });
});

describe("/how-it-works metadata", () => {
  const route = findRoute("/how-it-works");

  it("is built from the registry entry", () => {
    expect(metadata.title).toBe(`${route.title} · Tarazu`);
    expect(metadata.description).toBe(route.description);
  });

  it("declares its own canonical", () => {
    expect(metadata.alternates.canonical).toBe("/how-it-works");
  });
});
