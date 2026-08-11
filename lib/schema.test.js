import { describe, it, expect } from "vitest";
import {
  person,
  organization,
  website,
  webApplication,
  graph,
  serialize,
  ORG_ID,
  SITE_ID,
  PERSON_ID,
  APP_ID,
} from "./schema";
import { SITE_URL } from "./site";

const siteGraph = graph(organization(), website(), person());
const pageGraph = graph(webApplication());

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

  it("only references site-graph nodes from the page graph", () => {
    const declaredAcrossBoth = new Set([
      ...collectDeclarations(siteGraph),
      ...collectDeclarations(pageGraph),
    ]);
    for (const ref of collectReferences(pageGraph["@graph"])) {
      expect(declaredAcrossBoth, `dangling @id reference: ${ref}`).toContain(ref);
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

  // Omitted on purpose until /about and the icon assets exist — schema pointing
  // at a 404 is worse than schema that stays quiet.
  it("does not point Person.url or Organization.logo at pages that do not exist yet", () => {
    expect(person().url).toBeUndefined();
    expect(organization().logo).toBeUndefined();
  });
});
