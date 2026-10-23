import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../lib/api-auth";
import { BriefWriteSchema } from "../../../../../lib/validation-brief";

export async function GET(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data, error } = await supabase.from("validation_briefs").select("*")
      .eq("workspace_id", id).order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load validation briefs." }, { status: 500 });
    return NextResponse.json({ briefs: data || [] });
  });
}

export async function POST(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const parsed = BriefWriteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || parsed.data.revision !== undefined)
      return NextResponse.json({ error: "Invalid validation brief." }, { status: 400 });
    const { draft } = parsed.data;
    const { data, error } = await supabase.from("validation_briefs")
      .insert({ workspace_id: id, title: draft.ideaName, draft, created_by: userId })
      .select("*").single();
    if (error) return NextResponse.json({ error: "Could not save validation brief." }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  });
}
