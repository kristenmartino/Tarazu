import { getSupabase } from "../../../lib/supabase";
import { spendEnvelope } from "../../../lib/ai-spend";
export const dynamic = "force-dynamic";
export async function GET() {
  const limits = { perAccount: Number(process.env.AI_DAILY_QUOTA_PER_USER || 50), shared: Number(process.env.AI_GLOBAL_DAILY_QUOTA || 100), concurrent: Number(process.env.AI_GLOBAL_CONCURRENCY || 3) };
  const problems = [];
  let status = 200;
  const models = { analysis: process.env.ANTHROPIC_MODEL_ANALYSIS || "claude-opus-4-8", suggestions: process.env.ANTHROPIC_MODEL_SUGGESTIONS || "claude-sonnet-4-6" };
  try {
    if (!process.env.ANTHROPIC_API_KEY || !process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) throw new Error("Configuration");
    if (![limits.perAccount, limits.shared, limits.concurrent].every(Number.isInteger) || limits.perAccount < 1 || limits.perAccount > 1000 || limits.shared < 1 || limits.shared > 100000 || limits.concurrent < 1 || limits.concurrent > 32) throw new Error("Configuration");
    spendEnvelope(models.analysis, [{role:"user",content:"health"}], 1);
    spendEnvelope(models.suggestions, [{role:"user",content:"health"}], 1);
    const db = getSupabase();
    if (!db) throw new Error("Database");
    const { data, error } = await db.rpc("launch_health").abortSignal(AbortSignal.timeout(4000));
    if (error || typeof data?.enabled !== "boolean" || !Number.isSafeInteger(data.budget) || data.budget < 1 || data.budget > 10000000 || ![data.reserved,data.requests,data.recent_requests,data.recent_failures].every(n=>Number.isSafeInteger(n)&&n>=0)) throw new Error("Health unavailable");
    if (!data.enabled || process.env.AI_REQUESTS_ENABLED === "false") problems.push("ai_paused");
    if (data.reserved >= data.budget * 0.8) problems.push("ai_spend_warning");
    if (data.requests >= limits.shared * 0.8) problems.push("ai_requests_warning");
    if (data.recent_failures >= 3 && data.recent_failures >= data.recent_requests / 2) problems.push("ai_failures");
  } catch { problems.push("configuration_or_database_unavailable"); status = 503; }
  return Response.json({ status: problems.length ? "attention" : "ok", problems,
    capacity: { ...limits, rollingSpendCeilingUsd: 10, models },
    release: process.env.VERCEL_GIT_COMMIT_SHA || "local" }, { status, headers: { "Cache-Control": "no-store" } });
}
