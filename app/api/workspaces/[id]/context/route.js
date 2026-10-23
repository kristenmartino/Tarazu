import { scoringSettingsSchema } from "../../../../../lib/scoring-basis-validation";
import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../lib/api-auth";

// GET /api/workspaces/[id]/context
export async function GET(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data, error } = await supabase
      .from("workspaces")
      .select("product_summary, target_users, strategic_priorities, constraints, assumptions, success_metrics, scoring_settings")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      productSummary: data.product_summary || "",
      targetUsers: data.target_users || "",
      strategicPriorities: data.strategic_priorities || "",
      constraints: data.constraints || "",
      assumptions: data.assumptions || "",
      successMetrics: data.success_metrics || "",
      scoring: data.scoring_settings || {},
    });
  });
}

// PUT /api/workspaces/[id]/context
export async function PUT(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json();
    const { productSummary, targetUsers, strategicPriorities, constraints, assumptions, successMetrics } = body;
    const scoring = scoringSettingsSchema.safeParse(body.scoring);
    if (body.scoring !== undefined && !scoring.success)
      return NextResponse.json({ error: "Invalid shared scoring basis" }, { status: 400 });
    const { error } = await supabase
      .from("workspaces")
      .update({
        product_summary: productSummary || "",
        target_users: targetUsers || "",
        strategic_priorities: strategicPriorities || "",
        constraints: constraints || "",
        assumptions: assumptions || "",
        success_metrics: successMetrics || "",
        ...(body.scoring !== undefined ? { scoring_settings: scoring.data } : {}),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}
