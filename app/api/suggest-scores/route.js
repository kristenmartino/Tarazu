import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const { featureName, featureDescription, productContext, dimensions, feedbackContext } = await request.json();
    if (!featureName) return NextResponse.json({ error: "Feature name required" }, { status: 400 });

    const dims = dimensions && dimensions.length > 0 ? dimensions : ["reach", "impact", "confidence", "effort"];
    const truncate = (s, n = 500) => s && s.length > n ? s.slice(0, n) + "..." : s || "";

    const contextBlock = productContext?.productSummary ? `
Product Context:
- Product: ${truncate(productContext.productSummary)}
- Target Users: ${truncate(productContext.targetUsers)}
- Strategic Priorities: ${truncate(productContext.strategicPriorities)}

` : "";

    const calibrationBlock = feedbackContext?.scoreCalibration ? `
${feedbackContext.scoreCalibration}

` : "";

    const prompt = `You are a senior product strategist scoring a feature using the RICE framework. Each dimension is scored 1-100.

${contextBlock}${calibrationBlock}Feature to score:
Name: "${featureName}"
Description: "${featureDescription || "No description provided"}"

Score these dimensions: ${dims.join(", ")}

Guidelines:
- Reach: How many users will this affect in a given time period? (1=very few, 100=nearly all users)
- Impact: How much will this move the needle for each user reached? (1=minimal, 100=transformative)
- Confidence: How sure are you about reach and impact estimates? (1=pure guess, 100=data-backed)
- Effort: How much work is this? (1=trivial, 100=massive multi-quarter project)

Respond ONLY with a JSON object (no markdown, no backticks):
{${dims.map(d => `\n  "${d}": { "score": <number 1-100>, "justification": "one-line reason" }`).join(",")}
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL_SUGGESTIONS || "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    // Clamp scores to 1-100
    for (const dim of dims) {
      if (result[dim]) {
        result[dim].score = Math.max(1, Math.min(100, Math.round(result[dim].score)));
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Suggest-scores error:", err);
    return NextResponse.json({ error: "Score suggestion failed" }, { status: 500 });
  }
}
