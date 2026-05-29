// @ts-check
import { NextResponse } from "next/server";
import { getSupabase } from "./supabase";

/**
 * Run `handler` with the authenticated Clerk user id and a Supabase client.
 * Returns 401 if unauthenticated, 500 if the database is not configured.
 * @param {(userId: string, supabase: import("@supabase/supabase-js").SupabaseClient) => (Response | Promise<Response>)} handler
 * @returns {Promise<Response>}
 */
export async function withAuth(handler) {
  let userId = null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = await auth();
    userId = result.userId;
  } catch {}
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
