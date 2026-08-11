import { SITE_URL } from "../lib/site";

// Only /api/ is disallowed. API routes return JSON and cannot carry a meta tag,
// so Disallow is the right tool there.
//
// /app, /sign-in, and /sign-up are deliberately NOT disallowed: Disallow blocks
// *crawling*, which prevents a crawler from ever reading the noindex tag those
// routes now serve (app/app/layout.jsx, app/(auth)/layout.jsx). A
// disallowed-but-linked URL can still appear as a bare entry — and the landing
// footer does link both auth routes. Allow the crawl, serve noindex.
//
// This also removes a prefix-match hazard: `Disallow: /app` would have silently
// blocked a future /about or /approach.
const DISALLOW = ["/api/"];

// IMPORTANT: per the robots.txt spec, a crawler that finds a record naming its own
// user-agent ignores the `*` record ENTIRELY. So every named record below must
// repeat the full disallow list — otherwise naming an agent *grants* it everything
// the `*` rule blocks. Building each rule from the same constant is what makes that
// impossible to get wrong. app/robots.test.js asserts it.
const rule = (userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW });

// Search and retrieval crawlers: they fetch at query time or build a citable index.
// These are the ones that send traffic and citations back.
const RETRIEVAL_AGENTS = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "DuckDuckBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

// Training / corpus crawlers. Note Google-Extended and Applebot-Extended are NOT
// crawlers — they are opt-out tokens governing whether already-crawled content may
// train Gemini / Apple Intelligence. Blocking them has zero effect on Search rank.
//
// We allow all of them on purpose: the indexable surface is marketing copy whose
// entire job is to be repeated, there is nothing proprietary to protect, and being
// in the pretraining corpus is the point in a category where discovery happens via
// "what should I use for X".
const TRAINING_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
];

export const AI_AGENTS = [...RETRIEVAL_AGENTS, ...TRAINING_AGENTS];
export { DISALLOW };

export default function robots() {
  return {
    rules: [rule("*"), ...AI_AGENTS.map(rule)],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
