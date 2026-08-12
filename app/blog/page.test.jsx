import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlogIndexPage, { metadata } from "./page";
import BlogPostPage, { generateStaticParams, generateMetadata } from "./[slug]/page";
import { allPosts } from "../../lib/content/posts";

const posts = allPosts();
const indexHtml = renderToStaticMarkup(<BlogIndexPage />);

// renderToStaticMarkup preserves React's camelCase `dateTime` rather than
// lowercasing it. HTML attribute names are case-insensitive so a browser parses
// it as `datetime` either way — match case-insensitively rather than pinning the
// casing React happens to emit.
const timeTag = (iso) => new RegExp(`<time[^>]*datetime="${iso}"`, "i");

describe("/blog index", () => {
  it("emits exactly one h1", () => {
    expect(indexHtml.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("lists every published post with a link and a date", () => {
    for (const post of posts) {
      expect(indexHtml, `missing link for ${post.slug}`).toContain(`href="/blog/${post.slug}"`);
      expect(indexHtml, `missing date for ${post.slug}`).toMatch(timeTag(post.publishedAt));
    }
  });

  it("declares its own canonical", () => {
    expect(metadata.alternates.canonical).toBe("/blog");
  });

  it("emits a Blog node listing the posts", () => {
    const doc = JSON.parse(
      indexHtml.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]
    );
    const blog = doc["@graph"].find((n) => n["@type"] === "Blog");
    expect(blog.blogPost).toHaveLength(posts.length);
    // Stated in full rather than referenced by @id — the post nodes live on the
    // post pages, so a reference from here would not resolve for a consumer
    // processing this page alone.
    for (const entry of blog.blogPost) {
      expect(entry.url).toMatch(/^https:\/\/tarazu\.app\/blog\//);
      expect(entry.headline).toBeTruthy();
    }
  });
});

describe("/blog/[slug]", () => {
  it("generates a static param for every post", () => {
    expect(generateStaticParams().map((p) => p.slug).sort()).toEqual(
      posts.map((p) => p.slug).sort()
    );
  });

  for (const post of posts) {
    describe(post.slug, () => {
      const html = renderToStaticMarkup(<BlogPostPage params={{ slug: post.slug }} />);

      it("renders the title as the single h1", () => {
        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      });

      it("renders the markdown body as real HTML", () => {
        expect(html).toContain("<h2");
        expect(html).toContain("<p>");
        // Rendered server-side, not injected by hydration.
        expect(html.length).toBeGreaterThan(4000);
      });

      it("shows the date, reading time, and author", () => {
        expect(html).toMatch(timeTag(post.publishedAt));
        expect(html).toContain(`${post.readingMinutes} min read`);
        expect(html).toContain(post.author);
      });

      it("links back to the index", () => {
        expect(html).toContain('href="/blog"');
      });

      it("emits a BlogPosting with a resolvable author reference", () => {
        const doc = JSON.parse(
          html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]
        );
        const node = doc["@graph"].find((n) => n["@type"] === "BlogPosting");
        expect(node.headline).toBe(post.title);
        expect(node.datePublished).toBe(post.publishedAt);
        // Resolves against the site-wide Person declared in app/layout.jsx.
        expect(node.author["@id"]).toBe("https://tarazu.app/#kristen-martino");
      });

      it("builds article metadata from the post", () => {
        const meta = generateMetadata({ params: { slug: post.slug } });
        expect(meta.openGraph.type).toBe("article");
        expect(meta.openGraph.publishedTime).toBe(post.publishedAt);
        expect(meta.alternates.canonical).toBe(`/blog/${post.slug}`);
        expect(meta.openGraph.images).toHaveLength(1);
      });
    });
  }

  it("returns empty metadata for an unknown slug rather than throwing", () => {
    expect(generateMetadata({ params: { slug: "nope" } })).toEqual({});
  });
});
