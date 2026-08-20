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
        title={<>A backlog is a spreadsheet. <span className="br">A decision is not.</span></>}
        lede="Most teams score their backlog in a grid on the morning of sprint planning and lose the reasoning by the next one. Tarazu keeps the reasoning."
      />

      <Section id="why">
        <Prose>
          <h2>Why it exists</h2>
          <p>
            I kept watching the same thing happen on product teams: someone opens a
            spreadsheet, plugs in reach and impact and confidence, and out comes a
            ranking everyone nods at. Three months later, someone asks why the fourth
            item shipped before the second, and nobody remembers. The numbers are still
            there. The argument that produced them is gone, because a spreadsheet has
            nowhere to put it.
          </p>
          <p>
            Tarazu keeps the argument. It scores a backlog the same way most teams
            already do — RICE, plotted as a tradeoff instead of collapsed into one
            number — and it holds onto the reasoning behind each score long enough for
            someone to check it later.
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
            AI-native product manager with a Master&apos;s in Business Analytics from UT
            Dallas. I built Tarazu myself — product decisions and code both.
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
