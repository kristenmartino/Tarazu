import { NextResponse } from "next/server";
import { z } from "zod";
import { buildScoringContext, contextReferences, CONTEXT_RULES } from "../../../lib/scoring-context";
import { requestJson, AiError } from "../../../lib/ai";
import { withUser } from "../../../lib/api-auth";
import { withAppOwnedAssessments } from "../../../lib/ai-assessment-guard";

const MAX_FEATURES = 200;
export const maxDuration = 180;

const Confidence = z.enum(["high", "medium", "low"]);
const Pick = z.object({
  name: z.string(),
  reason: z.string(),
  confidence: Confidence.optional(),
});
const AnalysisSchema = z.object({
  summary: z.string(),
  topPick: Pick,
  riskFlag: Pick,
  quickWin: Pick,
  sprintPlan: z.array(z.string()),
  insight: z.string(),
});

// Authenticated: this endpoint bills the Anthropic API per call, so it must
// never run for an anonymous caller or an unbounded number of times per caller.
export async function POST(request) {
  return withUser("analyze", () => handlePost(request));
}

async function handlePost(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { features, productContext, feedbackContext } = body;

    if (!Array.isArray(features) || features.length < 2)
      return NextResponse.json({ error: "Minimum 2 features required" }, { status: 400 });
    if (features.length > MAX_FEATURES)
      return NextResponse.json({ error: `Too many features (max ${MAX_FEATURES})` }, { status: 413 });

    const context = buildScoringContext(body);
    const prompt = `You are a product strategist assessing competing options.
${CONTEXT_RULES}
Use the supplied shared rubric and candidate scoring answers to explain gaps and tradeoffs. Existing scores may predate the rubric; do not assume they were calibrated or silently rescore them.
Explain strategy and constraint fit, assumptions, gaps, and next validation action in your reasons. Do not infer evidence strength from existing scores. Use low confidence where linked evidence is absent. Sprint plan is only a proposed sequence.
Keep the response compact: summary at most 60 words, each pick reason at most 45 words, insight at most 45 words. Cite at most five references, copying their complete allowed IDs only into the evidence array. Use source titles in prose. Copy candidate names exactly in picks and sprintPlan. Do not repeat whole source notes.
Allowed references: ${JSON.stringify(contextReferences(context))}
Supplied context JSON:
${JSON.stringify(context)}

Respond ONLY with a JSON object (no markdown, no backticks). Structure:
{
  "evidence": ["supplied reference IDs used in this analysis"],
  "summary": "2-sentence executive summary of the backlog health",
  "topPick": { "name": "feature name", "reason": "1-sentence why to build first", "confidence": "high" | "medium" | "low" },
  "riskFlag": { "name": "feature name", "reason": "1-sentence risk concern", "confidence": "high" | "medium" | "low" },
  "quickWin": { "name": "feature name", "reason": "1-sentence why this is a quick win", "confidence": "high" | "medium" | "low" },
  "sprintPlan": ["feature 1 name", "feature 2 name", "feature 3 name"],
  "insight": "1 non-obvious strategic observation about this backlog"
}

For confidence: "high" means strong data supports this pick, "medium" means reasonable but debatable, "low" means weak evidence or uncertain.`;

    const analysis = await requestJson({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL_ANALYSIS || "claude-opus-4-8",
      maxTokens: 2400,
      prompt,
      schema: withAppOwnedAssessments(AnalysisSchema.extend({ evidence: z.array(z.string()).max(30).refine(refs => refs.every(ref => contextReferences(context).includes(ref)), "Unknown evidence reference") }), context.candidates.map(candidate => candidate.name)),
      timeoutMs: 60000,
      onAttempt: event => console.info("Advisor AI attempt", JSON.stringify(event)),
    });

    return NextResponse.json({ ...analysis, context });
  } catch (err) {
    if (err instanceof AiError) {
      console.warn("Advisor AI failed", JSON.stringify({ category: err.category, status: err.status }));
      return NextResponse.json({ error: err.message, category: err.category }, { status: err.status });
    }
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
