// @ts-check
import { NextResponse } from "next/server";

/** @param {string | undefined} raw @param {number} fallback @param {number} maximum */
const limit = (raw, fallback, maximum) => {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error("Invalid AI usage limit");
  return value;
};

const reasons = {
  quota_exceeded: "Your daily AI usage limit is reached. Try again after the usage window resets.",
  global_quota_exceeded: "AI has reached its shared usage limit. Please try again later; manual scoring and saved work remain available.",
  request_in_progress: "An AI request is already running for your account. Wait for it to finish before trying again.",
  ai_busy: "AI is busy. Please try again shortly.",
  request_too_soon: "Please wait a few seconds before starting another AI request.",
};
const unavailable = () => NextResponse.json({ error: "Could not verify AI usage. Please try again later.", code: "usage_unavailable" }, { status: 503, headers: { "Retry-After": "30" } });

/**
 * The reservation is durable before handler/provider work starts. Cleanup
 * failure leaves it counted and leased; the lease outlives the 180s route
 * budget and recovers after a crashed function. Never fall back to a counter.
 * @param {{userId: string, routeName: string, supabase: import("@supabase/supabase-js").SupabaseClient, handler: (userId: string) => (Response | Promise<Response>)}} args
 */
export async function runMeteredAi({ userId, routeName, supabase, handler }) {
  if (process.env.AI_REQUESTS_ENABLED === "false")
    return NextResponse.json({ error: "AI is temporarily paused. Manual scoring and saved work remain available.", code: "ai_paused" }, { status: 503, headers: { "Retry-After": "300" } });
  let reservation;
  let globalLimit;
  try {
    globalLimit = limit(process.env.AI_GLOBAL_DAILY_QUOTA, 100, 100000);
    const { data, error } = await supabase.rpc("reserve_ai_request", {
      p_user_id: userId, p_route: routeName,
      p_user_limit: limit(process.env.AI_DAILY_QUOTA_PER_USER, 50, 1000),
      p_global_limit: globalLimit,
      p_global_concurrency: limit(process.env.AI_GLOBAL_CONCURRENCY, 3, 32),
      p_lease_seconds: 240, p_cooldown_seconds: 5,
    }).abortSignal(AbortSignal.timeout(5000));
    if (error || !data || typeof data.allowed !== "boolean") throw new Error("Reservation unavailable");
    if (!data.allowed) {
      if (!Object.hasOwn(reasons, data.reason) || !Number.isInteger(data.retry_after) || data.retry_after < 1 || data.retry_after > 86400)
        throw new Error("Invalid usage response");
      console.warn("AI usage request refused", { route: routeName, code: data.reason });
      return NextResponse.json({ error: reasons[/** @type {keyof typeof reasons} */ (data.reason)], code: data.reason }, { status: 429, headers: { "Retry-After": String(data.retry_after) } });
    }
    if (typeof data.reservation_id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.reservation_id))
      throw new Error("Missing usage reservation");
    reservation = data.reservation_id;
    if (Number.isInteger(data.global_used) && data.global_used >= Math.ceil(globalLimit * 0.8))
      console.warn("AI shared usage budget nearing limit", { used: data.global_used, limit: globalLimit });
  } catch {
    console.error("AI usage reservation unavailable", { route: routeName });
    return unavailable();
  }
  let status = 500;
  try {
    const response = await handler(userId);
    status = response.status;
    return response;
  } finally {
    try {
      const { error } = await supabase.rpc("finish_ai_request", { p_reservation_id: reservation, p_status: status }).abortSignal(AbortSignal.timeout(2000));
      if (error) throw new Error("Could not finish usage reservation");
    } catch {
      // The request stays in the budget; expiry bounds the concurrency lease.
      console.error("AI usage completion unavailable; reservation retained", { route: routeName });
    }
  }
}
