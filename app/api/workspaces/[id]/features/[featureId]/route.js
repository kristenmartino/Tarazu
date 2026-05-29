import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../../lib/api-auth";

// Note: feature updates go through POST /features (upsert), which also records a
// revision. A PATCH handler used to live here but had no caller and bypassed
// revision tracking — it was removed to keep all writes flowing through the
// revision-aware path (GitHub #21).

// DELETE /api/workspaces/[id]/features/[featureId] — delete feature
export async function DELETE(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, featureId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { error } = await supabase
      .from("features")
      .delete()
      .eq("id", featureId)
      .eq("workspace_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}
