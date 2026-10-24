// @ts-check
import { NextResponse } from "next/server";
import { getSupabase } from "./supabase";
import { runMeteredAi } from "./ai-usage";

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
 * Resolve the caller's ACTIVE Clerk Organization id, or null when there is no
 * active org (Clerk only populates `orgId` once a session has an organization
 * selected — a user who belongs to one but has never activated it via the
 * OrganizationSwitcher still reads as null here), or when Clerk is not
 * configured at all. Mirrors getUserId()'s swallowed catch for guest mode.
 * @returns {Promise<string | null>}
 */
export async function getOrgId() {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = await auth();
    return result.orgId ?? null;
  } catch {
    return null;
  }
}

/**
 * Authenticate and atomically reserve shared AI usage before any handler work.
 * Missing usage controls fail closed; see ai-usage.js and the SQL migration.
 * @param {string} routeName
 * @param {(userId: string) => (Response | Promise<Response>)} handler
 * @returns {Promise<Response>}
 */
export async function withUser(routeName, handler) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to use AI features.", code: "auth_required" }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  return runMeteredAi({ userId, routeName, supabase, handler });
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
 * Authorize the caller for one workspace. This is the authentication boundary
 * for every route under app/api/workspaces/[id]/* — ~31 call sites all gate on
 * it — so it deliberately resolves the active org itself rather than taking one
 * as a parameter. Threading a 4th argument through 31 call sites invites
 * exactly one to be missed, and a missed site would silently pass `undefined`.
 *
 * Access is granted by EITHER of two independent paths:
 *
 *   - org path:      the caller's active org matches the workspace's org_id
 *   - personal path: the caller owns the workspace and no org is involved
 *
 * BOTH PATHS ARE PERMANENT. An earlier version of this comment called the
 * second one a "legacy path" and said to delete it once every workspace had
 * been backfilled with an org_id. That was wrong, and acting on it would break
 * the product: there were never any rows to backfill (the production database
 * was empty when orgs shipped), so this branch is not migration debt. It is how
 * personal workspaces work at all. Clerk's Personal Account mode is an ongoing
 * state — a user outside an org has orgId null and creates workspaces with
 * org_id null — so removing this branch would permanently lock every such user
 * out of their own data rather than clean up history. Whether to require org
 * membership instead is a product decision, tracked as open question 5 in
 * docs/VISION.md; until that changes, keep both.
 *
 * SECURITY — why each comparison is guarded on a truthy id first: the original
 * implementation filtered by user_id in SQL, so it could only ever return the
 * caller's own row. Matching two different columns means fetching the row
 * first and comparing in JS, which introduces a null-equality trap. A caller
 * with no active org has orgId === null, and every personal workspace has
 * org_id === null, so a bare `data.org_id === orgId` would be
 * `null === null` → true, granting EVERY user access to EVERY workspace. The
 * `orgId &&` / `userId &&` guards are what make that unreachable, and there
 * are tests pinning exactly this case.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function verifyWorkspaceOwner(supabase, workspaceId, userId) {
  const orgId = await getOrgId();
  const { data } = await supabase
    .from("workspaces")
    .select("id, user_id, org_id")
    .eq("id", workspaceId)
    .single();
  if (!data) return false;
  if (orgId && data.org_id === orgId) return true;
  if (userId && data.user_id === userId) return true;
  return false;
}
