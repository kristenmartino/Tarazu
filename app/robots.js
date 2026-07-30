import { SITE_URL } from "../lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind these is indexable content: /app is the authed/guest
        // workspace, /api is JSON, and the Clerk routes are auth flows.
        disallow: ["/app", "/api/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
