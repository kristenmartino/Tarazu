import { ROUTES, absoluteUrl } from "../lib/routes";

// Driven entirely by lib/routes.js — adding a public page is a row there, never
// an edit here. ROUTES contains only indexable routes by construction; the app
// shell, API routes, and auth flows are excluded (the latter serve noindex).
//
// Two things not worth re-litigating: Google ignores <priority> and <changefreq>
// outright, but they cost nothing and Bing arguably still reads changefreq. And
// generateSitemaps() is for >50,000 URLs — not this.
export default function sitemap() {
  return ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
