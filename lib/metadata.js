// @ts-check
import { SITE_NAME } from "./site";

/**
 * Builds a page's Next.js `metadata` export from a lib/routes.js entry, so every
 * page gets a correct title, description, canonical, and social card by
 * construction rather than by copy-paste.
 *
 * Canonicals stay *relative*: app/layout.jsx sets `metadataBase`, which
 * absolutizes them. That also means a preview deploy still emits the production
 * canonical, which is the point of a canonical.
 *
 * og:image is deliberately absent. app/opengraph-image.jsx sits at the `app/`
 * segment root, so every nested route inherits it automatically — declaring
 * `openGraph` without `images` does not clear that inheritance.
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
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: social,
    },
  };
}
