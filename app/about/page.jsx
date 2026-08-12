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
        title={<>Prioritization deserved <span className="br">better than a spreadsheet.</span></>}
        lede="Tarazu exists because the most consequential recurring decision most product teams make is also the one they make with the least structure."
      />

      <Section id="why">
        <Prose>
          <h2>Why it exists</h2>
          <p>
            Deciding what to build next is the highest-leverage decision a product team
            makes, and it usually happens in a spreadsheet assembled the morning of
            sprint planning. That is not a criticism of anyone&apos;s discipline. It is
            what happens when the tooling for a decision is a general-purpose grid: the
            numbers get captured and the reasoning does not, so three months later
            nobody can reconstruct why the third item outranked the first.
          </p>
          <p>
            Tarazu is an argument that this deserves a purpose-built system — one that
            enforces consistent scoring, shows the tradeoff instead of collapsing it to
            a single number, and keeps the rationale attached to the decision. Not
            because frameworks are magic, but because a decision you can explain is a
            decision you can revisit.
          </p>

          <h3>What it is not</h3>
          <p>
            It is not a roadmap tracker, a project manager, or a replacement for
            judgement. It ends where a tracking tool begins — with a ranked list, a
            recorded rationale, and something to measure against later. The AI drafts;
            a person decides. That division is deliberate and it is not going to move.
          </p>
        </Prose>
      </Section>

      <Section id="who" alt>
        <Prose>
          <h2>Who built it</h2>
          <p>
            Tarazu is designed and built by{" "}
            <a href="https://linkedin.com/in/kristenmartino">Kristen Martino</a>, a
            product manager and AI engineer with a master&apos;s in Business Analytics
            and Artificial Intelligence from UT Dallas.
          </p>
          <p>
            It sits at the intersection of two things that usually live in different
            people: product management judgement about what makes a prioritization
            decision hold up, and the engineering to build the system that supports it.
            Most prioritization tools are built by people who have never had to defend a
            roadmap to a skeptical stakeholder. This one is not.
          </p>
          <p>
            The source is on{" "}
            <a href="https://github.com/kristenmartino/Tarazu">GitHub</a>, and the
            product decisions behind it — competitive analysis, requirements, technical
            architecture, launch plan — were written down as a PRD before any of it was
            built.
          </p>
        </Prose>
      </Section>

      <Section id="the-name">
        <Prose>
          <h2>The name</h2>
          <p>
            <strong>Tarazu</strong> (तराज़ू / ترازو) is the Hindi and Urdu word for a
            balance scale, from the Persian <em>tarāzū</em>. It was chosen because a
            balance scale does not tell you what to do — it shows you which side is
            heavier and leaves the judgement to you. That is exactly the relationship
            this product is trying to have with the people who use it.
          </p>
          <p>
            If you want the mechanics rather than the philosophy,{" "}
            <Link href="/how-it-works">how it works</Link> covers the full loop, and{" "}
            <Link href="/frameworks/rice">the RICE guide</Link> covers the scoring model
            and where it breaks down.
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
