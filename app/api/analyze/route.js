import { NextResponse } from "next/server";
import { z } from "zod";
import { requestJson, AiError } from "../../../lib/ai";

const MAX_FEATURES = 200;

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

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { features, productContext, feedbackContext } = body;

    if (!Array.isArray(features) || features.length < 2)
      return NextResponse.json({ error: "Minimum 2 features required" }, { status: 400 });
    if (features.length > MAX_FEATURES)
      return NextResponse.json({ error: `Too many features (max ${MAX_FEATURES})` }, { status: 413 });

    const truncate = (s, n = 500) => (s && s.length > n ? s.slice(0, n) + "..." : s || "");
    const contextBlock = productContext?.productSummary ? `
Product Context:
- Product: ${truncate(productContext.productSummary)}
- Target Users: ${truncate(productContext.targetUsers)}
- Strategic Priorities: ${truncate(productContext.strategicPriorities)}

Ground your analysis in this product context. Relate recommendations to the stated strategic priorities and target users.

` : "";

    const calibrationBlock = feedbackContext?.analysisContext ? `
${truncate(feedbackContext.analysisContext, 2000)}

` : "";

    const prompt = `You are a senior product strategist. Analyze this product backlog and provide actionable prioritization insights.
${contextBlock}${calibrationBlock}
Features (sorted by RICE score):
${features.map((f, i) => `${i + 1}. "${truncate(f.name, 200)}" — Reach:${f.reach} Impact:${f.impact} Confidence:${f.confidence} Effort:${f.effort} → RICE:${f.score}
   Description: ${truncate(f.description, 300) || "No description"}`).join("\n")}

Respond ONLY with a JSON object (no markdown, no backticks). Structure:
{
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
      model: process.env.ANTHROPIC_MODEL_ANALYSIS || "claude-opus-4-7",
      maxTokens: 1000,
      prompt,
      schema: AnalysisSchema,
      timeoutMs: 30000,
    });

    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof AiError)
      return NextResponse.json({ error: err.message, category: err.category }, { status: err.status });
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
