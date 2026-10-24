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
      lede="Why I built Tarazu, the choices I made, and what still needs testing."
    />
    <Section id="case-study">
      <Prose>
        <p><strong>My role:</strong> I chose the requirements and decided which changes to accept. <strong>Stage:</strong> working early-access product.</p>
        <p><Link href="/demo">Try the fictional Relay demo</Link> · <a href="https://github.com/kristenmartino/Tarazu">Explore the source</a></p>

        <h2>Why I built it</h2>
        <p>A ranked backlog tells you which option came first. It often takes more work to explain why. I built Tarazu to keep the sources and notes beside the choice, so someone can return to them later.</p>

        <h2>Three product choices</h2>
        <h3>Show what a score is based on</h3>
        <p>A score such as “Impact: 75” says little on its own. I added shared definitions and links to supporting or conflicting sources. People have to enter more context, but a reviewer can see what the estimate rests on. Facts, estimates and AI assumptions keep separate labels.</p>

        <h3>Keep earlier reasoning available</h3>
        <p>Editing an investigation should not rewrite an earlier decision. I kept a copy of the brief and sources with each saved decision, then added dated reviews for later updates. Those copies take more work to store and display, but they let a reader see what changed.</p>

        <h3>Show the story before the form</h3>
        <p>The first walkthrough opened a long editor. A visitor could miss why the team changed its mind. I replaced that opening with four short steps: Problem, Evidence, Decision and Next test. The full records are still there for anyone who wants to check them.</p>

        <h2>How I used AI in development</h2>
        <p>I used AI coding tools to build, test and debug Tarazu. I set the requirements and decided which changes to accept.</p>

        <h2>What I learned</h2>
        <p>I tried clearer prompts to stop the AI asking questions that had already been answered. That was not reliable enough, so I added checks against the supplied answers and source excerpts. The checks add time and can still misread context. Testing the software also taught me how much remains to learn from someone using it for their own decision.</p>

        <h2>What works, and what comes next</h2>
        <p>The working product lets someone compare options, save a brief, copy the decision and add a later review. Relay is a fictional example, not evidence of customer results. I have checked the software behavior; usefulness, repeat use and willingness to pay still need to be tested.</p>
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
