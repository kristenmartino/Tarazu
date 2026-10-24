import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../../lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuidOrNull = (v) => (v && UUID_RE.test(v) ? v : null);

export async function GET(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, decisionId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("decisions")
      .select("*")
      .eq("id", decisionId)
      .eq("workspace_id", id)
      .single();
    if (error || !data)
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    const reviews = await supabase.from('decision_reviews').select('*').eq('workspace_id', id).eq('decision_id', decisionId).order('reviewed_at');
    if (reviews.error) return NextResponse.json({ error: 'Decision reviews could not be loaded.' }, { status: 500 });
    return NextResponse.json({ ...data, reviews: reviews.data || [] });
  });
}

export async function PATCH(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, decisionId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates = await request.json();
    const allowed = [
      "title", "chosen_candidate_id", "chosen_candidate_name",
      "summary_rationale", "final_rationale", "framework_used",
      "evidence_count", "owner", "status", "recommendation_snapshot",
      "tradeoffs_considered", "risks_accepted", "expected_outcome",
      "decision_date", "review_date",
    ];
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    );
    if ("chosen_candidate_id" in clean) {
      clean.chosen_candidate_id = toUuidOrNull(clean.chosen_candidate_id);
    }
    clean.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("decisions")
      .update(clean)
      .eq("id", decisionId)
      .eq("workspace_id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  });
}

export async function DELETE(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, decisionId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error } = await supabase
      .from("decisions")
      .delete()
      .eq("id", decisionId)
      .eq("workspace_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}
