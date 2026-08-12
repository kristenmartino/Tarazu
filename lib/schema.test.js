import { describe, it, expect } from "vitest";
import {
  person,
  organization,
  website,
  webApplication,
  webPage,
  faqPage,
  breadcrumbs,
  graph,
  serialize,
  ORG_ID,
  SITE_ID,
  PERSON_ID,
  APP_ID,
} from "./schema";
import { SITE_URL } from "./site";
import { ROUTES, findRoute } from "./routes";

// Mirrors app/layout.jsx exactly — if that graph changes, this must too, or the
// cross-reference tests below stop reflecting reality.
const siteGraph = graph(organization(), website(), person(), webApplication());

const contentRoute = findRoute("/how-it-works");
const pageGraph = graph(
  webPage(contentRoute),
  breadcrumbs([
    { name: "Home", path: "/" },
    { name: contentRoute.title, path: contentRoute.path },
  ])
);

/** Every {"@id": x} that is a *reference* (a lone-key object), across a graph. */
function collectReferences(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "@id") found.push(value["@id"]);
    for (const key of keys) collectReferences(value[key], found);
  }
  return found;
}

/** Every @id a graph *declares* (a node with @type alongside it). */
function collectDeclarations(document) {
  return document["@graph"].filter((n) => n["@type"] && n["@id"]).map((n) => n["@id"]);
}

describe("serialize", () => {
  it("escapes < so a string can never close the script element early", () => {
    const out = serialize({ x: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<img");
    expect(out).toContain("\\u003c");
  });

  it("escapes an HTML comment opener too", () => {
    expect(serialize({ x: "<!--" })).not.toContain("<!--");
  });

  it("still round-trips as valid JSON", () => {
    const value = { a: "</script>", b: [1, 2], c: { d: true } };
    expect(JSON.parse(serialize(value))).toEqual(value);
  });

  it("leaves ordinary content intact", () => {
    expect(JSON.parse(serialize({ name: "Tarazu" })).name).toBe("Tarazu");
  });
});

describe("graph", () => {
  it("declares the schema.org context", () => {
    expect(siteGraph["@context"]).toBe("https://schema.org");
  });

  it("drops absent nodes rather than emitting null entries", () => {
    expect(graph(organization(), null, undefined, false)["@graph"]).toHaveLength(1);
  });
});

describe("@id integrity", () => {
  // A typo'd cross-reference is a silent production failure: the markup stays
  // valid JSON and validators shrug, but the graph is disconnected and the
  // publisher/author relationship is lost.
  it("resolves every reference in the site graph to a node it declares", () => {
    const declared = new Set(collectDeclarations(siteGraph));
    for (const ref of collectReferences(siteGraph["@graph"])) {
      expect(declared, `dangling @id reference: ${ref}`).toContain(ref);
    }
  });

  // A content page emits only its own node and references the site-wide entities.
  // Those references resolve only because app/layout.jsx renders on every route —
  // so this asserts the pairing, not each graph in isolation. This is the test
  // that catches "WebApplication is declared on the landing but referenced
  // everywhere", which produces a dangling `about` on every other page.
  it("resolves every page-graph reference against the site graph rendered alongside it", () => {
    const declared = new Set([
      ...collectDeclarations(siteGraph),
      ...collectDeclarations(pageGraph),
    ]);
    for (const ref of collectReferences(pageGraph["@graph"])) {
      expect(declared, `dangling @id reference: ${ref}`).toContain(ref);
    }
  });

  it("resolves page-graph references for every content route in the registry", () => {
    const siteDeclared = collectDeclarations(siteGraph);
    for (const route of ROUTES.filter((r) => r.schemaType !== "WebSite")) {
      const g = graph(webPage(route));
      const declared = new Set([...siteDeclared, ...collectDeclarations(g)]);
      for (const ref of collectReferences(g["@graph"])) {
        expect(declared, `${route.path}: dangling @id reference ${ref}`).toContain(ref);
      }
    }
  });

  it("anchors every @id to the production origin", () => {
    for (const id of [ORG_ID, SITE_ID, PERSON_ID, APP_ID]) {
      expect(id.startsWith(`${SITE_URL}/#`)).toBe(true);
    }
    expect(new Set([ORG_ID, SITE_ID, PERSON_ID, APP_ID]).size).toBe(4);
  });
});

describe("webApplication", () => {
  const app = webApplication();

  it("carries the fields that make it a usable product entity", () => {
    expect(app["@type"]).toBe("WebApplication");
    expect(app.name).toBeTruthy();
    expect(app.url).toBe(SITE_URL);
    expect(app.applicationCategory).toBe("BusinessApplication");
    expect(app.offers.price).toBe("0");
    expect(app.isAccessibleForFree).toBe(true);
  });

  it("lists real capabilities", () => {
    expect(app.featureList.length).toBeGreaterThan(0);
    for (const feature of app.featureList) expect(feature.trim()).not.toBe("");
  });

  // Self-serving review markup is an explicit Google violation and a
  // manual-action risk. This guard exists so nobody adds it "for the stars".
  it("never claims ratings or reviews", () => {
    const json = serialize(pageGraph);
    expect(json).not.toContain("aggregateRating");
    expect(json).not.toContain("ratingValue");
    expect(json).not.toContain('"review"');
  });

  // There is no /search route and the sitelinks searchbox is deprecated.
  it("does not declare a SearchAction", () => {
    expect(serialize(siteGraph)).not.toContain("SearchAction");
    expect(serialize(pageGraph)).not.toContain("SearchAction");
  });
});

describe("webPage", () => {
  const node = webPage(contentRoute);

  it("uses the registry's schemaType, title, description, and date", () => {
    expect(node["@type"]).toBe(contentRoute.schemaType);
    expect(node.name).toBe(contentRoute.title);
    expect(node.description).toBe(contentRoute.description);
    expect(node.dateModified).toBe(contentRoute.lastModified);
  });

  it("gives each page a unique, absolute @id and url", () => {
    expect(node["@id"]).toBe(`${SITE_URL}${contentRoute.path}#webpage`);
    expect(node.url).toBe(`${SITE_URL}${contentRoute.path}`);
    const ids = ROUTES.map((r) => webPage(r)["@id"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches the page to the site and the product", () => {
    expect(node.isPartOf).toEqual({ "@id": SITE_ID });
    expect(node.about).toEqual({ "@id": APP_ID });
  });
});

describe("faqPage", () => {
  const faqs = [
    { question: "Is it free?", answer: "Yes, entirely." },
    { question: "Do I need an account?", answer: "No." },
  ];
  const faqRoute = findRoute("/faq");
  const node = faqPage(faqRoute, faqs);

  it("is a WebPage subtype carrying the page's own identity", () => {
    expect(node["@type"]).toBe("FAQPage");
    // Same @id as webPage() would produce: FAQPage IS the page, not a second
    // node describing the same URL.
    expect(node["@id"]).toBe(webPage(faqRoute)["@id"]);
    expect(node.url).toBe(webPage(faqRoute).url);
    expect(node.isPartOf).toEqual({ "@id": SITE_ID });
  });

  it("maps each FAQ to a Question with an acceptedAnswer", () => {
    expect(node.mainEntity).toHaveLength(2);
    expect(node.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, entirely." },
    });
  });

  // The bug this catches: emitting webPage() alongside faqPage() for /faq put
  // two differently-@id'd FAQPage nodes in one graph describing one URL.
  it("produces exactly one node per @type when composed into a page graph", () => {
    const g = graph(faqPage(faqRoute, faqs), breadcrumbs([{ name: "Home", path: "/" }]));
    const types = g["@graph"].map((n) => n["@type"]);
    expect(new Set(types).size).toBe(types.length);
    const ids = g["@graph"].map((n) => n["@id"]).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("breadcrumbs", () => {
  const crumbs = breadcrumbs([
    { name: "Home", path: "/" },
    { name: "How Tarazu works", path: "/how-it-works" },
  ]);

  it("numbers positions from 1 in order", () => {
    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it("emits absolute item URLs", () => {
    expect(crumbs.itemListElement.map((i) => i.item)).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/how-it-works`,
    ]);
  });

  it("keeps the supplied names", () => {
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(["Home", "How Tarazu works"]);
  });
});

describe("organization and person", () => {
  it("links the founder by reference, not by nesting a duplicate Person", () => {
    expect(organization().founder).toEqual({ "@id": PERSON_ID });
  });

  it("names the publisher of the website", () => {
    expect(website().publisher).toEqual({ "@id": ORG_ID });
  });

  it("only claims external profiles over https", () => {
    for (const url of [...person().sameAs, ...organization().sameAs]) {
      expect(url.startsWith("https://")).toBe(true);
    }
  });

  // Person.url resolves the author entity, so it must point at a page that is
  // actually registered — schema pointing at a 404 is worse than schema that
  // stays quiet.
  it("points Person.url at a registered route", () => {
    expect(person().url).toBe(`${SITE_URL}/about`);
    expect(findRoute("/about")).not.toBeNull();
  });

  it("still omits Organization.logo, which has no asset behind it", () => {
    expect(organization().logo).toBeUndefined();
  });
});
