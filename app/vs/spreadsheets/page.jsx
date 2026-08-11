import Link from "next/link";
import { MarketingShell } from "../../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, CardGrid, ComparisonTable, KeyFact, CtaBand } from "../../../src/components/marketing/blocks";
import { JsonLd } from "../../../src/components/JsonLd";
import { graph, webPage, breadcrumbs } from "../../../lib/schema";
import { pageMetadata } from "../../../lib/metadata";
import { findRoute } from "../../../lib/routes";
import { CATEGORY_COMPARISON, SPREADSHEET_PROBLEMS } from "../../../lib/content/product";

const route = findRoute("/vs/spreadsheets");

export const metadata = pageMetadata(route);

export default function VsSpreadsheetsPage() {
  return (
    <MarketingShell>
      <JsonLd
        id="ld-vs-spreadsheets"
        data={graph(
          webPage(route),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Comparisons", path: "/vs/spreadsheets" },
            { name: "vs. spreadsheets", path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="Comparison"
        title={<>Roadmaps shouldn&apos;t run on <span className="br">whoever argues loudest.</span></>}
        lede="Most product prioritization still happens in spreadsheets, meetings, and opinion loops. Here is what that actually costs — and where a spreadsheet is still the right answer."
      />

      <Section id="failure-modes">
        <Prose>
          <h2>Three failure modes of spreadsheet prioritization</h2>
          <p>
            Spreadsheets are not bad at arithmetic. They are bad at the three things
            that make a prioritization decision hold up a quarter later.
          </p>
        </Prose>
        <CardGrid items={SPREADSHEET_PROBLEMS} />
      </Section>

      <Section id="comparison" alt>
        <Prose>
          <h2>Built for prioritization, not just tracking</h2>
          <p>
            Four categories of tool get used for this job. They are genuinely
            different, and none of them is bad at everything:
          </p>
        </Prose>

        <ComparisonTable
          caption="Capabilities by tool category. Columns are categories, not specific products."
          columns={CATEGORY_COMPARISON.columns}
          rows={CATEGORY_COMPARISON.rows}
        />

        <Prose>
          <p>
            The pattern worth noticing: spreadsheets and generic AI assistants both
            lose the <em>record</em>. A spreadsheet keeps the numbers and drops the
            argument; a chat assistant keeps the argument until the conversation
            scrolls away. Roadmap tools keep a great deal, but what they keep is status
            — what state a thing is in, not why it was chosen over something else.
          </p>
        </Prose>
      </Section>

      <Section id="when-a-spreadsheet-wins">
        <Prose>
          <h2>When a spreadsheet is the right answer</h2>
          <p>
            Genuinely, often. Do not adopt a tool for a problem you do not have:
          </p>
          <ul>
            <li>
              <strong>Fewer than about fifteen candidates.</strong> Below that, you can
              hold the whole set in your head, and the ranking is not the hard part.
            </li>
            <li>
              <strong>One decision-maker.</strong> Most of what Tarazu adds is about
              making a decision legible to other people. If that is not your problem,
              it is overhead.
            </li>
            <li>
              <strong>A one-off call.</strong> Decision memory only pays off when there
              is a next decision that should learn from this one.
            </li>
            <li>
              <strong>A genuinely bespoke scoring model.</strong> If your organisation
              weighs regulatory exposure and contractual commitments, a spreadsheet
              expresses that immediately and no framework tool will.
            </li>
          </ul>
          <p>
            The case for something else starts when the same spreadsheet gets reopened
            every quarter by people who were not there when the numbers were written.
          </p>
        </Prose>
      </Section>

      <Section id="migrating" alt>
        <Prose>
          <h2>What you carry over</h2>

          <KeyFact label="No lock-in">
            <p>
              Import a CSV; export a CSV. Your columns map onto reach, impact,
              confidence, and effort, with common aliases recognised automatically and
              out-of-range values clamped rather than rejected. Ranked output exports
              back to CSV, and the priority view exports to PDF.
            </p>
          </KeyFact>

          <p>
            This matters more than it sounds. A prioritization tool you cannot leave is
            a tool that can stop earning its place and keep it anyway — so the exit
            being cheap is part of the argument for walking in.
          </p>
          <p>
            If you want the mechanics before you move anything, the{" "}
            <Link href="/frameworks/rice">RICE guide</Link> covers the scoring model
            and where it breaks down, and <Link href="/how-it-works">how it works</Link>{" "}
            walks the full loop.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title={<>Bring your <span className="br">spreadsheet.</span></>}
        body="Import a CSV and see the same backlog as a ranked list and a tradeoff map. Free, no account needed."
        primaryLabel="Try it with your data"
      />
    </MarketingShell>
  );
}
