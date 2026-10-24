import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContactPage, { metadata } from "./page";
import { CONTACT_EMAIL, contactHref } from "../../lib/contact";

const html = renderToStaticMarkup(<ContactPage />);
describe("public feedback and contact", () => {
  it("offers explicit email drafts without automatically attaching workspace content", () => {
    expect(html).toContain(contactHref("Tarazu feedback"));
    expect(html).toContain(CONTACT_EMAIL);
    expect(html).toContain("nothing is sent automatically");
    expect(html).toContain("No workspace content or diagnostic logs are attached automatically");
    expect(html).not.toContain("<form");
  });
  it("states the actual export boundary and gives a data-help path", () => {
    expect(html).toContain("Ask for data help or deletion");
    expect(html).toContain("There is currently no complete workspace backup export");
    expect(html).toContain("Start your own decision");
    expect(html).toContain("/app?start=decision");
    expect(html).not.toContain("no lock-in");
  });
  it("renders public metadata and content without client JavaScript", () => {
    expect(metadata.alternates.canonical).toBe("/contact");
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('application/ld+json');
  });
});
