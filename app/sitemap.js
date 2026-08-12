import { ROUTES, absoluteUrl } from "../lib/routes";
import { allPosts } from "../lib/content/posts";

// Driven entirely by lib/routes.js — adding a public page is a row there, never
// an edit here. ROUTES contains only indexable routes by construction; the app
// shell, API routes, and auth flows are excluded (the latter serve noindex).
//
// Two things not worth re-litigating: Google ignores <priority> and <changefreq>
// outright, but they cost nothing and Bing arguably still reads changefreq. And
// generateSitemaps() is for >50,000 URLs — not this.
export default function sitemap() {
  const pages = ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Posts come from the filesystem, not the registry — adding a .md file is all
  // it takes for one to appear here. A cross-posted piece whose canonical points
  // elsewhere is excluded: advertising a URL we have told Google not to index is
  // a contradiction.
  const posts = allPosts()
    .filter((post) => !post.canonical)
    .map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: "yearly",
      priority: 0.6,
    }));

  return [...pages, ...posts];
}
