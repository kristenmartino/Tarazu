import { z } from "zod";
import { scoringSettingsSchema } from "./scoring-basis-validation";
import { dateOnly } from "../src/dateOnly";

export const NextTestSchema = z.object({
  hypothesis: z.string().max(2000).optional(),
  method: z.string().max(2000).optional(),
  participants: z.string().max(1000).optional(),
  decisionRule: z.string().max(2000).optional(),
  owner: z.string().max(200).optional(),
  reviewDate: z.string().max(10).refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && dateOnly(value) === value), "Choose a valid calendar date.").optional(),
}).strict();

const text = z.string().max(20000);
const rating = z.number().int().min(1).max(5).nullable();
export const BriefDraftSchema = z.object({
  mode: z.enum(["candidate", "manual"]),
  candidateId: z.string().max(100),
  ideaName: z.string().trim().min(1).max(500),
  ideaDesc: text,
  manualName: text,
  manualDesc: text,
  assumptions: z.object(Object.fromEntries(
    ["problem", "audience", "workaround", "willingness", "differentiation", "feasibility"].map(k => [k, text.optional()])
  )).strict(),
  scores: z.object(Object.fromEntries(
    ["problemSeverity", "evidenceStrength", "marketPull", "differentiation", "monetizationClarity", "buildFeasibility", "strategicFit"].map(k => [k, rating])
  )).strict(),
  evidenceReviewed: z.boolean(),
  attachedSignals: z.array(z.object({
    id: z.string().min(1).max(100), title: text, body: text, source: text, confidence_impact: text,
  }).strict()).max(200),
  productContext: z.object({ ...Object.fromEntries(
    ["productSummary", "targetUsers", "strategicPriorities", "constraints", "assumptions", "successMetrics"].map(k => [k, text])
  ), scoring: scoringSettingsSchema.strict().optional() }).strict(),
  nextTest: NextTestSchema.optional(),
  risks: text,
  nextActions: text,
}).strict();

export const BriefWriteSchema = z.object({
  draft: BriefDraftSchema,
  revision: z.number().int().min(1).optional(),
}).strict();

export function signalSnapshot(signal) {
  return Object.fromEntries(["id", "title", "body", "source", "confidence_impact"].map(k => [k, signal[k] || ""]));
}

// PostgreSQL jsonb does not preserve object key order. Compare content rather
// than transport ordering when deciding whether a saved brief has changed.
export function briefFingerprint(value) {
  const canonical = item => Array.isArray(item) ? item.map(canonical)
    : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().map(k => [k, canonical(item[k])])) : item;
  // New optional blank fields must not manufacture a legacy edit. This is
  // comparison-only: raw historical drafts are never rewritten.
  const meaningful = item => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).map(([key, val]) => [key, meaningful(val)]).filter(([, val]) => val !== undefined))
    : typeof item === "string" && !item.trim() ? undefined : item;
  const draft = value && typeof value === "object" && !Array.isArray(value) ? { ...value } : value;
  if (draft && typeof draft === "object") {
    if (draft.nextTest) { const plan = meaningful(draft.nextTest); if (Object.keys(plan).length) draft.nextTest = plan; else delete draft.nextTest; }
    if (draft.productContext?.scoring) {
      const scoring = meaningful(draft.productContext.scoring);
      for (const key of ["impactBands", "effortBands"]) if (scoring[key] && !Object.keys(scoring[key]).length) delete scoring[key];
      draft.productContext = { ...draft.productContext };
      if (Object.keys(scoring).length) draft.productContext.scoring = scoring; else delete draft.productContext.scoring;
    }
  }
  return JSON.stringify(canonical(draft));
}

// Guest writes fail visibly, including quota/storage failures. Never display
// "Saved" after a swallowed localStorage exception.
export function loadLocalBriefs(workspaceId) {
  const raw = localStorage.getItem(`prioritize-ws-${workspaceId}-briefs`);
  if (!raw) return [];
  const records = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error("Saved briefs could not be read.");
  for (const record of records) {
    BriefDraftSchema.parse(record.draft);
    if (record.workspace_id !== workspaceId) throw new Error("Brief workspace does not match.");
  }
  return records;
}

export function saveLocalBrief(workspaceId, draft, previous = null) {
  const clean = BriefDraftSchema.parse(draft);
  const records = loadLocalBriefs(workspaceId);
  const existing = previous ? records.find(b => b.id === previous.id) : null;
  if (previous && (!existing || existing.revision !== previous.revision))
    throw new Error("This brief changed in another tab. Reopen the saved brief before saving again; your edits are still here.");
  const now = new Date().toISOString();
  const record = {
    id: existing?.id || crypto.randomUUID(), workspace_id: workspaceId,
    title: clean.ideaName, draft: clean, revision: (existing?.revision || 0) + 1,
    created_at: existing?.created_at || now, updated_at: now,
  };
  const updated = [record, ...records.filter(b => b.id !== record.id)];
  localStorage.setItem(`prioritize-ws-${workspaceId}-briefs`, JSON.stringify(updated));
  return record;
}
