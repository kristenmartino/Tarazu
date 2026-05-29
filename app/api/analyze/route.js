import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const { features, productContext, feedbackContext } = await request.json();
    if (!features || features.length < 2)
      return NextResponse.json({ error: "Minimum 2 features required" }, { status: 400 });

    const truncate = (s, n = 500) => s && s.length > n ? s.slice(0, n) + "..." : s || "";
    const contextBlock = productContext?.productSummary ? `
Product Context:
- Product: ${truncate(productContext.productSummary)}
- Target Users: ${truncate(productContext.targetUsers)}
- Strategic Priorities: ${truncate(productContext.strategicPriorities)}

Ground your analysis in this product context. Relate recommendations to the stated strategic priorities and target users.

` : "";

    const calibrationBlock = feedbackContext?.analysisContext ? `
${feedbackContext.analysisContext}

` : "";

    const prompt = `You are a senior product strategist. Analyze this product backlog and provide actionable prioritization insights.
${contextBlock}${calibrationBlock}
Features (sorted by RICE score):
${features.map((f, i) => `${i + 1}. "${f.name}" — Reach:${f.reach} Impact:${f.impact} Confidence:${f.confidence} Effort:${f.effort} → RICE:${f.score}
   Description: ${f.description || "No description"}`).join("\n")}

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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL_ANALYSIS || "claude-opus-4-7",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
