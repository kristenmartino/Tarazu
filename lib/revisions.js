// @ts-check
//
// Shared revision writer. This lived as a module-private function inside
// app/api/workspaces/[id]/features/route.js while a second, hand-rolled copy
// of the same insert sat in features/[featureId]/revert/route.js. The copies
// had already drifted: the inline one never gained the retry-on-unique-
// collision that this one has, so two concurrent reverts could race on
// revision_number and one would silently fail to record. Consolidating fixes
// that drift and gives attribution a single place to be written rather than
// three.

/**
 * Human-readable summary of what changed, e.g. `Effort 30 → 55`.
 * @param {{field: string, old: any, new: any}[]} changedFields
 * @returns {string}
 */
export function generateChangeSummary(changedFields) {
  if (changedFields.length === 0) return "";
  const parts = changedFields.map(({ field, old: oldVal, new: newVal }) => {
    if (field === "name") return `Renamed "${oldVal}" to "${newVal}"`;
    if (field === "description") {
      if (!oldVal && newVal) return "Added description";
      if (oldVal && !newVal) return "Removed description";
      return "Updated description";
    }
    return `${field.charAt(0).toUpperCase() + field.slice(1)} ${oldVal} → ${newVal}`;
  });
  return parts.join(", ");
}

/**
 * Resolve who is acting, for attribution. Returns the Clerk user id plus a
 * display name captured now — see migration #0007 for why the name is stored
 * rather than resolved at read time.
 *
 * Callers resolve this ONCE per request and pass the result into every
 * createRevision call, because a bulk feature sync writes one revision per
 * changed feature and this would otherwise be one Clerk round trip each.
 *
 * Fails soft: attribution is metadata on a record, so a Clerk outage must not
 * block the write it describes. A null name renders as unattributed, which is
 * the same state every pre-migration row is already in.
 *
 * @param {string} userId
 * @returns {Promise<{id: string, name: string | null}>}
 */
export async function resolveActor(userId) {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = typeof clerkClient === "function" ? await clerkClient() : clerkClient;
    const user = await client.users.getUser(userId);
    const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const name =
      full ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      null;
    return { id: userId, name: name || null };
  } catch {
    return { id: userId, name: null };
  }
}

/**
 * Append a revision for a feature.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   featureId: string,
 *   workspaceId: string,
 *   snapshot: Record<string, any>,
 *   changeType: "created" | "updated" | "reverted",
 *   changedFields?: {field: string, old: any, new: any}[],
 *   revertedTo?: number | null,
 *   actor?: {id: string, name: string | null} | null,
 * }} args
 * @returns {Promise<number | null>} the revision number written, or null if it
 *   could not be recorded. The revert route echoes this back to the client, so
 *   it has to come from the writer rather than being recomputed by the caller —
 *   the retry loop below may land on a different number than first attempted.
 */
export async function createRevision(
  supabase,
  { featureId, workspaceId, snapshot, changeType, changedFields, revertedTo, actor },
) {
  const { data: lastRev } = await supabase
    .from("feature_revisions")
    .select("revision_number")
    .eq("feature_id", featureId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .single();
  const nextRevNum = (lastRev?.revision_number ?? 0) + 1;
  const summary =
    changeType === "created"
      ? "Created feature"
      : changeType === "reverted"
        ? `Reverted to revision #${revertedTo}`
        : generateChangeSummary(changedFields || []);

  // Retry on unique constraint collision (idx_revisions_feature_number).
  for (let attempt = 0; attempt < 3; attempt++) {
    const revisionNumber = nextRevNum + attempt;
    const { error } = await supabase.from("feature_revisions").insert({
      feature_id: featureId,
      workspace_id: workspaceId,
      revision_number: revisionNumber,
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
      created_by: actor?.id ?? null,
      created_by_name: actor?.name ?? null,
    });
    if (!error) return revisionNumber;
    if (error.code !== "23505") break; // only retry on unique violation
  }
  return null;
}
