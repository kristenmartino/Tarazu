import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, webPage, breadcrumbs } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";
import { CONTACT_EMAIL, contactHref } from "../../lib/contact";

const route = findRoute("/contact");
export const metadata = pageMetadata(route);

export default function ContactPage() {
  return <MarketingShell>
    <JsonLd id="ld-contact" data={graph(webPage(route), breadcrumbs([{ name: "Home", path: "/" }, { name: "Feedback and contact", path: route.path }]))} />
    <PageHero eyebrow="Feedback & contact" title={<>Help shape <span className="br">Tarazu.</span></>} lede="Tell me what helped, what felt confusing, or where you got stuck. Feedback goes directly to Kristen, Tarazu’s maker." />
    <Section id="get-in-touch"><Prose>
      <h2>Send feedback or get help</h2>
      <p>Email <a href={contactHref("Tarazu feedback")}>{CONTACT_EMAIL}</a>. The links below open a draft in your email app; nothing is sent automatically. If your email app does not open, copy the address into your usual mail service.</p>
      <ul>
        <li><a href={contactHref("Tarazu feedback")}>Share product feedback</a> — what were you trying to decide, and what helped or added work?</li>
        <li><a href={contactHref("Tarazu problem report")}>Report a problem</a> — include the page, what you expected, what happened, and your browser. Screenshots are optional.</li>
        <li><a href={contactHref("Tarazu data help or deletion request")}>Ask for data help or deletion</a> — for signed-in data, contact me from the account email so I can verify the request before making changes.</li>
      </ul>
      <p>No workspace content or diagnostic logs are attached automatically. Include only the details you want to share; omit passwords, API keys and private research notes.</p>
      <p>See <Link href="/privacy">Privacy and data</Link> for storage, AI providers, retention and optional usage-measurement controls.</p>
    </Prose></Section>
    <Section id="your-work" alt><Prose>
      <h2>Your work and the demo stay separate</h2>
      <p>The fictional <Link href="/demo">Relay demo</Link> stays in this browser. <Link href="/app?start=decision">Start your own decision</Link> opens a blank candidate in your workspace and keeps existing work. <Link href="/sign-in?start=decision">Sign in first</Link> if you want cloud saving and AI.</p>
      <p>Guest work is stored in this browser. Restart demo replaces only the Relay example. Clearing browser site data removes browser-only work; it does not delete signed-in cloud records. For cloud data questions or deletion, use the email link above.</p>
      <h2>What exports include</h2>
      <p>CSV exports contain the ranked candidate table, without scoring claims, source relationships or workspace settings. The priority view can be printed to PDF. Signals, saved validation briefs and decision history are not included in those exports. There is currently no complete workspace backup export.</p>
      <p>Read the <Link href="/faq">FAQ</Link> for storage and AI data-sharing details. Running AI after sign-in sends the relevant workspace content to Tarazu and Anthropic; no AI request is made from the guest demo.</p>
    </Prose></Section>
  </MarketingShell>;
}
