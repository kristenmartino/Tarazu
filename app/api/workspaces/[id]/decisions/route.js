import { NextResponse } from "next/server";
import { resolveActor } from "../../../../../lib/revisions";
import { withAuth, verifyWorkspaceOwner } from "../../../../../lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuidOrNull = (v) => (v && UUID_RE.test(v) ? v : null);

export async function GET(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = supabase
      .from("decisions")
      .select("*")
      .eq("workspace_id", id)
      .order("position");

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ decisions: data || [] });
  });
}

export async function POST(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();

    const { data: existing } = await supabase
      .from("decisions")
      .select("position")
      .eq("workspace_id", id)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = existing?.[0] ? existing[0].position + 1 : 0;
    const actor = await resolveActor(userId);

    const { data, error } = await supabase
      .from("decisions")
      .insert({
        workspace_id: id,
        title: body.title,
        chosen_candidate_id: toUuidOrNull(body.chosen_candidate_id),
        chosen_candidate_name: body.chosen_candidate_name || "",
        summary_rationale: body.summary_rationale || "",
        final_rationale: body.final_rationale || "",
        framework_used: body.framework_used || "RICE",
        evidence_count: body.evidence_count || 0,
        owner: body.owner || "",
        status: body.status || "draft",
        recommendation_snapshot: body.recommendation_snapshot || {},
        tradeoffs_considered: body.tradeoffs_considered || "",
        risks_accepted: body.risks_accepted || "",
        expected_outcome: body.expected_outcome || "",
        decision_date: body.decision_date || new Date().toISOString(),
        review_date: body.review_date || null,
        position: nextPos,
        // Who RECORDED this, distinct from `owner` above — that stays free
        // text because the person accountable for an outcome may not have an
        // account here at all.
        created_by: actor.id,
        created_by_name: actor.name,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  });
}
