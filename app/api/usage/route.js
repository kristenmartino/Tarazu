import { NextResponse } from "next/server";
import { getSupabase } from "../../../lib/supabase";
import { USAGE_EVENTS, USAGE_MODES } from "../../../lib/usage-events";

export async function POST(request) {
  // Reject cross-origin browsers and arbitrary/free-text bodies before DB work.
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (Number(request.headers.get("content-length")) > 200) return new Response(null, { status: 413 });
  const text = await request.text();
  if (text.length > 200) return new Response(null, { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  if (!body || Object.keys(body).sort().join(",") !== "event,mode" || !USAGE_EVENTS.includes(body.event) || !USAGE_MODES.includes(body.mode)) return new Response(null, { status: 400 });
  const db = getSupabase();
  if (!db) return new Response(null, { status: 503 });
  try {
    const { error } = await db.rpc("record_usage_count", { p_event: body.event, p_mode: body.mode }).abortSignal(AbortSignal.timeout(2000));
    return error ? new Response(null, { status: 503 }) : new NextResponse(null, { status: 204 });
  } catch { return new Response(null, { status: 503 }); }
}
