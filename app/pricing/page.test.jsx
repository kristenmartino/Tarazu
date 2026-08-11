import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PricingPage, { metadata } from "./page";
import { webApplication } from "../../lib/schema";

const html = renderToStaticMarkup(<PricingPage />);

describe("/pricing renders server-side", () => {
  it("emits exactly one h1", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("answers the price question in plain text", () => {
    expect(html).toContain("$0");
  });

  it("says an account is not required", () => {
    expect(html).toContain("guest mode");
  });

  it("lists all four tiers", () => {
    for (const tier of ["Free", "Pro", "Team", "Enterprise"]) {
      expect(html).toContain(tier);
    }
  });
});

// The honesty constraints. A page that implies you can buy something you cannot
// is worse than no pricing page, and it is the kind of thing an LLM will repeat
// as fact.
describe("pricing claims stay honest", () => {
  it("marks exactly one tier available and the rest planned", () => {
    expect(html.match(/tier-available/g)).toHaveLength(1);
    expect(html.match(/tier-planned/g)).toHaveLength(3);
  });

  it("never displays a price other than free", () => {
    // $0 legitimately appears more than once (the tier card and the headline
    // fact). What must not appear is any *other* figure — a planned tier showing
    // a number would imply something is purchasable.
    const prices = html.match(/\$[\d,]+/g) ?? [];
    expect(prices.length).toBeGreaterThan(0);
    expect(prices.every((p) => p === "$0"), `found ${prices.join(", ")}`).toBe(true);
  });

  it("never invites contact for a tier that does not exist", () => {
    expect(html.toLowerCase()).not.toContain("contact sales");
    expect(html.toLowerCase()).not.toContain("request a demo");
    expect(html.toLowerCase()).not.toContain("start free trial");
  });

  it("agrees with the price declared in the product schema", () => {
    // WebApplication claims price "0" site-wide; if pricing ever changes, these
    // two must move together or the markup contradicts the page.
    expect(webApplication().offers.price).toBe("0");
    expect(webApplication().isAccessibleForFree).toBe(true);
    expect(html).toContain("$0");
  });
});

describe("/pricing metadata", () => {
  it("declares its own canonical", () => {
    expect(metadata.alternates.canonical).toBe("/pricing");
  });
});
