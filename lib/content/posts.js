// @ts-check
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { marked } from "marked";

/**
 * Blog post loading: markdown files with a JSON frontmatter block.
 *
 * JSON rather than YAML, which is why there is no gray-matter dependency. YAML
 * fails *quietly* on ambiguous scalars — an unquoted 2026-08-12 becomes a Date,
 * `yes` becomes a boolean, and a stray colon silently restructures the document.
 * JSON.parse fails loudly with a position, and hands zod a real object.
 *
 * Everything here except the two fs entry points is a pure function over a
 * string, which is what makes it worth mutation-testing.
 */

export const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export const PostFrontmatter = z
  .object({
    title: z.string().min(1).max(80),
    // 50–160 makes a bad meta description fail the build instead of shipping
    // truncated mid-sentence in the SERP. Same bound as lib/routes.js.
    description: z.string().min(50).max(160),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tags: z.array(z.string()).max(5).default([]),
    draft: z.boolean().default(false),
    author: z.string().default("Kristen Martino"),
    // For a cross-post: point the canonical at wherever it was published first.
    canonical: z.string().url().optional(),
  })
  // .strict() so a typo'd key fails the build rather than being silently ignored
  // — `descrption` would otherwise just mean "no description".
  .strict();

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * marked passes raw HTML through by default. Post content is first-party and
 * PR-reviewed, so rendering it with dangerouslySetInnerHTML is acceptable — but
 * this turns that assumption into a build-time assertion rather than a comment
 * nobody reads.
 * @param {string} body @param {string} slug
 */
export function assertNoRawScript(body, slug) {
  if (/<\s*(script|iframe|object|embed)\b/i.test(body)) {
    throw new Error(`${slug}: raw script/iframe/object/embed in markdown is not allowed`);
  }
}

/**
 * 220 words per minute, floored at 1 so a short post never reads "0 min".
 * @param {string} body
 */
export function readingMinutes(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Parses one markdown file into a post. Pure — exported for tests.
 * @param {string} raw @param {string} slug
 */
export function parsePost(raw, slug) {
  const match = FENCE.exec(raw);
  if (!match) throw new Error(`${slug}: missing JSON frontmatter block`);

  let json;
  try {
    json = JSON.parse(match[1]);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`${slug}: frontmatter is not valid JSON — ${reason}`);
  }

  const result = PostFrontmatter.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`${slug}: invalid frontmatter — ${issues}`);
  }

  const body = raw.slice(match[0].length);
  assertNoRawScript(body, slug);

  return { slug, ...result.data, body, readingMinutes: readingMinutes(body) };
}

/** @param {string} body */
export function renderMarkdown(body) {
  return marked.parse(body, { gfm: true, breaks: false, async: false });
}

/**
 * All publishable posts, newest first.
 *
 * Deliberately not memoised: this reads a handful of small files at build time
 * and a stale module-level cache is a worse problem than re-reading them.
 * Drafts are visible in development and excluded from production builds.
 */
export function allPosts() {
  const files = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))
    : [];

  return files
    .map((file) =>
      parsePost(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"), file.replace(/\.md$/, ""))
    )
    .filter((post) => !post.draft || process.env.NODE_ENV !== "production")
    .sort(
      (a, b) =>
        // Ties are real on a launch day, so break them deterministically —
        // otherwise the index order shifts between builds.
        b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug)
    );
}

/** @param {string} slug */
export function getPost(slug) {
  return allPosts().find((post) => post.slug === slug) ?? null;
}

/**
 * ISO date → "12 August 2026". Parsed as UTC on purpose: `new Date("2026-01-01")`
 * in a negative-offset zone renders as 31 December.
 * @param {string} iso
 */
export function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
