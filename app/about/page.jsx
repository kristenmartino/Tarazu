import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, CtaBand } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, webPage, breadcrumbs, PERSON_ID } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";

const route = findRoute("/about");

export const metadata = pageMetadata(route);

export default function AboutPage() {
  return (
    <MarketingShell>
      {/* `mainEntity` points at the Person the root layout already declares, so
          this page is the one that resolves "who is behind Tarazu" for a crawler
          — which is what makes author attribution on future articles mean
          something rather than naming a stranger. */}
      <JsonLd
        id="ld-about"
        data={graph(
          { ...webPage(route), mainEntity: { "@id": PERSON_ID } },
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "About", path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="About"
        title={<>A product decision <span className="br">you can return to.</span></>}
        lede="Tarazu connects a choice with its evidence, tradeoffs and next test, then keeps dated reviews alongside the original reasoning."
      />

      <Section id="why">
        <Prose>
          <h2>Why it exists</h2>
          <p>
            A ranking answers which option came first. It may take more work to
            explain why, especially when someone returns to it months later.
            Tarazu keeps the choice, source notes and later reviews together.
          </p>
          <p>
            Use RICE to compare options, check the sources behind a score, and save
            the next step. Spreadsheets and other discovery tools can also keep
            this context; Tarazu gives it a place in the decision record.
          </p>

          <h3>What it isn&apos;t</h3>
          <p>
            It&apos;s not a roadmap tool or a project tracker, and it doesn&apos;t make the
            call for you. The AI drafts a score; a person decides whether to keep it.
            Where it stops is on purpose — a ranked list and a written-down reason is
            the handoff to whatever you actually run delivery in.
          </p>
        </Prose>
      </Section>

      <Section id="who" alt>
        <Prose>
          <h2>Who built it</h2>
          <p>
            I&apos;m{" "}
            <a href="https://linkedin.com/in/kristenmartino">Kristen Martino</a>, an
            Product manager with a Master&apos;s in Business Analytics from UT
            Dallas. I built Tarazu to keep product decisions connected to their
            evidence, assumptions and reasoning.
          </p>
          <p>
            Writing the PRD before touching the backlog UI was slower than it needed to
            be, but it&apos;s also the reason the scoring model, the AI, and the tradeoff
            map agree with each other instead of pulling in three directions. That PRD,
            the competitive research, and the launch plan are still in the repo.
          </p>
          <p>
            The source is on{" "}
            <a href="https://github.com/kristenmartino/Tarazu">GitHub</a> if you want to
            see how any of it works.
          </p>
          <p>
            Read the <Link href="/case-study">short portfolio case study</Link> for
            the product choices, tradeoffs, development approach and lessons so far.
          </p>
        </Prose>
      </Section>

      <Section id="the-name">
        <Prose>
          <h2>The name</h2>
          <p>
            <strong>Tarazu</strong> (तराज़ू / ترازو) is the Hindi and Urdu word for a
            balance scale, from the Persian <em>tarāzū</em>. A scale doesn&apos;t decide
            anything — it shows you which side is heavier and leaves the rest to you.
            That&apos;s the whole design philosophy in one object.
          </p>
          <p>
            <Link href="/how-it-works">How it works</Link> covers the full loop end to
            end, and <Link href="/frameworks/rice">the RICE guide</Link> gets into the
            scoring model, including where it breaks down.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title={<>Weigh something <span className="br">real.</span></>}
        body="Free, no account, and it runs entirely in your browser until you ask it not to."
        primaryLabel="Open Tarazu"
        primaryHref="/app"
      />
    </MarketingShell>
  );
}
