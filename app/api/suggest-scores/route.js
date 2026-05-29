import { NextResponse } from "next/server";
import { z } from "zod";
import { requestJson, AiError } from "../../../lib/ai";

const VALID_DIMS = ["reach", "impact", "confidence", "effort"];

const DimResult = z.object({
  score: z.number(),
  justification: z.string().optional(),
});

function buildSchema(dims) {
  return z.object(Object.fromEntries(dims.map((d) => [d, DimResult]))).passthrough();
}

export async function POST(request) {
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

    const truncate = (s, n = 500) => (s && s.length > n ? s.slice(0, n) + "..." : s || "");
    const contextBlock = productContext?.productSummary ? `
Product Context:
- Product: ${truncate(productContext.productSummary)}
- Target Users: ${truncate(productContext.targetUsers)}
- Strategic Priorities: ${truncate(productContext.strategicPriorities)}

` : "";

    const calibrationBlock = feedbackContext?.scoreCalibration ? `
${truncate(feedbackContext.scoreCalibration, 2000)}

` : "";

    const prompt = `You are a senior product strategist scoring a feature using the RICE framework. Each dimension is scored 1-100.

${contextBlock}${calibrationBlock}Feature to score:
Name: "${truncate(featureName, 200)}"
Description: "${truncate(featureDescription, 500) || "No description provided"}"

Score these dimensions: ${dims.join(", ")}

Guidelines:
- Reach: How many users will this affect in a given time period? (1=very few, 100=nearly all users)
- Impact: How much will this move the needle for each user reached? (1=minimal, 100=transformative)
- Confidence: How sure are you about reach and impact estimates? (1=pure guess, 100=data-backed)
- Effort: How much work is this? (1=trivial, 100=massive multi-quarter project)

Respond ONLY with a JSON object (no markdown, no backticks):
{${dims.map((d) => `\n  "${d}": { "score": <number 1-100>, "justification": "one-line reason" }`).join(",")}
}`;

    const result = await requestJson({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL_SUGGESTIONS || "claude-sonnet-4-6",
      maxTokens: 600,
      prompt,
      schema: buildSchema(dims),
      timeoutMs: 20000,
    });

    // Clamp scores to 1-100
    for (const dim of dims) {
      if (result[dim]) {
        result[dim].score = Math.max(1, Math.min(100, Math.round(result[dim].score)));
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiError)
      return NextResponse.json({ error: err.message, category: err.category }, { status: err.status });
    console.error("Suggest-scores error:", err);
    return NextResponse.json({ error: "Score suggestion failed" }, { status: 500 });
  }
}
