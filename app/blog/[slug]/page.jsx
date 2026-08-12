import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "../../../src/components/marketing/MarketingShell";
import { Section, CtaBand } from "../../../src/components/marketing/blocks";
import { JsonLd } from "../../../src/components/JsonLd";
import { graph, article, breadcrumbs } from "../../../lib/schema";
import { postMetadata } from "../../../lib/metadata";
import { allPosts, getPost, renderMarkdown, formatDate } from "../../../lib/content/posts";

// An unknown slug 404s statically instead of being rendered on demand, so the
// route stays fully prerendered and scripts/check-prerender.mjs can assert it.
export const dynamicParams = false;

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }) {
  const post = getPost(params.slug);
  return post ? postMetadata(post) : {};
}

// Synchronous, like every other content page: a sync component can be rendered
// directly in vitest with renderToStaticMarkup, which is what proves the prose
// is in the HTML rather than injected by hydration.
export default function BlogPostPage({ params }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <MarketingShell>
      <JsonLd
        id="ld-post"
        data={graph(
          article(post),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ])
        )}
      />

      <Section id="post">
        <article className="post">
          <p className="post-kicker">
            <Link href="/blog">← Blog</Link>
          </p>
          <h1>{post.title}</h1>
          <p className="post-meta">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            {" · "}
            {post.readingMinutes} min read
            {" · "}
            {post.author}
          </p>
          {/* Content is first-party and PR-reviewed, and assertNoRawScript fails
              the build on a script/iframe/object/embed tag in any post body. */}
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
          />
        </article>
      </Section>

      <CtaBand
        title={<>Weigh what to <span className="br">build next.</span></>}
        body="Free, and no account needed — guest mode runs entirely in your browser."
        primaryLabel="Open Tarazu"
        primaryHref="/app"
      />
    </MarketingShell>
  );
}
