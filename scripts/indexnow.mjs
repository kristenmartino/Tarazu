#!/usr/bin/env node
/**
 * Pushes the live sitemap's URLs to IndexNow.
 *
 * IndexNow is a push protocol: instead of waiting for a crawler to come back,
 * you tell it what changed. Bing, Yandex, Seznam, and Naver consume it. That
 * matters here beyond ordinary SEO — ChatGPT's search is Bing-backed, so Bing's
 * index is a direct input to whether an assistant can cite Tarazu at all.
 *
 *   npm run submit:indexnow              # submit every URL in the live sitemap
 *   npm run submit:indexnow -- --dry-run # show the payload without sending
 *
 * Run it after a deploy that changes public content. Google ignores IndexNow —
 * use Search Console for that.
 *
 * The key is NOT a secret. IndexNow's whole ownership proof is that the key sits
 * at a publicly fetchable URL on the domain, so it is committed deliberately.
 * Rotating it means replacing the file in public/ — this script derives the key
 * from that filename, so there is exactly one source of truth and nothing to
 * keep in sync.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ENDPOINT = "https://api.indexnow.org/IndexNow";
const PUBLIC_DIR = path.join(process.cwd(), "public");
const dryRun = process.argv.includes("--dry-run");

const die = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

// The key file is named for the key it contains — that IS the protocol.
const keyFiles = readdirSync(PUBLIC_DIR).filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f));
if (keyFiles.length === 0) die(`No IndexNow key file in public/. Expected <key>.txt.`);
if (keyFiles.length > 1) die(`Multiple key files in public/: ${keyFiles.join(", ")}. Keep one.`);

const key = path.basename(keyFiles[0], ".txt");
const contents = readFileSync(path.join(PUBLIC_DIR, keyFiles[0]), "utf8").trim();
if (contents !== key) {
  die(`public/${keyFiles[0]} contains "${contents}" but is named for "${key}". IndexNow returns 403 on a mismatch.`);
}

const sitemapUrl = process.env.SITE_URL
  ? `${process.env.SITE_URL}/sitemap.xml`
  : "https://tarazu.app/sitemap.xml";
const origin = new URL(sitemapUrl).origin;
const host = new URL(sitemapUrl).hostname;
const keyLocation = `${origin}/${key}.txt`;

const fetchText = async (url, what) => {
  const res = await fetch(url).catch((e) => die(`Could not fetch ${what} (${url}): ${e.message}`));
  if (!res.ok) die(`${what} returned ${res.status} (${url}).`);
  return res.text();
};

// Verify the key is actually reachable BEFORE submitting. Otherwise IndexNow
// answers 403 and the reason ("key not found") is easy to misread as a bad key
// rather than an undeployed one.
const hosted = (await fetchText(keyLocation, "the hosted key file")).trim();
if (hosted !== key) {
  die(`${keyLocation} serves "${hosted}", expected "${key}". Has the latest build deployed?`);
}

const sitemap = await fetchText(sitemapUrl, "the sitemap");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) die(`No <loc> entries in ${sitemapUrl}.`);

const payload = { host, key, keyLocation, urlList };

console.log(`IndexNow → ${ENDPOINT}`);
console.log(`  host        ${host}`);
console.log(`  keyLocation ${keyLocation}  (verified reachable)`);
console.log(`  urls        ${urlList.length}`);
for (const u of urlList) console.log(`    ${u}`);

if (dryRun) {
  console.log("\n(dry run — nothing submitted)");
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});

// 200 accepted, 202 accepted pending key validation. Everything else is a real
// failure worth reading: 403 = key not found or not matching, 422 = a URL does
// not belong to `host`, 429 = rate limited.
if (res.status === 200 || res.status === 202) {
  console.log(`\n✓ ${res.status} — ${urlList.length} URLs submitted.`);
  console.log("  Confirm receipt in Bing Webmaster Tools → IndexNow.");
} else {
  const body = await res.text().catch(() => "");
  die(`IndexNow returned ${res.status}. ${body.slice(0, 300)}`);
}
