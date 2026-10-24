import { getSupabase } from "./supabase";

// Standard direct Anthropic API pricing checked 2026-10-24:
// https://platform.claude.com/docs/en/about-claude/pricing
// Use DOUBLE the listed input/output rates as headroom, then reserve the
// UTF-8 byte length + 4096 overhead as an intentionally high token estimate.
// No tools, images, thinking, caching or priority/fast service is enabled.
const PRICES = { "claude-opus-4-8": [10, 50], "claude-sonnet-4-6": [6, 30] };
export function spendEnvelope(model, messages, maxTokens) {
  const rates = Object.hasOwn(PRICES, model) ? PRICES[model] : null;
  if (!rates || !Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 16000) throw new Error("Unreviewed AI configuration");
  const bytes = Buffer.byteLength(JSON.stringify(messages), "utf8");
  if (bytes > 150000) throw new Error("AI context exceeds the reviewed spending envelope");
  return { amount: (bytes + 4096) * rates[0] + maxTokens * rates[1], bytes };
}

/** @returns {Promise<{allowed:true}|{allowed:false,status:number,message:string}>} */
export async function reserveProviderSpend(model, messages, maxTokens) {
  try {
    const { amount, bytes } = spendEnvelope(model, messages, maxTokens);
    const db = getSupabase();
    if (!db) throw new Error("Unavailable");
    const { data, error } = await db.rpc("reserve_ai_spend", { p_amount: amount, p_model: model, p_input_bytes: bytes, p_output_tokens: maxTokens }).abortSignal(AbortSignal.timeout(4000));
    if (error || typeof data?.allowed !== "boolean") throw new Error("Unavailable");
    if (!data.allowed) {
      if (!["spend_limit", "ai_paused"].includes(data.reason)) throw new Error("Unavailable");
      return { allowed: false, status: data.reason === "ai_paused" ? 503 : 429, message: "AI has reached its operating budget or is temporarily paused. Manual scoring and saved work remain available." };
    }
    if (!Number.isInteger(data.reserved) || data.reserved < amount || data.reserved > 10000000) throw new Error("Unavailable");
    return { allowed: true };
  } catch {
    console.error("AI spending guard unavailable");
    return { allowed: false, status: 503, message: "Could not verify the AI spending budget. Please try again later." };
  }
}
