import Link from "next/link";
import { MarketingShell } from "../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, CtaBand } from "../../src/components/marketing/blocks";
import { JsonLd } from "../../src/components/JsonLd";
import { graph, blogIndex, breadcrumbs } from "../../lib/schema";
import { pageMetadata } from "../../lib/metadata";
import { findRoute } from "../../lib/routes";
import { allPosts, formatDate } from "../../lib/content/posts";

const route = findRoute("/blog");

export const metadata = pageMetadata(route);

export default function BlogIndexPage() {
  const posts = allPosts();

  return (
    <MarketingShell>
      <JsonLd
        id="ld-blog"
        data={graph(
          blogIndex(route, posts),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Blog", path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="Blog"
        title={<>Notes on <span className="br">product decisions.</span></>}
        lede="Prioritization, estimation, and decision records — the parts of choosing what to build that a framework alone does not cover."
      />

      <Section id="what-this-is">
        <Prose>
          <p>
            Prioritization frameworks are the easy part. RICE fits on one line, and any
            team can learn to compute it in an afternoon. What the framework does not tell
            you is where the numbers come from, which of them you are quietly inventing,
            what to do when two scores land within the error bars of each other, or how to
            make a decision that survives the question &ldquo;why didn&apos;t we build the
            other thing?&rdquo; three months later.
          </p>
          <p>
            That is what gets written about here: estimation, decision records, and the
            judgement that sits around a score rather than inside it. Mostly short, mostly
            opinionated, and grounded in the same model{" "}
            <Link href="/how-it-works">Tarazu itself runs on</Link>. If you want the
            framework mechanics first, start with the{" "}
            <Link href="/frameworks/rice">RICE guide</Link>.
          </p>
        </Prose>
      </Section>

      <Section id="posts" alt>
        {posts.length === 0 ? (
          <Prose>
            <p>Nothing published yet.</p>
          </Prose>
        ) : (
          <div className="post-list">
            {posts.map((post) => (
              <article className="post-card" key={post.slug}>
                <h2>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="post-meta">
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  {" · "}
                  {post.readingMinutes} min read
                  {post.draft ? " · DRAFT" : ""}
                </p>
                <p className="post-excerpt">{post.description}</p>
                <Link className="post-more" href={`/blog/${post.slug}`}>
                  Read <span className="arrow">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </Section>

      <CtaBand
        title={<>Stop relitigating the <span className="br">same decisions.</span></>}
        body="Free, and no account needed — guest mode runs entirely in your browser."
        primaryLabel="Open Tarazu"
        primaryHref="/app"
      />
    </MarketingShell>
  );
}
