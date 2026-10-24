import { NextResponse } from 'next/server';
import { withAuth, verifyWorkspaceOwner } from '../../../../../../../lib/api-auth';
import { resolveActor } from '../../../../../../../lib/revisions';
import { makeDecisionReview, validateReview } from '../../../../../../../lib/decision-record';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reviews append to a separate record. The decision's original fields and
// originating validation-brief snapshot are never updated by this endpoint.
export async function POST(request, { params }) {
  return withAuth(async (userId, supabase) => {
    const { id, decisionId } = await params;
    if (!(await verifyWorkspaceOwner(supabase, id, userId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let input;
    try { input = validateReview(await request.json()); }
    catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (input.signal_ids.some(signalId => !UUID_RE.test(signalId))) return NextResponse.json({ error: 'Choose valid evidence sources.' }, { status: 400 });

    const { data: decision, error: decisionError } = await supabase.from('decisions').select('*').eq('id', decisionId).eq('workspace_id', id).single();
    if (decisionError || !decision) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    let signals = [];
    if (input.signal_ids.length) {
      const result = await supabase.from('signals').select('*').eq('workspace_id', id).in('id', input.signal_ids);
      if (result.error) return NextResponse.json({ error: 'Evidence could not be loaded. Try again.' }, { status: 500 });
      signals = result.data || [];
    }
    const actor = await resolveActor(userId);
    let review;
    try { review = makeDecisionReview(decision, input, signals, { reviewed_by_name: actor.name }); }
    catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    const { data, error } = await supabase.from('decision_reviews').insert({ ...review, workspace_id: id, decision_id: decisionId, reviewed_by: actor.id }).select('*').single();
    if (error) return NextResponse.json({ error: 'Review could not be saved. Your original decision is unchanged.' }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  });
}
