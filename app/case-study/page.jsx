import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, CtaBand } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, webPage, breadcrumbs } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";

const route = findRoute("/case-study");
export const metadata = pageMetadata(route);

export default function CaseStudyPage() {
  return <MarketingShell>
    <JsonLd id="ld-case-study" data={graph(webPage(route), breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Case study", path: route.path },
    ]))} />
    <PageHero
      eyebrow="Portfolio case study · Kristen Martino"
      title={<>Make the decision <span className="br">easy to revisit.</span></>}
      lede="Building Tarazu: an early product exploring how to keep evidence, assumptions and reasoning connected when a product decision changes."
    />
    <Section id="case-study">
      <Prose>
        <p><strong>My role:</strong> product direction, workflow design and delivery. <strong>Stage:</strong> working early-access product.</p>
        <p><Link href="/demo">Try the fictional Relay demo</Link> · <a href="https://github.com/kristenmartino/Tarazu">Explore the source</a></p>

        <h2>The problem I chose to explore</h2>
        <p>A ranked backlog can show what came first while leaving the reasoning hard to reconstruct. My hypothesis was that keeping evidence and assumptions beside the choice could help a product practitioner revisit a difficult test-or-build decision. Whether that saves meaningful time still needs to be demonstrated.</p>

        <h2>Three product choices</h2>
        <h3>Give estimates a visible basis</h3>
        <p>I added shared scoring anchors, candidate-specific questions and links from scoring claims to supporting or conflicting evidence. Facts, estimates and AI assumptions have separate labels. This asks people for more context up front; the tradeoff is a clearer basis for reviewing a score. Labels alone do not verify a claim.</p>

        <h3>Keep the decision as it was recorded</h3>
        <p>A saved decision preserves its originating brief revision and evidence. Editing the current investigation leaves the earlier record intact. Keeping those copies adds complexity, but lets a reviewer see what was known at the time. A saved draft remains distinct from an approved build.</p>

        <h3>Show the story before the form</h3>
        <p>The walkthrough originally opened a long editor. Feedback exposed how easily a visitor could miss the strongest story. I changed it to four short, read-only steps: Problem, Evidence, Decision and Next test. Detailed records stay available when someone wants to inspect the work. This presents the prepared example first; independent first-use testing is still needed.</p>

        <h2>How I used AI in development</h2>
        <p>I used AI coding tools for implementation, testing and debugging. I directed the product requirements, workflow choices and acceptance decisions, iterating on the working product as gaps became visible.</p>

        <h2>What I learned</h2>
        <p>Clearer prompts alone did not reliably stop the AI repeating answered questions. Checks against supplied answers and source excerpts became part of the workflow. They add time and can still misinterpret context. I also learned to separate software verification from evidence that the product is useful.</p>

        <h2>What works, and what comes next</h2>
        <p>The deployed product supports a guest demo, saved validation briefs and preserved decision history. Automated checks cover software behavior; individual live AI checks provide narrower sanity checks. Relay uses fictional research and proposed tests. Customer adoption, business benefit and willingness to pay remain unverified here.</p>
        <p>My next step is to observe people using their own decisions, record where they need help, and see whether they return with new evidence. That will guide the next product changes.</p>
      </Prose>
    </Section>
    <CtaBand
      title={<>Follow the decision <span className="br">through the demo.</span></>}
      body="A short fictional example, available without an account."
      primaryLabel="Try the Relay demo"
      primaryHref="/demo"
    />
  </MarketingShell>;
}
