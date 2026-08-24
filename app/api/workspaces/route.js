import { NextResponse } from "next/server";
import { withAuth, getOrgId } from "../../../lib/api-auth";

/**
 * Scope a workspaces query to what this caller may see: their active org's
 * workspaces plus any they own personally from before the shared-workspace
 * migration. Mirrors verifyWorkspaceOwner's dual-path rule for the collection
 * endpoints, which don't go through it.
 *
 * SECURITY: when there is no active org, this falls back to the original
 * user_id-only filter rather than adding an `org_id.eq.null` term. Matching a
 * null org_id would match every workspace that has not been backfilled yet —
 * which today is all of them — and hand one caller the entire table.
 *
 * Interpolating into .or() is safe here specifically because both values are
 * Clerk ids (`org_...` / `user_...`, alphanumeric and underscore only), so
 * neither can carry the commas or parens that would alter the PostgREST filter.
 */
function scopeToCaller(query, userId, orgId) {
  return orgId
    ? query.or(`org_id.eq.${orgId},user_id.eq.${userId}`)
    : query.eq("user_id", userId);
}

// GET /api/workspaces — list workspaces visible to the caller
export async function GET() {
  return withAuth(async (userId, supabase) => {
    const orgId = await getOrgId();
    const { data, error } = await scopeToCaller(
      supabase.from("workspaces").select("id, name, position"),
      userId,
      orgId,
    ).order("position");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  });
}

// POST /api/workspaces — create workspace
export async function POST(request) {
  return withAuth(async (userId, supabase) => {
    const orgId = await getOrgId();
    const { name } = await request.json();
    // Position is picked from the same set the caller can see, so a new
    // workspace lands after the org's existing ones rather than colliding
    // with a position already taken by a teammate's workspace.
    const { data: existing } = await scopeToCaller(
      supabase.from("workspaces").select("position"),
      userId,
      orgId,
    )
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = existing?.[0] ? existing[0].position + 1 : 0;
    const { data, error } = await supabase
      .from("workspaces")
      // org_id is null for a caller with no active org — the personal-workspace
      // case; the personal path in verifyWorkspaceOwner still authorizes them
      // by user_id.
      .insert({ user_id: userId, org_id: orgId, name: name || "My Backlog", position: nextPos })
      .select("id, name, position")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  });
}
