import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, KeyFact, ComparisonTable, CtaBand } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, webPage, breadcrumbs } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";

const route = findRoute("/how-it-works");

export const metadata = pageMetadata(route);

// Synchronous on purpose: a sync page component can be rendered directly in
// vitest with renderToStaticMarkup, which is how the server-render assertion in
// app/how-it-works/page.test.jsx proves the copy is in the HTML.
export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <JsonLd
        id="ld-how-it-works"
        data={graph(
          webPage(route),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: route.title, path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="How it works"
        title={<>From signal to shipped, <span className="br">in one loop.</span></>}
        lede="Tarazu runs the whole arc of a product decision. Each step produces something the next one needs — and the last step feeds the first, so the system gets sharper with every call you make."
      />

      <Section id="listen">
        <Prose>
          <h2>01 · Listen — every signal in one place</h2>
          <p>
            Requests, customer feedback, support themes, research notes, and internal ideas
            land in one workspace instead of four tools. You can type them in or import a
            CSV; the importer maps your columns onto Tarazu&apos;s fields and routes rows by
            type, so an existing spreadsheet is a starting point rather than something to
            abandon.
          </p>
          <p>
            The point isn&apos;t collection for its own sake. A score you can defend needs
            evidence attached to it, and evidence scattered across three tools is evidence
            nobody checks.
          </p>
        </Prose>
      </Section>

      <Section id="score" alt>
        <Prose>
          <h2>02 · Score — the same way, every time</h2>
          <p>
            Every candidate is scored on four dimensions — reach, impact, confidence, and
            effort — each on a 1–100 slider. The score recalculates as you drag.
          </p>

          <KeyFact label="The scoring formula">
            <p>
              <code>score = round((reach × impact × confidence) ÷ max(effort, 1))</code>
            </p>
            <p style={{ marginTop: 10 }}>
              All four inputs use the same 1–100 scale. Normalizing them this way makes
              candidates comparable across teams and quarters, and removes the unit-mismatch
              errors that make classic RICE spreadsheets disagree with each other. The
              trade-off is that you give up the literal &ldquo;reach in users per
              quarter&rdquo; reading — the number becomes a rank, not a measurement.
            </p>
          </KeyFact>

          <h3>Where the AI fits</h3>
          <p>
            Tarazu can draft scores for you. Per-candidate suggestions come from Claude
            Sonnet, grounded in the product context you&apos;ve written and any prior
            feedback in the workspace. Every suggestion arrives as an editable draft with
            its reasoning attached.
          </p>
          <p>
            <strong>The AI never scores on its own.</strong> A suggestion has to be accepted
            by a person before it counts, because the value of a prioritization system is
            that someone is accountable for the call — and you cannot hold a model
            accountable.
          </p>
        </Prose>
      </Section>

      <Section id="decide">
        <Prose>
          <h2>03 · Decide — see the tradeoff before you make the call</h2>
          <p>
            The tradeoff map plots every candidate with effort on the horizontal axis and
            impact on the vertical, splitting the field into four quadrants. Point size can
            track reach or score; point colour can track confidence or quadrant.
          </p>
        </Prose>

        <ComparisonTable
          caption="Quadrant boundaries, exactly as Tarazu computes them."
          columns={["Quadrant", "Effort", "Impact", "What it means"]}
          rows={[
            ["QUICK WIN", "≤ 50", "> 50", "Do these first — cheap and consequential."],
            ["STRATEGIC", "> 50", "> 50", "Worth it, but plan for the cost."],
            ["FILL-IN", "≤ 50", "≤ 50", "Cheap but minor. Fill gaps, don't build a roadmap on them."],
            ["AVOID", "> 50", "≤ 50", "Expensive and minor. Say no, and record why."],
          ]}
        />

        <Prose>
          <h3>The advisor</h3>
          <p>
            One click runs a whole-backlog analysis through Claude Opus. It returns a
            recommended top priority, the fastest available win, the risk most likely to
            bite, a suggested sequence, and a strategic read on the set as a whole — each
            with the reasoning that produced it, so you can disagree with the argument
            rather than just the answer.
          </p>
          <p>
            Without an API key configured, the advisor runs in demo mode against locally
            generated analysis, so the flow is explorable before you commit anything.
          </p>
        </Prose>
      </Section>

      <Section id="ship" alt>
        <Prose>
          <h2>04 · Ship — the call becomes a record</h2>
          <p>
            A decision is recorded with what you chose, what you chose against, and why.
            Score changes are kept in history and can be reverted, so &ldquo;why is this
            ranked third now?&rdquo; has an answer that isn&apos;t someone&apos;s memory of
            a meeting.
          </p>
          <p>
            This is the part spreadsheets lose. The numbers survive; the argument that
            produced them doesn&apos;t — which is why the same debate reopens every quarter.
          </p>
        </Prose>
      </Section>

      <Section id="learn">
        <Prose>
          <h2>05 · Learn — feed the outcome back</h2>
          <p>
            Once something ships, record what actually happened. That outcome becomes
            context for the next round of scoring: the estimates your team habitually
            inflates become visible, and later AI suggestions are grounded in your own
            track record rather than in generic priors.
          </p>
          <p>Then step 05 feeds step 01, and the loop runs again.</p>
        </Prose>
      </Section>

      <Section id="who-its-for" alt>
        <Prose>
          <h2>Who it&apos;s for</h2>
          <p>
            Tarazu is built for the person who has to defend the roadmap, whatever their
            title:
          </p>
          <ul>
            <li>
              <strong>Product managers</strong> running a backlog bigger than a meeting can
              hold, who need the ranking to survive contact with stakeholders.
            </li>
            <li>
              <strong>Founders</strong> making sequencing calls without a product org to
              delegate them to.
            </li>
            <li>
              <strong>Product ops</strong> trying to make scoring consistent across teams
              that each invented their own.
            </li>
            <li>
              <strong>Platform and infrastructure teams</strong> whose work competes with
              customer-visible features and loses on visibility rather than value.
            </li>
            <li>
              <strong>Consultants and fractional PMs</strong> who need a defensible
              artifact to hand a client, not a spreadsheet only they can read.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="what-you-need">
        <Prose>
          <h2>What you need to start</h2>
          <KeyFact label="Requirements">
            <p>
              Nothing. Tarazu runs in guest mode with no account: your workspace is stored
              in your browser&apos;s local storage and never leaves the device. Sign in only
              when you want it synced across machines.
            </p>
          </KeyFact>
          <p>
            When you do sign in, workspaces sync to a Postgres database with row-level
            security, and the Anthropic API key that powers the AI features lives
            server-side — it is never shipped to the browser.
          </p>
          <p>
            Curious about the scoring model itself? The{" "}
            <Link href="/">overview</Link> covers the shape of the product; this page covers
            the mechanics.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title={<>Bring balance to your <span className="br">roadmap.</span></>}
        body="Start weighing what to build next — and stop relitigating the same decisions every quarter."
      />
    </MarketingShell>
  );
}
