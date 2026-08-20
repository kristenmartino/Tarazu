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

/**
 * Run `handler` with the authenticated Clerk user id, with no database
 * required. Use this for routes that need only identity — notably the AI
 * endpoints, which bill an upstream API per call and so must never serve an
 * anonymous caller. `withAuth` would 500 those routes with "Database not
 * configured" whenever Supabase is absent, which is wrong: they never touch it.
 *
 * The 401 body carries `code: "auth_required"` so the client can tell
 * "you need to sign in" apart from "the AI service failed" and prompt
 * accordingly instead of falling back to demo output.
 * @param {(userId: string) => (Response | Promise<Response>)} handler
 * @returns {Promise<Response>}
 */
export async function withUser(handler) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to use AI features.", code: "auth_required" },
      { status: 401 },
    );
  }
  return handler(userId);
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
