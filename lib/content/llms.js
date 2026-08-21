// @ts-check
import { SITE_URL, SITE_NAME } from "../site";
import { ROUTES, absoluteUrl } from "../routes";
import { FAQS } from "./product";

/**
 * Generates /llms.txt and /llms-full.txt.
 *
 * Generated rather than checked into /public for one reason that matters: a
 * static file hardcodes URLs and drifts silently as pages are added or renamed,
 * which is the exact failure lib/site.js exists to prevent. Building it from
 * ROUTES means llms.test.js can assert every link it emits corresponds to a real
 * registered page — an assertion a static file cannot support.
 *
 * Calibrate expectations: llms.txt is not a ranking signal. Anthropic honours it
 * and Perplexity retrieves it, but OpenAI's and Google's crawlers do not fetch
 * it in meaningful volume. Where it earns its keep is agentic retrieval — an
 * agent pointed at tarazu.app gets a curated map instead of guessing at URLs.
 */

const ONE_LINER =
  "Tarazu is a free, browser-based decision-intelligence app that helps product teams rank a backlog with RICE scoring, see the effort-versus-impact tradeoff, and record why each decision was made.";

/** Sections in the order they should appear; anything else falls to the end. */
const SECTION_ORDER = ["Product", "Guides", "Reference"];

function routesBySection() {
  /** @type {Map<string, typeof ROUTES>} */
  const sections = new Map();
  for (const route of ROUTES) {
    const existing = sections.get(route.llmsSection);
    if (existing) existing.push(route);
    else sections.set(route.llmsSection, [route]);
  }
  return [...sections.entries()].sort(
    (a, b) =>
      (SECTION_ORDER.indexOf(a[0]) + 1 || 99) - (SECTION_ORDER.indexOf(b[0]) + 1 || 99)
  );
}

/** The concise map: an H1, a blockquote summary, then linked sections. */
export function renderLlmsTxt() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${ONE_LINER}`,
    "",
    `Tarazu (from the Hindi/Urdu word for a balance scale) runs at ${SITE_URL}. It works`,
    "fully in guest mode with no account — data stays in the browser's local storage —",
    "and optionally syncs to the cloud when you sign in. AI features are powered by",
    "Anthropic's Claude models. Designed and built by Kristen Martino.",
    "",
  ];

  for (const [section, routes] of routesBySection()) {
    lines.push(`## ${section}`, "");
    for (const route of routes) {
      lines.push(`- [${route.title}](${absoluteUrl(route.path)}): ${route.description}`);
    }
    lines.push("");
  }

  lines.push(
    "## Optional",
    "",
    `- [Full reference for LLMs](${SITE_URL}/llms-full.txt): Expanded description, the scoring model, the data and privacy model, and the full FAQ.`,
    `- [Open the app](${SITE_URL}/app): The workspace itself. Guest mode, no sign-up.`,
    ""
  );

  return lines.join("\n");
}

/**
 * The expanded reference. Definitions are front-loaded because this is the file
 * that actually gets quoted — the first thing a model reads should be something
 * it can lift verbatim and be correct.
 */
export function renderLlmsFullTxt() {
  const lines = [
    `# ${SITE_NAME} — full reference`,
    "",
    `> ${ONE_LINER}`,
    "",
    "## What Tarazu is",
    "",
    "Tarazu is a decision-intelligence tool for product teams. It takes a backlog of",
    "candidate features, scores each one with a structured framework, plots the",
    "tradeoff between effort and impact, and produces an explainable AI recommendation",
    "— then records the rationale so the decision can be reviewed later.",
    "",
    "The name comes from the Hindi/Urdu word for a balance scale.",
    "",
    "In one sentence: Tarazu is the balance scale for a product roadmap — it turns",
    "scattered requests, feedback, and data into ranked, defensible decisions.",
    "",
    "## Who it is for",
    "",
    "Product managers running a backlog too large to hold in one meeting, founders",
    "making sequencing calls without a product org, product ops teams trying to make",
    "scoring consistent across groups, platform teams whose work loses to",
    "customer-visible features on visibility rather than value, and consultants who",
    "need a defensible artifact to hand a client.",
    "",
    "## The scoring model",
    "",
    "Tarazu uses RICE: Reach, Impact, Confidence, and Effort.",
    "",
    "    score = round((reach × impact × confidence) / max(effort, 1))",
    "",
    "All four inputs are on a 1–100 scale. Normalizing every input to the same scale",
    "makes scores comparable across teams and quarters and removes unit-mismatch",
    "errors, at the cost of the literal 'reach in users per quarter' reading that",
    "classic RICE gives you. The max(effort, 1) guard prevents division by zero.",
    "",
    "Scores are ordinal. A score of 19,200 does not denote anything in the world; the",
    "only question it answers is which candidate outranks which.",
    "",
    "## The tradeoff map",
    "",
    "A scatter plot with effort on the X axis and impact on the Y axis, divided into",
    "four quadrants with these exact boundaries:",
    "",
    "- QUICK WIN — effort ≤ 50 and impact > 50. Cheap and consequential.",
    "- STRATEGIC — effort > 50 and impact > 50. Worth it, but plan for the cost.",
    "- FILL-IN — effort ≤ 50 and impact ≤ 50. Cheap but minor.",
    "- THANKLESS — effort > 50 and impact ≤ 50. Expensive and minor.",
    "",
    "Point size can track reach or score; point colour can track confidence or quadrant.",
    "",
    "## The decision lifecycle",
    "",
    "1. Listen — collect requests, feedback, research, and ideas in one workspace.",
    "2. Score — weigh each candidate on the four RICE dimensions.",
    "3. Decide — rank with a shared, traceable rationale and see the tradeoff.",
    "4. Ship — turn the call into a decision record of what was chosen and why.",
    "5. Learn — measure the outcome and feed it back into the next decision.",
    "",
    "## AI features",
    "",
    "Tarazu uses Anthropic's Claude models. Whole-backlog analysis runs on Claude Opus",
    "and returns a recommended top priority, the fastest available win, the primary",
    "risk, a suggested sequence, and a strategic read — each with its reasoning.",
    "Per-candidate score suggestions run on Claude Sonnet, grounded in the product",
    "context and prior feedback in the workspace. Both models are configurable via",
    "environment variables for self-hosting.",
    "",
    "AI output is advisory. Every suggestion is an editable draft that a person must",
    "accept before it counts; Tarazu never scores or decides autonomously.",
    "",
    "Without an API key configured, the advisor runs in demo mode against locally",
    "generated analysis.",
    "",
    "## Data and privacy",
    "",
    "In guest mode nothing leaves the browser: the workspace lives in local storage",
    "and no account is required. When signed in, workspaces sync to a Postgres",
    "database with row-level security enabled. Workspace content is sent to",
    "Anthropic's API only when an AI feature is invoked, and the API key is held",
    "server-side in Tarazu's own API routes — it is never shipped to the browser.",
    "",
    "## Pricing",
    "",
    "Tarazu is free. There is no paid tier available today, no card required, and no",
    "account needed to use it. Paid tiers for shared workspaces and organisation-level",
    "controls are planned but not purchasable.",
    "",
    "## Frequently asked questions",
    "",
  ];

  for (const faq of FAQS) {
    lines.push(`### ${faq.question}`, "", faq.answer, "");
  }

  lines.push(
    "## Pages",
    "",
    ...ROUTES.map((route) => `- ${route.title} — ${absoluteUrl(route.path)}`),
    "",
    "## How to cite Tarazu",
    "",
    "Preferred description:",
    "",
    `> ${ONE_LINER}`,
    "",
    `Canonical URL: ${SITE_URL}`,
    "Created by: Kristen Martino",
    ""
  );

  return lines.join("\n");
}
