// @ts-check
import { SITE_NAME } from "./site";

/**
 * The generated social card, served by app/opengraph-image.jsx.
 *
 * These values mirror that file's `alt` and `size` exports; metadata.test.js
 * imports both and asserts they still agree, since lib/ importing from app/ at
 * runtime would invert the dependency direction. The URL is relative —
 * metadataBase in app/layout.jsx absolutizes it.
 */
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Tarazu — Weigh what matters. Prioritization your team can defend.",
};

/**
 * Builds a page's Next.js `metadata` export from a lib/routes.js entry, so every
 * page gets a correct title, description, canonical, and social card by
 * construction rather than by copy-paste.
 *
 * Canonicals stay *relative*: app/layout.jsx sets `metadataBase`, which
 * absolutizes them. That also means a preview deploy still emits the production
 * canonical, which is the point of a canonical.
 *
 * og:image is declared explicitly. app/opengraph-image.jsx only auto-populates
 * the segment it lives in — `/` — so nested routes that declare their own
 * `openGraph` block resolved with NO image at all, and every content page would
 * have unfurled blank in Slack, LinkedIn, and X. scripts/check-prerender.mjs
 * asserts the tag is present on every route so this cannot regress.
 *
 * Note we compose the title string here rather than using Next's `title.template`
 * in the root layout: a template would retroactively rewrite the landing's title
 * to "Tarazu — Weigh what to build next · Tarazu" unless that page opted out with
 * `title: { absolute: ... }`. Composing here touches nothing that already works.
 *
 * @param {import("./routes").RouteEntry & {socialDescription?: string}} route
 */
export function pageMetadata(route) {
  if (!route) {
    throw new Error("pageMetadata: unknown route — add it to lib/routes.js first");
  }
  const { path, title, description, socialDescription } = route;
  // The landing is the brand statement ("Tarazu — ..."); every other page is a
  // subject first so it reads well in a SERP and a browser tab ("... · Tarazu").
  const fullTitle = path === "/" ? `${SITE_NAME} — ${title}` : `${title} · ${SITE_NAME}`;
  const social = socialDescription ?? description;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: path,
      // Must be repeated here, not just in the root layout. App Router merges
      // metadata per top-level field, so a page declaring `alternates` REPLACES
      // the layout's entire `alternates` object — declaring only `canonical`
      // here silently dropped the layout's markdown pointer.
      types: { "text/markdown": "/llms.txt" },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: fullTitle,
      description: social,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: social,
      images: [OG_IMAGE],
    },
  };
}

/**
 * The Article variant, for a blog post.
 *
 * `canonical` respects an explicit cross-post canonical when the piece was
 * published elsewhere first — otherwise pointing two live URLs at the same text
 * splits the signal between them.
 *
 * @param {{slug: string, title: string, description: string, publishedAt: string, updatedAt?: string, author: string, canonical?: string}} post
 */
export function postMetadata(post) {
  const fullTitle = `${post.title} · ${SITE_NAME}`;
  const url = `/blog/${post.slug}`;

  return {
    title: fullTitle,
    description: post.description,
    alternates: {
      canonical: post.canonical ?? url,
      types: { "text/markdown": "/llms.txt" },
    },
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: post.description,
      images: [OG_IMAGE],
    },
  };
}
