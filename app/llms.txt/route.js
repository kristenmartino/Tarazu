import { renderLlmsTxt } from "../../lib/content/llms";

// A route segment containing a dot is valid and resolves to /llms.txt.
// force-static prerenders it at build time so it is served from the CDN like any
// other static asset.
export const dynamic = "force-static";

export function GET() {
  return new Response(renderLlmsTxt(), {
    // Mandatory: nothing infers a content type for a route handler, and without
    // this the body would be served as the default and could be MIME-sniffed.
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
