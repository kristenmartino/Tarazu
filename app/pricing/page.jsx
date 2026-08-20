import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, KeyFact, CtaBand } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, webPage, breadcrumbs } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";

const route = findRoute("/pricing");

export const metadata = pageMetadata(route);

// Exactly one tier is available. The rest are labelled PLANNED and carry no
// price, because listing a price for something you cannot buy is a promise you
// have not made — and "contact us for Enterprise" on a product with no sales
// team is theatre. page.test.jsx asserts only one tier is marked available and
// that no planned tier displays a price.
const TIERS = [
  {
    name: "Free",
    available: true,
    status: "Available now",
    price: "$0",
    for: "Everyone, currently.",
    features: [
      "Unlimited candidates in your workspace",
      "RICE scoring on a 1–100 scale",
      "Effort × impact tradeoff map",
      "AI score suggestions and backlog analysis",
      "CSV import and CSV/PDF export",
      "Guest mode — no account required",
      "Cloud sync when you do sign in",
    ],
  },
  {
    name: "Pro",
    available: false,
    status: "Planned",
    for: "Serious individual use.",
    features: ["Saved scenarios", "Richer AI analysis", "Extended decision history"],
  },
  {
    name: "Team",
    available: false,
    status: "Planned",
    for: "Shared decision-making.",
    features: ["Shared workspaces", "Comments and reviewers", "Approval states", "Role-based access"],
  },
  {
    name: "Enterprise",
    available: false,
    status: "Planned",
    for: "Product organisations.",
    features: ["SSO", "Audit history", "Governance controls", "Admin visibility"],
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <JsonLd
        id="ld-pricing"
        data={graph(
          webPage(route),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Pricing", path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="Pricing"
        title={<>Free, and <span className="br">honestly so.</span></>}
        lede="Everything Tarazu can do today, it does for nothing. No card, no trial clock, no feature held back to create a reason to upgrade."
      />

      <Section id="whats-free">
        <Prose>
          <KeyFact label="What it costs">
            <p>
              <strong>$0.</strong> There&apos;s no paid tier to buy right now, so nothing on
              this page is gated. You don&apos;t even need an account — guest mode runs
              entirely in your browser.
            </p>
          </KeyFact>
          <p>
            Paid tiers are planned, and they&apos;re listed below so you can see where this
            is going. They carry no prices because they aren&apos;t for sale yet, and
            quoting a number for something you cannot buy is a promise nobody has made.
          </p>
        </Prose>
      </Section>

      <Section id="tiers" alt>
        <Prose>
          <h2>Tiers</h2>
        </Prose>
        <div className="tier-grid">
          {TIERS.map((tier) => (
            <div
              className={`tier ${tier.available ? "tier-available" : "tier-planned"}`}
              key={tier.name}
            >
              <span className="tier-name">{tier.name}</span>
              <span className="tier-status">
                {tier.status}
                {tier.price ? ` · ${tier.price}` : ""}
              </span>
              <span className="tier-for">{tier.for}</span>
              <ul>
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="why-free">
        <Prose>
          <h2>Why it&apos;s free</h2>
          <p>
            Tarazu began as a demonstration that prioritization deserves a purpose-built
            system rather than another spreadsheet, and it&apos;s more useful as something
            people actually use than as something people read about. The AI features
            cost real money to run, which is what the planned Team and Enterprise tiers
            are eventually for — shared workspaces and org-level controls, not
            withholding the scoring model.
          </p>

          <h3>What happens to your data</h3>
          <p>
            In guest mode, nothing leaves your browser. If you sign in, workspaces sync
            to a Postgres database with row-level security. Workspace content is sent to
            Anthropic&apos;s API only when you run an AI feature, and the API key stays
            server-side. The full detail is in the <Link href="/faq">FAQ</Link>.
          </p>

          <h3>If a paid tier arrives</h3>
          <p>
            What is free today stays free. Adding a price to something you already rely
            on is the fastest way to make a free tier worthless as a promise.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title={<>Nothing to <span className="br">decide yet.</span></>}
        body="No card, no account, no trial clock. Open it and score something."
        primaryLabel="Open Tarazu"
        primaryHref="/app"
      />
    </MarketingShell>
  );
}
