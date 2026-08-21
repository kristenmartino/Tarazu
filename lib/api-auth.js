// @ts-check
import { NextResponse } from "next/server";
import { getSupabase } from "./supabase";

/**
 * Resolve the authenticated Clerk user id, or null when the request is
 * anonymous or Clerk is not configured at all (guest mode runs without keys,
 * and a bare import throws in that case — hence the swallowed catch).
 * @returns {Promise<string | null>}
 */
export async function getUserId() {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = await auth();
    return result.userId ?? null;
  } catch {
    return null;
  }
}

/** Overridable per-user cap so this can be tuned without a code change once real usage patterns exist. */
const AI_DAILY_QUOTA = Number(process.env.AI_DAILY_QUOTA_PER_USER) || 50;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Run `handler` with the authenticated Clerk user id, gated on both identity
 * and a rolling 24h call quota. Use this for routes that bill an upstream API
 * per call — notably the AI endpoints, which must never serve an anonymous
 * caller *or* an unbounded number of calls from one signed-in caller.
 *
 * This DOES require Supabase, unlike the identity-only version this replaced:
 * the quota has to be checked against a record of actual past calls, and
 * that record has to survive across requests and cold starts. `ai_score_events`
 * / `ai_analysis_events` cannot serve this — both are written client-side, as
 * a secondary feedback-loop step *after* a successful response, not
 * server-side at the moment of the call. A client that never completes that
 * follow-up write would show near-zero usage while making unlimited real
 * calls. `ai_call_log` (migrations/20260820210000_ai_call_quota.sql) is
 * written here, server-side, before the caller ever sees a response.
 *
 * The quota check fails *closed*: if usage can't be verified (Supabase
 * unreachable), the call is refused rather than allowed through unmetered,
 * matching `withAuth`'s existing "Database not configured" behavior in this
 * file. A call is only recorded against quota if it actually completed
 * (status < 400) — a request that errored before reaching Anthropic, or that
 * Anthropic itself rejected, shouldn't cost the caller quota for work that
 * was never done and never billed.
 *
 * The 401 body carries `code: "auth_required"` so the client can tell
 * "you need to sign in" apart from "the AI service failed" and prompt
 * accordingly instead of falling back to demo output. The 429 body carries
 * `code: "quota_exceeded"` for the same reason.
 * @param {string} routeName - identifies the caller in ai_call_log, e.g. "analyze"
 * @param {(userId: string) => (Response | Promise<Response>)} handler
 * @returns {Promise<Response>}
 */
export async function withUser(routeName, handler) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to use AI features.", code: "auth_required" },
      { status: 401 },
    );
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const since = new Date(Date.now() - ONE_DAY_MS).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_call_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (countError) {
    return NextResponse.json({ error: "Could not verify usage. Please try again." }, { status: 500 });
  }
  if ((count ?? 0) >= AI_DAILY_QUOTA) {
    return NextResponse.json(
      {
        error: `Daily AI limit reached (${AI_DAILY_QUOTA} calls/day). Try again tomorrow.`,
        code: "quota_exceeded",
      },
      { status: 429 },
    );
  }

  const result = await handler(userId);
  if (result.status < 400) {
    await supabase.from("ai_call_log").insert({ user_id: userId, route: routeName });
  }
  return result;
}

/**
 * Run `handler` with the authenticated Clerk user id and a Supabase client.
 * Returns 401 if unauthenticated, 500 if the database is not configured.
 * @param {(userId: string, supabase: import("@supabase/supabase-js").SupabaseClient) => (Response | Promise<Response>)} handler
 * @returns {Promise<Response>}
 */
export async function withAuth(handler) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  return handler(userId, supabase);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function verifyWorkspaceOwner(supabase, workspaceId, userId) {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .single();
  return !!data;
}
