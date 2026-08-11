import { renderLlmsFullTxt } from "../../lib/content/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderLlmsFullTxt(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
