// @ts-check
import { SITE_URL, SITE_NAME } from "./site";

// Stable @id anchors. Nodes reference each other by @id rather than by nesting,
// so the site-wide graph in app/layout.jsx can declare Organization / WebSite /
// Person once and a page-level graph can point at them with a two-token
// reference. A future Article emits only itself plus {"@id": ORG_ID} as its
// publisher, instead of restating the whole organisation on every post.
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const PERSON_ID = `${SITE_URL}/#kristen-martino`;
export const APP_ID = `${SITE_URL}/#webapplication`;

const GITHUB_URL = "https://github.com/kristenmartino/Tarazu";
const LINKEDIN_URL = "https://linkedin.com/in/kristenmartino";

/**
 * The author, for E-E-A-T. `url` points at /about, which is the page that
 * resolves this entity — it was omitted until that page existed, because schema
 * pointing at a 404 is worse than schema that stays quiet. sameAs carries only
 * URLs the site itself already links.
 */
export function person() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Kristen Martino",
    url: `${SITE_URL}/about`,
    jobTitle: "AI-Native Product Manager",
    knowsAbout: [
      "Product management",
      "Product prioritization",
      "RICE scoring",
      "Decision intelligence",
      "AI-native product development",
    ],
    sameAs: [LINKEDIN_URL, GITHUB_URL],
  };
}

/** `logo` is omitted until the icon assets land — see lib/schema.test.js. */
export function organization() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: "Decision intelligence for product teams.",
    founder: { "@id": PERSON_ID },
    sameAs: [GITHUB_URL],
  };
}

export function website() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en-US",
    publisher: { "@id": ORG_ID },
  };
}

// Deliberately NOT modelled here:
//
// - aggregateRating / review. There are no real ratings, and self-serving review
//   markup is an explicit Google structured-data violation with manual-action
//   risk. schema.test.js asserts neither key can appear.
// - potentialAction: SearchAction (the sitelinks searchbox). There is no /search
//   route, and Google deprecated the feature — markup pointing at a 404 is a lie
//   for zero upside.
export function webApplication() {
  return {
    "@type": "WebApplication",
    "@id": APP_ID,
    name: SITE_NAME,
    alternateName: "Tarazu — Decision Intelligence for Product Teams",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Product Management",
    operatingSystem: "Any (modern web browser)",
    browserRequirements: "Requires JavaScript. Chrome, Safari, Firefox, or Edge.",
    softwareVersion: "2.0",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    description:
      "Tarazu ranks product candidates with normalized RICE scoring, plots the effort-versus-impact tradeoff, and produces explainable AI recommendations — then records the rationale behind each decision.",
    featureList: [
      "Normalized RICE scoring on a 1-100 scale",
      "Effort x Impact tradeoff map with labeled quadrants",
      "AI backlog analysis with stated reasoning",
      "AI-suggested scores grounded in product context",
      "Decision rationale and history",
      "Guest mode with no account required",
    ],
    author: { "@id": PERSON_ID },
    publisher: { "@id": ORG_ID },
  };
}

/**
 * A content page. Points isPartOf at the WebSite node the root layout declares,
 * so the page is attached to the site entity rather than floating free.
 * @param {import("./routes").RouteEntry} route
 */
export function webPage(route) {
  return {
    "@type": route.schemaType,
    "@id": `${SITE_URL}${route.path}#webpage`,
    url: `${SITE_URL}${route.path}`,
    name: route.title,
    description: route.description,
    inLanguage: "en-US",
    isPartOf: { "@id": SITE_ID },
    about: { "@id": APP_ID },
    dateModified: route.lastModified,
  };
}

/**
 * The FAQ page node: a webPage() carrying its questions.
 *
 * FAQPage is a subtype of WebPage, so this is ONE node rather than a WebPage
 * plus a separate FAQPage — emitting both would put two differently-@id'd
 * FAQPage nodes in the same graph describing the same URL. Callers pass this
 * *instead of* webPage(), not alongside it.
 *
 * Expect no visible rich result: Google restricted FAQ rich results to
 * government and health sites in 2023. This is here for LLM and AI Overview
 * extraction, which is a different pipeline. The corollary is a hard rule —
 * every question passed here MUST be rendered visibly on the page emitting it,
 * or the markup is a structured-data violation. /faq renders this same array.
 *
 * @param {import("./routes").RouteEntry} route
 * @param {import("./content/product").Faq[]} faqs
 */
export function faqPage(route, faqs) {
  return {
    ...webPage(route),
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * A blog post. `author` and `publisher` reference the site-wide Person and
 * Organization nodes rather than restating them, which is the whole reason
 * /about exists — an author reference has to resolve to an entity the site
 * actually introduces.
 * @param {{slug: string, title: string, description: string, publishedAt: string, updatedAt?: string, tags: string[]}} post
 */
export function article(post) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@type": "BlogPosting",
    // The article IS the page node here; there is no separate WebPage to point
    // mainEntityOfPage at, and referencing one that is never declared would
    // leave a dangling @id.
    "@id": `${url}#article`,
    url,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: "en-US",
    author: { "@id": PERSON_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": SITE_ID },
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
  };
}

/**
 * The blog index as a Blog node listing its posts.
 * @param {import("./routes").RouteEntry} route
 * @param {{slug: string, title: string, publishedAt: string}[]} posts
 */
export function blogIndex(route, posts) {
  return {
    ...webPage(route),
    "@type": "Blog",
    // Each entry is stated in full rather than referenced by @id. The post nodes
    // are declared on the post pages, so an @id reference from here would be
    // unresolvable for a consumer processing this page alone.
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      url: `${SITE_URL}/blog/${post.slug}`,
      headline: post.title,
      datePublished: post.publishedAt,
      author: { "@id": PERSON_ID },
    })),
  };
}

/**
 * BreadcrumbList for a nested page. Google renders these in the SERP, and they
 * give an LLM the page's place in the site rather than an orphan URL.
 * @param {{name: string, path: string}[]} items
 */
export function breadcrumbs(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Composes nodes into a single @graph document. One <script> per page.
 * @param {...(object|null|undefined|false)} nodes
 */
export function graph(...nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

/**
 * JSON-LD is embedded in a <script> element, so the only real escape hazard is a
 * literal "</script" (or "<!--") appearing inside a string value and closing the
 * element early. Escaping every "<" as < kills both and is still valid JSON,
 * which is what the browser parses this as. U+2028/2029 need no special handling
 * here precisely because this is parsed as JSON, not as JavaScript source.
 * @param {unknown} data
 */
export function serialize(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
