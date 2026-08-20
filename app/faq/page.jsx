import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, FaqList, CtaBand } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, faqPage, breadcrumbs } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";
import { FAQS } from "../../lib/content/product";

const route = findRoute("/faq");

export const metadata = pageMetadata(route);

export default function FaqPage() {
  return (
    <MarketingShell>
      {/* faqPage() and <FaqList> read the same FAQS array, so the structured data
          can never describe a question the page does not visibly answer.
          faqPage() replaces webPage() here rather than joining it — FAQPage is a
          WebPage subtype, so this URL gets one node, not two. */}
      <JsonLd
        id="ld-faq"
        data={graph(
          faqPage(route, FAQS),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "FAQ", path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="Reference"
        title={<>Questions, <span className="br">answered directly.</span></>}
        lede="No hedging and no demo-request gates. If something here is out of date or unclear, that’s a bug."
      />

      <Section id="questions">
        <FaqList faqs={FAQS} />
      </Section>

      <Section id="more" alt>
        <Prose>
          <h2>Still looking?</h2>
          <p>
            <Link href="/how-it-works">How it works</Link> walks the full decision loop
            step by step. <Link href="/frameworks/rice">The RICE guide</Link> covers the
            scoring model, a worked example, and where the framework stops helping.{" "}
            <Link href="/vs/spreadsheets">Tarazu vs. spreadsheets</Link> compares the
            tool categories honestly, including when a spreadsheet wins.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title={<>Easier to try than to <span className="br">read about.</span></>}
        body="Guest mode needs no account and runs entirely in your browser."
        primaryLabel="Open Tarazu"
        primaryHref="/app"
      />
    </MarketingShell>
  );
}
