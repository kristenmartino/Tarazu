import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../../../lib/api-auth";

// GET /api/workspaces/[id]/features/[featureId]/history?page=1&limit=20
export async function GET(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, featureId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify feature belongs to workspace
    const { data: feature } = await supabase
      .from("features")
      .select("id")
      .eq("id", featureId)
      .eq("workspace_id", id)
      .single();
    if (!feature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from("feature_revisions")
      .select("id", { count: "exact", head: true })
      .eq("feature_id", featureId);

    const { data: revisions, error } = await supabase
      .from("feature_revisions")
      .select("id, revision_number, change_type, changed_fields, change_summary, reverted_to_revision, created_at, snapshot_name, snapshot_description, snapshot_reach, snapshot_impact, snapshot_confidence, snapshot_effort, snapshot_owner, snapshot_theme, snapshot_status")
      .eq("feature_id", featureId)
      .order("revision_number", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      revisions: revisions || [],
      total: count || 0,
      page,
      hasMore: offset + limit < (count || 0),
    });
  });
}
