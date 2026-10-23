import { NextResponse } from "next/server";
import { withAuth, verifyWorkspaceOwner } from "../../../../../../lib/api-auth";
import { BriefWriteSchema } from "../../../../../../lib/validation-brief";

export async function PATCH(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, briefId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const parsed = BriefWriteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || parsed.data.revision === undefined)
      return NextResponse.json({ error: "Invalid validation brief or revision." }, { status: 400 });
    const { draft, revision } = parsed.data;
    const { data, error } = await supabase.from("validation_briefs")
      .update({ title: draft.ideaName, draft, revision: revision + 1, updated_at: new Date().toISOString() })
      .eq("id", briefId).eq("workspace_id", id).eq("revision", revision)
      .select("*").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not save validation brief." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "This brief changed or is no longer available. Reopen the saved brief before saving again; your edits are still here." }, { status: 409 });
    return NextResponse.json(data);
  });
}
