import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../../../lib/api-auth";
import { createRevision, resolveActor } from "../../../../../../../lib/revisions";

const TRACKED_FIELDS = ["name", "description", "reach", "impact", "confidence", "effort", "owner", "theme", "status"];

// POST /api/workspaces/[id]/features/[featureId]/revert
// Body: { revision_number: 3 }
export async function POST(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, featureId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { revision_number } = await request.json();
    if (!revision_number || typeof revision_number !== "number")
      return NextResponse.json({ error: "revision_number required" }, { status: 400 });

    // Get the target revision's snapshot
    const { data: targetRev } = await supabase
      .from("feature_revisions")
      .select("*")
      .eq("feature_id", featureId)
      .eq("revision_number", revision_number)
      .single();
    if (!targetRev)
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });

    // Get current feature state
    const { data: current } = await supabase
      .from("features")
      .select("name, description, reach, impact, confidence, effort, owner, theme, status")
      .eq("id", featureId)
      .eq("workspace_id", id)
      .single();
    if (!current)
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    const restored = {
      name: targetRev.snapshot_name,
      description: targetRev.snapshot_description,
      reach: targetRev.snapshot_reach,
      impact: targetRev.snapshot_impact,
      confidence: targetRev.snapshot_confidence,
      effort: targetRev.snapshot_effort,
      // Revisions created before snapshot_owner/theme/status existed store NULL;
      // reverting to them restores these fields to null, which is accurate.
      owner: targetRev.snapshot_owner ?? null,
      theme: targetRev.snapshot_theme ?? null,
      status: targetRev.snapshot_status ?? null,
    };

    // Compute diff between current and restored
    const changedFields = [];
    for (const field of TRACKED_FIELDS) {
      const oldVal = typeof current[field] === "string" ? (current[field] || "") : current[field];
      const newVal = typeof restored[field] === "string" ? (restored[field] || "") : restored[field];
      if (oldVal !== newVal) {
        changedFields.push({ field, old: oldVal, new: newVal });
      }
    }

    if (changedFields.length === 0) {
      return NextResponse.json({ message: "Already at this revision state", id: featureId });
    }

    // Apply the revert
    const { error: updateError } = await supabase
      .from("features")
      .update(restored)
      .eq("id", featureId)
      .eq("workspace_id", id);
    if (updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Shared writer — see lib/revisions.js. This was a hand-rolled copy of
    // createRevision that had already drifted: it lacked the retry on unique
    // collision, so two concurrent reverts could race on revision_number and
    // one would silently fail to record.
    const newRevisionNumber = await createRevision(supabase, {
      featureId,
      workspaceId: id,
      snapshot: restored,
      changeType: "reverted",
      changedFields,
      revertedTo: revision_number,
      actor: await resolveActor(userId),
    });

    return NextResponse.json({
      id: featureId,
      revision_number: newRevisionNumber,
      ...restored,
    });
  });
}
