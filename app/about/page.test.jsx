import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata } from "./page";
import { person, PERSON_ID } from "../../lib/schema";

const html = renderToStaticMarkup(<AboutPage />);

describe("/about renders server-side", () => {
  it("emits exactly one h1", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("names the author and their credential", () => {
    expect(html).toContain("Kristen Martino");
    expect(html).toContain("UT Dallas");
  });

  it("links the profiles the Person entity claims", () => {
    for (const url of person().sameAs) {
      expect(html, `page does not link ${url}`).toContain(url);
    }
  });

  it("explains the name's origin", () => {
    expect(html).toContain("balance scale");
    expect(html).toContain("Persian");
  });

  it("keeps the AI-drafts-a-person-decides boundary explicit", () => {
    expect(html).toContain("The AI drafts");
  });
});

// This page is what makes author attribution mean something: it is where the
// Person entity referenced site-wide actually resolves. If the two stop agreeing,
// schema names someone the site never introduces.
describe("/about resolves the author entity", () => {
  const doc = JSON.parse(
    html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]
  );
  const page = doc["@graph"].find((n) => n["@type"] === "AboutPage");

  it("is typed as an AboutPage", () => {
    expect(page).toBeDefined();
  });

  it("points mainEntity at the site-wide Person node", () => {
    expect(page.mainEntity).toEqual({ "@id": PERSON_ID });
  });

  it("is the page Person.url points back at", () => {
    expect(person().url).toBe(page.url);
  });
});

describe("/about metadata", () => {
  it("declares its own canonical", () => {
    expect(metadata.alternates.canonical).toBe("/about");
  });
});
