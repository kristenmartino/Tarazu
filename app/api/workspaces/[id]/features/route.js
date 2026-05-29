import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../lib/api-auth";

const TRACKED_FIELDS = ["name", "description", "reach", "impact", "confidence", "effort", "owner", "theme", "status"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateChangeSummary(changedFields) {
  if (changedFields.length === 0) return "";
  const parts = changedFields.map(({ field, old: oldVal, new: newVal }) => {
    if (field === "name") return `Renamed "${oldVal}" to "${newVal}"`;
    if (field === "description") {
      if (!oldVal && newVal) return "Added description";
      if (oldVal && !newVal) return "Removed description";
      return "Updated description";
    }
    return `${field.charAt(0).toUpperCase() + field.slice(1)} ${oldVal} \u2192 ${newVal}`;
  });
  return parts.join(", ");
}

async function createRevision(supabase, { featureId, workspaceId, snapshot, changeType, changedFields, revertedTo }) {
  const { data: lastRev } = await supabase
    .from("feature_revisions")
    .select("revision_number")
    .eq("feature_id", featureId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .single();
  const nextRevNum = (lastRev?.revision_number ?? 0) + 1;
  const summary = changeType === "created"
    ? "Created feature"
    : changeType === "reverted"
      ? `Reverted to revision #${revertedTo}`
      : generateChangeSummary(changedFields);

  // Retry on unique constraint collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from("feature_revisions").insert({
      feature_id: featureId,
      workspace_id: workspaceId,
      revision_number: nextRevNum + attempt,
      snapshot_name: snapshot.name,
      snapshot_description: snapshot.description || "",
      snapshot_reach: snapshot.reach,
      snapshot_impact: snapshot.impact,
      snapshot_confidence: snapshot.confidence,
      snapshot_effort: snapshot.effort,
      snapshot_owner: snapshot.owner ?? null,
      snapshot_theme: snapshot.theme ?? null,
      snapshot_status: snapshot.status ?? null,
      change_type: changeType,
      changed_fields: changedFields || [],
      change_summary: summary,
      reverted_to_revision: revertedTo || null,
    });
    if (!error) return;
    if (error.code !== "23505") break; // only retry on unique violation
  }
}

// GET /api/workspaces/[id]/features — list features
export async function GET(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data, error } = await supabase
      .from("features")
      .select("*")
      .eq("workspace_id", id)
      .order("position");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const features = (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      reach: r.reach,
      impact: r.impact,
      confidence: r.confidence,
      effort: r.effort,
      owner: r.owner || null,
      theme: r.theme || null,
      status: r.status || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    const manualOrder = (data || []).map((r) => r.id);
    return NextResponse.json({ features, manualOrder });
  });
}

// POST /api/workspaces/[id]/features — create or upsert a feature
export async function POST(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const feature = await request.json();
    const { data: existing } = await supabase
      .from("features")
      .select("position")
      .eq("workspace_id", id)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = existing?.[0] ? existing[0].position + 1 : 0;

    if (feature.id && UUID_RE.test(feature.id)) {
      // Upsert: select full row to detect changes (only for valid UUIDs)
      const { data: found } = await supabase
        .from("features")
        .select("id, name, description, reach, impact, confidence, effort, owner, theme, status")
        .eq("id", feature.id)
        .eq("workspace_id", id)
        .single();
      if (found) {
        const incoming = {
          name: feature.name,
          description: feature.description || "",
          reach: feature.reach,
          impact: feature.impact,
          confidence: feature.confidence,
          effort: feature.effort,
          owner: feature.owner || null,
          theme: feature.theme || null,
          status: feature.status || null,
        };

        // Diff detection — only create revision if something changed
        const changedFields = [];
        for (const field of TRACKED_FIELDS) {
          const oldVal = typeof found[field] === "string" ? (found[field] || "") : found[field];
          const newVal = typeof incoming[field] === "string" ? (incoming[field] || "") : incoming[field];
          if (oldVal !== newVal) {
            changedFields.push({ field, old: oldVal, new: newVal });
          }
        }

        if (changedFields.length > 0) {
          await createRevision(supabase, {
            featureId: feature.id,
            workspaceId: id,
            snapshot: incoming,
            changeType: "updated",
            changedFields,
          });
        }

        const { error } = await supabase
          .from("features")
          .update(incoming)
          .eq("id", feature.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ id: feature.id });
      }
    }

    // Insert new
    const { data, error } = await supabase
      .from("features")
      .insert({
        workspace_id: id,
        name: feature.name,
        description: feature.description || "",
        reach: feature.reach ?? 50,
        impact: feature.impact ?? 50,
        confidence: feature.confidence ?? 50,
        effort: feature.effort ?? 50,
        owner: feature.owner || null,
        theme: feature.theme || null,
        status: feature.status || null,
        position: nextPos,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create revision #1
    await createRevision(supabase, {
      featureId: data.id,
      workspaceId: id,
      snapshot: {
        name: feature.name,
        description: feature.description || "",
        reach: feature.reach ?? 50,
        impact: feature.impact ?? 50,
        confidence: feature.confidence ?? 50,
        effort: feature.effort ?? 50,
        owner: feature.owner || null,
        theme: feature.theme || null,
        status: feature.status || null,
      },
      changeType: "created",
      changedFields: [],
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
  });
}

// PUT /api/workspaces/[id]/features — bulk update positions (manual order)
export async function PUT(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds))
      return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
    const updates = orderedIds.map((featureId, i) =>
      supabase.from("features").update({ position: i }).eq("id", featureId).eq("workspace_id", id)
    );
    await Promise.all(updates);
    return NextResponse.json({ ok: true });
  });
}
