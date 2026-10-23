import { NextResponse } from "next/server";
import { z } from "zod";
import { buildScoringContext, contextReferences, CONTEXT_RULES } from "../../../lib/scoring-context";
import { requestJson, AiError } from "../../../lib/ai";
import { withUser } from "../../../lib/api-auth";
import { withAppOwnedAssessments } from "../../../lib/ai-assessment-guard";

const VALID_DIMS = ["reach", "impact", "confidence", "effort"];

// Four grounded assessments can exceed 20 seconds. Allow one schema-repair
// attempt within the function budget rather than timing out a valid response.
export const maxDuration = 180;

function buildSchema(dims, refs) {
  const dimension = z.object({
    score: z.number().int().min(1).max(100).nullable(),
    justification: z.string().min(1).max(1000),
    evidence: z.array(z.string()).max(20).refine(values => values.every(v => refs.includes(v)), "Unknown evidence reference"),
    assumptions: z.array(z.string().max(500)).max(8),
    gaps: z.array(z.string().max(500)).max(8),
    nextAction: z.string().min(1).max(500),
  });
  return withAppOwnedAssessments(z.object(Object.fromEntries(dims.map(d => [d, dimension]))));
}

// Authenticated: this endpoint bills the Anthropic API per call, so it must
// never run for an anonymous caller or an unbounded number of times per caller.
export async function POST(request) {
  return withUser("suggest-scores", () => handlePost(request));
}

async function handlePost(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { featureName, featureDescription, productContext, dimensions, feedbackContext } = body;

    if (!featureName || typeof featureName !== "string")
      return NextResponse.json({ error: "Feature name required" }, { status: 400 });

    const requested = Array.isArray(dimensions) && dimensions.length > 0 ? dimensions : VALID_DIMS;
    const dims = requested.filter((d) => VALID_DIMS.includes(d));
    if (dims.length === 0)
      return NextResponse.json({ error: "No valid dimensions requested" }, { status: 400 });

    const context = buildScoringContext(body);
    const refs = contextReferences(context);
    const prompt = `You are assessing a candidate using RICE on relative integer scales 1–100.
${CONTEXT_RULES}
Reach = affected audience in a stated timeframe; impact = benefit per reached user; effort = estimated work (higher means more work).
For any dimension that cannot reasonably be estimated, return score:null and explain the insufficient information. Never replace unknowns with default scores. State assumptions explicitly. Confidence is evidence strength, not certainty of your answer.
Respond ONLY with JSON with these keys: ${dims.join(', ')}.
Each value must have {"score": number or null, "justification": "concise rationale", "evidence": ["supplied reference ID"], "assumptions": ["explicit assumption"], "gaps": ["missing information"], "nextAction": "next validation question or action"}.
Keep the complete response compact: each justification at most two sentences and 60 words; at most three assumptions and three gaps per dimension, each at most 15 words; nextAction at most 25 words. Cite up to five most relevant references per dimension. Copy complete allowed reference IDs verbatim into evidence arrays; never abbreviate them. In prose use supplied source titles rather than opaque ID fragments. Discuss conflicting evidence without repeating entire source notes.
Allowed references: ${JSON.stringify(refs)}
Supplied context JSON:
${JSON.stringify(context)}`;

    const result = await requestJson({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL_SUGGESTIONS || "claude-sonnet-4-6",
      maxTokens: 2400,
      prompt,
      schema: buildSchema(dims, refs),
      timeoutMs: 60000,
    });

    result.context = context;
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiError)
      return NextResponse.json({ error: err.message, category: err.category }, { status: err.status });
    console.error("Suggest-scores error:", err);
    return NextResponse.json({ error: "Score suggestion failed" }, { status: 500 });
  }
}
