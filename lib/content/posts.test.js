import { describe, it, expect } from "vitest";
import {
  parsePost,
  readingMinutes,
  assertNoRawScript,
  renderMarkdown,
  formatDate,
  allPosts,
  getPost,
} from "./posts";

const frontmatter = (over = {}) =>
  JSON.stringify({
    title: "A title",
    description: "x".repeat(80),
    publishedAt: "2026-08-12",
    ...over,
  });

const file = (over, body = "Body copy.") => `---\n${frontmatter(over)}\n---\n${body}`;

describe("parsePost", () => {
  it("parses frontmatter and body", () => {
    const post = parsePost(file({}, "Hello."), "slug-a");
    expect(post.slug).toBe("slug-a");
    expect(post.title).toBe("A title");
    expect(post.body.trim()).toBe("Hello.");
  });

  it("applies defaults for the optional fields", () => {
    const post = parsePost(file(), "s");
    expect(post.tags).toEqual([]);
    expect(post.draft).toBe(false);
    expect(post.author).toBe("Kristen Martino");
  });

  it("throws when the frontmatter fence is missing", () => {
    expect(() => parsePost("no fence here", "s")).toThrow(/missing JSON frontmatter/);
  });

  it("names the file and the JSON error when frontmatter is malformed", () => {
    expect(() => parsePost("---\n{ nope }\n---\nbody", "broken")).toThrow(/broken: frontmatter is not valid JSON/);
  });

  it("handles CRLF line endings", () => {
    const post = parsePost(`---\r\n${frontmatter()}\r\n---\r\nBody.`, "s");
    expect(post.title).toBe("A title");
  });

  // Each of these is a real way a post ships broken if unvalidated.
  it("rejects a description outside the SERP-safe window", () => {
    expect(() => parsePost(file({ description: "too short" }), "s")).toThrow(/description/);
    expect(() => parsePost(file({ description: "x".repeat(161) }), "s")).toThrow(/description/);
  });

  it("accepts the exact boundaries of that window", () => {
    expect(() => parsePost(file({ description: "x".repeat(50) }), "s")).not.toThrow();
    expect(() => parsePost(file({ description: "x".repeat(160) }), "s")).not.toThrow();
  });

  it("rejects a date that is not ISO", () => {
    expect(() => parsePost(file({ publishedAt: "Aug 2026" }), "s")).toThrow(/publishedAt/);
    expect(() => parsePost(file({ publishedAt: "2026-8-1" }), "s")).toThrow(/publishedAt/);
  });

  it("rejects an unknown key rather than ignoring it", () => {
    // .strict() — otherwise `descrption` silently means "no description".
    expect(() => parsePost(file({ descrption: "typo" }), "s")).toThrow();
  });

  it("rejects more than five tags", () => {
    expect(() => parsePost(file({ tags: ["a", "b", "c", "d", "e", "f"] }), "s")).toThrow(/tags/);
  });

  it("rejects a title longer than a SERP will show", () => {
    expect(() => parsePost(file({ title: "x".repeat(81) }), "s")).toThrow(/title/);
  });
});

describe("readingMinutes", () => {
  // Mutation-critical: the 220 divisor and the Math.max(1, …) floor are exactly
  // what Stryker flips.
  it("divides by 220 words per minute", () => {
    expect(readingMinutes("word ".repeat(220))).toBe(1);
    expect(readingMinutes("word ".repeat(660))).toBe(3);
    expect(readingMinutes("word ".repeat(1100))).toBe(5);
  });

  it("never returns zero", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("one two three")).toBe(1);
  });

  it("ignores extra whitespace", () => {
    expect(readingMinutes("  a \n\n b   c  ")).toBe(1);
  });
});

describe("assertNoRawScript", () => {
  it("throws on embedded executable markup", () => {
    for (const tag of ["<script>", "<SCRIPT ", "< script", "<iframe ", "<object", "<embed"]) {
      expect(() => assertNoRawScript(`before ${tag} after`, "s"), tag).toThrow(/not allowed/);
    }
  });

  it("allows ordinary inline HTML", () => {
    expect(() => assertNoRawScript("<strong>bold</strong> and <em>italic</em>", "s")).not.toThrow();
  });
});

describe("renderMarkdown", () => {
  it("renders headings, links, and GFM tables", () => {
    expect(renderMarkdown("## Heading")).toContain("<h2");
    expect(renderMarkdown("[x](/y)")).toContain('href="/y"');
    expect(renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |")).toContain("<table>");
  });
});

describe("formatDate", () => {
  it("formats an ISO date without timezone drift", () => {
    // A naive new Date("2026-01-01") in a negative-offset zone renders as 31 Dec.
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
    expect(formatDate("2026-08-12")).toBe("12 August 2026");
  });
});

// The real content on disk has to satisfy every rule above, not just fixtures.
describe("the published posts", () => {
  const posts = allPosts();

  it("loads and parses every file in content/blog", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it("gives every post a unique slug", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("sorts newest first, with a deterministic tiebreak", () => {
    const keys = posts.map((p) => `${p.publishedAt}|${p.slug}`);
    const expected = [...keys].sort((a, b) => {
      const [da, sa] = a.split("|");
      const [db, sb] = b.split("|");
      return db.localeCompare(da) || sa.localeCompare(sb);
    });
    expect(keys).toEqual(expected);
  });

  it("never publishes a future-dated post", () => {
    for (const post of posts) {
      expect(new Date(post.publishedAt).getTime(), post.slug).toBeLessThanOrEqual(Date.now());
    }
  });

  it("gives each post enough body to be worth indexing", () => {
    for (const post of posts) {
      expect(post.body.length, post.slug).toBeGreaterThan(1500);
    }
  });

  it("finds a post by slug and returns null otherwise", () => {
    expect(getPost(posts[0].slug)?.slug).toBe(posts[0].slug);
    expect(getPost("does-not-exist")).toBeNull();
  });
});
