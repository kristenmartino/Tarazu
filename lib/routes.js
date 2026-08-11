// @ts-check
import { SITE_URL } from "./site";

/**
 * Every public, indexable route on tarazu.app, in one place.
 *
 * This is the single source the sitemap, the marketing nav, llms.txt, and the
 * JSON-LD builders all read from, so adding a page is one row here rather than
 * four edits that drift apart. It is deliberately pure data — no React, no
 * next/* imports — so a route handler, a server component, and a vitest file can
 * all import it.
 *
 * Add a row in the same PR that adds the page, never ahead of it:
 * routes.test.js asserts every path here has a page.jsx on disk (and vice
 * versa), because a sitemap advertising a 404 is worse than a short sitemap.
 *
 * @typedef {Object} RouteEntry
 * @property {string} path              Absolute, leading slash, no trailing slash ("/" excepted).
 * @property {string} title             Bare page title; lib/metadata.js composes the full one.
 * @property {string} description       50–160 chars. Doubles as the meta description and the llms.txt summary.
 * @property {string} [socialDescription] Optional shorter copy for OG/Twitter cards; falls back to `description`.
 * @property {string} lastModified      Hand-set ISO date (YYYY-MM-DD). See note below.
 * @property {"weekly"|"monthly"|"yearly"} changeFrequency
 * @property {number} priority          0–1, sitemap priority.
 * @property {{group: string, label: string, order: number}|null} nav  Footer/header nav placement, or null.
 * @property {"WebSite"|"WebPage"|"FAQPage"|"AboutPage"} schemaType
 * @property {string} llmsSection       Heading this lands under in llms.txt.
 */

/**
 * `lastModified` is hand-set on purpose.
 *
 * Deriving it from build time would make every route claim to have changed on
 * every deploy; Google discounts lastmod it judges unreliable, so that converts
 * a useful signal into noise. Deriving it from git fails differently — Vercel's
 * build container does not reliably ship a usable .git, so it would work locally
 * and silently return the wrong date in production. Bumping this is an editorial
 * act: change it when the page's content actually changed.
 *
 * @type {RouteEntry[]}
 */
export const ROUTES = [
  {
    path: "/",
    title: "Weigh what to build next",
    description:
      "Tarazu turns scattered requests, feedback, and data into ranked, defensible product decisions — then learns from what you ship, so every call gets sharper.",
    socialDescription:
      "Turn scattered signals into ranked, defensible product decisions — and close the loop by learning from what you ship.",
    lastModified: "2026-08-11",
    changeFrequency: "weekly",
    priority: 1.0,
    nav: null,
    schemaType: "WebSite",
    llmsSection: "Product",
  },
  {
    path: "/how-it-works",
    title: "How Tarazu works",
    description:
      "How a Tarazu decision works — listen, score, decide, ship, learn — with the mechanics behind each, from the RICE formula to the quadrant boundaries.",
    socialDescription:
      "Listen, score, decide, ship, learn — and what actually happens at each step, down to the scoring formula and the quadrant boundaries.",
    lastModified: "2026-08-11",
    changeFrequency: "monthly",
    priority: 0.9,
    nav: { group: "Product", label: "How it works", order: 1 },
    schemaType: "WebPage",
    llmsSection: "Product",
  },
  {
    path: "/frameworks/rice",
    title: "RICE scoring: the formula, a worked example, and where it breaks",
    description:
      "How to calculate a RICE score, with a worked example and the arithmetic shown — plus what the formula hides and how it compares to ICE and weighted scoring.",
    socialDescription:
      "The RICE formula, a worked example with the arithmetic shown, and an honest account of where the framework stops helping.",
    lastModified: "2026-08-11",
    changeFrequency: "monthly",
    priority: 0.9,
    nav: { group: "Learn", label: "RICE scoring", order: 1 },
    schemaType: "WebPage",
    llmsSection: "Guides",
  },
];

/** @param {string} path */
export const findRoute = (path) => ROUTES.find((r) => r.path === path) ?? null;

/** @param {string} path */
export const absoluteUrl = (path) => `${SITE_URL}${path}`;

/**
 * Routes grouped for the marketing footer, each group's entries in `order`.
 * @returns {{group: string, entries: RouteEntry[]}[]}
 */
export function navGroups() {
  /** @type {Map<string, RouteEntry[]>} */
  const groups = new Map();
  for (const route of ROUTES) {
    if (!route.nav) continue;
    const existing = groups.get(route.nav.group);
    if (existing) existing.push(route);
    else groups.set(route.nav.group, [route]);
  }
  return [...groups.entries()].map(([group, entries]) => ({
    group,
    entries: entries.sort((a, b) => (a.nav?.order ?? 0) - (b.nav?.order ?? 0)),
  }));
}
