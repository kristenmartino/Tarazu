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
        title={<>Where should you keep <span className="br">the decision record?</span></>}
        lede="Spreadsheets and discovery tools can work well. See how Tarazu organizes options, sources and reviews, and when your current setup may be enough."
      />

      <Section id="failure-modes">
        <Prose>
          <h2>Three failure modes of spreadsheet prioritization</h2>
          <p>
            Spreadsheets can support a sound decision process. These problems arise when
            the team has no shared structure for scoring, evidence and later reviews.
          </p>
        </Prose>
        <CardGrid items={SPREADSHEET_PROBLEMS} />
      </Section>

      <Section id="comparison" alt>
        <Prose>
          <h2>Built for prioritization, not just tracking</h2>
          <p>
            Different tools can support the same decision. This is a general guide;
            capabilities vary by product, plan and configuration.
          </p>
        </Prose>

        <ComparisonTable
          caption="Capabilities by tool category. Columns are categories, not specific products."
          columns={CATEGORY_COMPARISON.columns}
          rows={CATEGORY_COMPARISON.rows}
        />

        <Prose>
          <p>
            A spreadsheet, AI conversation or discovery tool can retain reasoning when
            you structure it that way. Tarazu brings the choice, preserved evidence,
            tradeoffs and dated reviews into one workflow. The question is whether
            that structure makes your own decision easier to explain and revisit.
          </p>
        </Prose>
      </Section>

      <Section id="when-a-spreadsheet-wins">
        <Prose>
          <h2>When a spreadsheet is the right answer</h2>
          <p>
            Genuinely, often. Do not adopt a tool for a problem you don&apos;t have:
          </p>
          <ul>
            <li>
              <strong>Fewer than about fifteen candidates.</strong> Below that, you can
              hold the whole set in your head, and the ranking isn&apos;t the hard part.
            </li>
            <li>
              <strong>One decision-maker.</strong> Most of what Tarazu adds is about
              making a decision legible to other people. If that&apos;s not your problem,
              it&apos;s overhead.
            </li>
            <li>
              <strong>A one-off call.</strong> Decision memory only pays off when there&apos;s a next decision that should learn from this one.
            </li>
            <li>
              <strong>A genuinely bespoke scoring model.</strong> If your organisation
              weighs regulatory exposure and contractual commitments, a spreadsheet
              expresses that immediately and no framework tool will.
            </li>
          </ul>
          <p>
            The case for something else starts when the same spreadsheet gets reopened
            every quarter by people who weren&apos;t there when the numbers were written.
          </p>
        </Prose>
      </Section>

      <Section id="migrating" alt>
        <Prose>
          <h2>What you carry over</h2>

          <KeyFact label="Take a decision brief with you">
            <p>
              Import a CSV; export a CSV. Your columns map onto reach, impact,
              confidence, and effort, with common aliases recognised automatically and
              out-of-range values clamped rather than rejected. Ranked output exports
              back to CSV, and the priority view exports to PDF. Copy a saved decision as
              a Markdown brief with preserved source text and dated reviews.
            </p>
          </KeyFact>

          <p>
            The decision brief is a readable handoff, not a full workspace backup. CSV
            and PDF cover the candidates and priority view; they do not contain all
            scoring claims, Signals or saved validation briefs. Keep your source originals.
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
