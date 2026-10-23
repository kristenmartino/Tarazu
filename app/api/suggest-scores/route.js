import { SCORING_RULES } from "../../../lib/scoring-basis";
import { NextResponse } from "next/server";
import { buildScoringContext, contextReferences, CONTEXT_RULES } from "../../../lib/scoring-context";
import { requestJson, AiError } from "../../../lib/ai";
import { withUser } from "../../../lib/api-auth";
import { scoringResponseSchema } from "../../../lib/scoring-review-validation";
import { candidateBasisSchema } from "../../../lib/scoring-basis-validation";

const VALID_DIMS = ["reach", "impact", "confidence", "effort"];

// Four grounded assessments can exceed 20 seconds. Allow one schema-repair
// attempt within the function budget rather than timing out a valid response.
export const maxDuration = 180;

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
    if (body.scoringBasis !== undefined && !candidateBasisSchema.safeParse(body.scoringBasis).success)
      return NextResponse.json({ error: "Invalid scoring basis" }, { status: 400 });

    const requested = Array.isArray(dimensions) && dimensions.length > 0 ? dimensions : VALID_DIMS;
    const dims = requested.filter((d) => VALID_DIMS.includes(d));
    if (dims.length === 0)
      return NextResponse.json({ error: "No valid dimensions requested" }, { status: 400 });

    const context = buildScoringContext(body);
    const refs = contextReferences(context);
    const prompt = `You are assessing a candidate using RICE on relative integer scales 1–100.
${CONTEXT_RULES}
${SCORING_RULES}
Reach = affected audience in a stated timeframe; impact = benefit per reached user; effort = estimated work (higher means more work).
For any dimension that cannot reasonably be estimated, return score:null and explain the insufficient information. Never replace unknowns with default scores. State assumptions explicitly. Confidence is evidence strength, not certainty of your answer.
Respond ONLY with JSON with these keys: ${dims.join(', ')}.
Each value must have {"score": number or null, "justification": "concise rationale", "evidence": ["supplied reference ID"], "assumptions": ["explicit assumption"], "gaps": ["missing information"], "nextAction": "next validation question or action"}.
Also include "claimReviews": [{"claimId":"exact supplied claim ID","status":"supported|conflicting|source_missing|assumption|needs_review","explanation":"why the source does or does not support this specific claim","evidence":["signal:ID"]}] and "followUp": null or {"question":"one targeted question","whyItChangesScore":"how a plausible answer could change the scoring band","claimIds":["relevant supplied claim ID"]}.
Review each target claim for the requested input exactly once. For confidence review confidence, reach and impact claims. Other inputs review their own claims. With no relevant claims return claimReviews:[]. Never review competing candidates' claims here. Reviews cite only supplied Signal references. Use supported only when an attached supporting source substantiates this specific claim; its excerpt must match or be absent. Estimates remain estimates even when supported. AI assumptions always have status assumption. Unclassified claims need review. Missing sources and mismatched excerpts cannot prove support; explain the limitation. Use conflicting when supplied evidence contradicts the claim. A user label is not verification.
Ask a follow-up whenever missing context could plausibly change a band, and always for score:null. Ask about a concrete missing denominator, baseline, causal benefit, source/date/sample/segment, delivery scope, or dependency. Explain the effect on the band without invented outcomes or exact probabilities. Do not repeat an answered question unless you identify a remaining ambiguity. Return followUp:null if no material score-changing gap remains. Keep each review to 30 words and the question plus explanation to 65 words. A follow-up can have claimIds:[] when it concerns missing shared context.
Keep the complete response compact: each justification at most two sentences and 60 words; at most three assumptions and three gaps per dimension, each at most 15 words; nextAction at most 25 words. Cite up to five most relevant references per dimension. Copy complete allowed reference IDs verbatim into evidence arrays; never abbreviate them. In prose use supplied source titles rather than opaque ID fragments. Discuss conflicting evidence without repeating entire source notes.
Allowed references: ${JSON.stringify(refs)}
Supplied context JSON:
${JSON.stringify(context)}`;

    const result = await requestJson({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL_SUGGESTIONS || "claude-sonnet-4-6",
      maxTokens: 4000,
      prompt,
      schema: scoringResponseSchema(dims, refs, context),
      timeoutMs: 75000,
      onAttempt: event => console.info("Scoring AI attempt", JSON.stringify(event)),
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
