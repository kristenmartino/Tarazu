import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose } from "../../src/components/marketing/blocks";
import { UsageMeasurement } from "../../src/components/UsageMeasurement";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, webPage } from "../../lib/schema";

const route = findRoute("/privacy");
export const metadata = pageMetadata(route);
export default function PrivacyPage() {
  return <MarketingShell><JsonLd id="ld-privacy" data={graph(webPage(route))} />
    <PageHero eyebrow="Privacy & data" title={<>Your work, <span className="br">explained clearly.</span></>} lede="How Tarazu handles browser work, account data, AI requests and optional usage counts. Updated October 24, 2026." />
    <Section><Prose>
      <h2>Who operates Tarazu</h2><p>Tarazu is operated by Kristen Martino. For questions, access or deletion requests, use <Link href="/contact">Feedback and contact</Link>.</p>
      <h2>Browser work and the fictional demo</h2><p>Guest candidates, evidence, validation briefs, decisions and preferences are stored in this browser’s local storage. The Relay demo has a separate browser copy. Restart demo replaces that example only. Clearing site data removes browser-only work and preferences. Signing out does not clear browser storage; avoid shared devices for private work.</p>
      <h2>Accounts and cloud saving</h2><p>Clerk handles sign-in and account identity. Signed-in workspace content is stored in Supabase. Tarazu uses the account identifier and, where applicable, active organization to authorize workspace access. Browser work is uploaded when you explicitly choose to import it into your account. Cloud work may also have a browser copy for local saving and recovery.</p>
      <h2>When you use AI</h2><p>Signed-in AI actions send the relevant candidate descriptions, Strategy Brief, scoring claims and answers, competing candidates, linked Signals and related decisions through Tarazu’s server to Anthropic. A repair or review can send that context again. Guest demo actions do not call AI. Do not enter confidential or personal information you are not permitted to share with these services.</p><p>Tarazu does not use your workspace content to train a model. Anthropic processes API content under its own <a href="https://privacy.anthropic.com/en/articles/7996868-is-my-data-used-for-model-training">API data-use policies</a>; this page does not promise zero provider retention or a special enterprise agreement.</p>
      <h2>Hosting and operational records</h2><p>Vercel hosts Tarazu and receives normal connection information such as IP address, browser information and requested URL. Clerk, Supabase and Anthropic process data needed to provide their services. Operational records include request times, status codes, account identifiers for request quotas, model names and conservative spending reservations. Monitoring reports contain aggregate health and counts, not workspace text. Do not put private information in URLs.</p>
      <h2>Optional usage measurement</h2><p>Measurement is off until you allow it in this browser. Browser Do Not Track and Global Privacy Control signals take priority. If enabled, Tarazu counts demo opens, walkthrough starts, personal-work starts, brief saves and reopens, AI completions or refusals, and feedback-link clicks. Only the action name, demo/personal/public mode, UTC day and aggregate count are saved. No workspace content, identity, session identifier or full URL is stored in these counters. A feedback click does not mean an email was sent. Counts are actions, not unique people or proven adoption.</p><UsageMeasurement />
      <h2>Retention and deletion</h2><p>Browser work stays until you remove it or clear site data. Cloud workspace content stays until deleted; there is no automatic inactivity deletion schedule. The monitoring workflow schedules aggregate usage counters and AI operational ledgers for pruning after 30 days; a workflow delay can delay cleanup. Provider logs and backups may follow separate retention schedules; Tarazu does not promise immediate removal from every backup.</p><p>To request cloud-data or account help, contact the maker from your account email so ownership can be verified. Deleting a workspace does not by itself delete your Clerk account, email correspondence, or browser copies. The aggregate counters do not include an identifier that supports individual removal.</p>
      <h2>Your controls</h2><p>You can use guest/manual workflows without AI, decline usage measurement, remove browser data and request cloud-data help. CSV and PDF exports have <Link href="/contact#your-work">limited scope</Link> and are not a complete backup. Tarazu does not sell workspace content or use it for advertising.</p>
    </Prose></Section></MarketingShell>;
}
