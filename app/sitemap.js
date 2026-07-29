import { SITE_URL } from "../lib/site";

// The marketing landing is the only indexable route — everything else is the
// app shell, API JSON, or an auth flow. Add entries here as public pages land
// (pricing, changelog, docs).
export default function sitemap() {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
