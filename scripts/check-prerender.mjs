#!/usr/bin/env node
/**
 * Asserts every URL advertised in the sitemap was actually prerendered to static
 * HTML, and that the HTML contains what a crawler needs.
 *
 * Runs after `next build` in CI, in the same spirit as check-bundle-secrets.mjs:
 * a build-output assertion, because the failure it catches only exists in the
 * output. If someone adds a hook, a cookies() call, or a client-only import to a
 * content page, Next quietly serves it dynamically instead — the page still works
 * in a browser, and a crawler that does not run JavaScript sees an empty shell.
 * The missing .html file is the signal.
 *
 * Routes are read from the generated sitemap rather than imported from
 * lib/routes.js, for two reasons: bare Node's ESM resolver requires file
 * extensions that this codebase's imports do not use, and more usefully, it makes
 * this a check that the sitemap and the build output agree — a sitemap entry with
 * no prerendered page is a 404 advertised to Google.
 *
 *   npm run check:prerender
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_OUT = path.join(ROOT, ".next", "server", "app");
const SITEMAP = path.join(APP_OUT, "sitemap.xml.body");

// Text-only routes, prerendered to .body rather than .html.
const TEXT_ROUTES = ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt"];

const failures = [];
const fail = (msg) => failures.push(msg);

if (!existsSync(APP_OUT)) {
  console.error("✗ No build output at .next/server/app — run `npm run build` first.");
  process.exit(1);
}
if (!existsSync(SITEMAP)) {
  console.error("✗ No sitemap in the build output — cannot determine the public routes.");
  process.exit(1);
}

const locs = [...readFileSync(SITEMAP, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length === 0) {
  console.error("✗ The sitemap contains no <loc> entries.");
  process.exit(1);
}

const origin = new URL(locs[0]).origin;

for (const loc of locs) {
  const pathname = new URL(loc).pathname;
  const rel = pathname === "/" ? "index.html" : `${pathname.replace(/^\/|\/$/g, "")}.html`;
  const file = path.join(APP_OUT, rel);

  if (!existsSync(file)) {
    fail(
      `${pathname} is in the sitemap but was not prerendered (expected .next/server/app/${rel}). ` +
        `Either the page is now dynamic — check for a hook, cookies(), or a client-only import — ` +
        `or lib/routes.js lists a page that does not exist.`
    );
    continue;
  }

  const html = readFileSync(file, "utf8");

  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) fail(`${pathname} has ${h1s.length} <h1> elements, expected exactly 1.`);

  const expected = pathname === "/" ? origin : `${origin}${pathname}`;
  if (!html.includes(`<link rel="canonical" href="${expected}"/>`)) {
    fail(`${pathname} is missing its canonical link (expected href="${expected}").`);
  }

  if (!html.includes('type="application/ld+json"')) fail(`${pathname} has no JSON-LD.`);
  if (!html.includes('property="og:image"')) fail(`${pathname} has no og:image.`);

  // Strip the way a text-extracting crawler would, and require real prose rather
  // than an empty shell that merely happens to exist.
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 1500) {
    fail(`${pathname} yielded only ${text.length} chars of extractable text (expected ≥ 1500).`);
  }
}

for (const name of TEXT_ROUTES) {
  const file = path.join(APP_OUT, `${name}.body`);
  if (!existsSync(file)) fail(`/${name} was not prerendered (expected ${name}.body).`);
  else if (readFileSync(file, "utf8").trim().length === 0) fail(`/${name} is empty.`);
}

if (failures.length) {
  console.error("✗ Prerender check failed:\n");
  for (const f of failures) console.error(`  • ${f}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ ${locs.length} sitemap routes prerendered with a canonical, one h1, JSON-LD, og:image, and real text ` +
    `(+ ${TEXT_ROUTES.length} text routes).`
);
