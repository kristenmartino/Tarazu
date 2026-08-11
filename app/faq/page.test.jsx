import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FaqPage, { metadata } from "./page";
import { FAQS } from "../../lib/content/product";

const html = renderToStaticMarkup(<FaqPage />);

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

describe("/faq renders server-side", () => {
  it("emits exactly one h1", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("renders every question visibly as a heading", () => {
    for (const faq of FAQS) {
      expect(html, `missing question: ${faq.question}`).toContain(esc(faq.question));
    }
  });

  it("renders every answer visibly", () => {
    for (const faq of FAQS) {
      expect(html, `missing answer for: ${faq.question}`).toContain(esc(faq.answer));
    }
  });
});

// The rule this enforces: FAQ structured data that describes a question the page
// does not visibly answer is a Google structured-data violation. Both come from
// the same array, and this proves they did not diverge in rendering.
describe("FAQPage markup matches the visible page exactly", () => {
  const doc = JSON.parse(
    html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]
  );
  const faqNode = doc["@graph"].find((n) => n["@type"] === "FAQPage");

  it("emits a FAQPage node", () => {
    expect(faqNode).toBeDefined();
  });

  it("has one Question per visible FAQ, in the same order", () => {
    expect(faqNode.mainEntity).toHaveLength(FAQS.length);
    expect(faqNode.mainEntity.map((q) => q.name)).toEqual(FAQS.map((f) => f.question));
  });

  it("gives every Question an acceptedAnswer matching the visible text", () => {
    faqNode.mainEntity.forEach((q, i) => {
      expect(q["@type"]).toBe("Question");
      expect(q.acceptedAnswer["@type"]).toBe("Answer");
      expect(q.acceptedAnswer.text).toBe(FAQS[i].answer);
      expect(html).toContain(esc(q.acceptedAnswer.text));
    });
  });
});

describe("/faq metadata", () => {
  it("declares its own canonical", () => {
    expect(metadata.alternates.canonical).toBe("/faq");
  });
});
