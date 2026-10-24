// Deliberately closed vocabulary. Never accept names, IDs, URLs or free text.
export const USAGE_EVENTS = ["demo_opened", "walkthrough_started", "personal_started", "brief_saved", "brief_reopened", "ai_completed", "ai_refused", "feedback_opened"];
export const USAGE_MODES = ["demo", "personal", "public"];
export const MEASUREMENT_KEY = "tarazu-usage-measurement";
export function measurementAllowed() {
  try { return typeof navigator !== "undefined" && !navigator.globalPrivacyControl && navigator.doNotTrack !== "1" && localStorage.getItem(MEASUREMENT_KEY) === "yes"; } catch { return false; }
}
export function trackUsage(event, mode = "personal") {
  if (!USAGE_EVENTS.includes(event) || !USAGE_MODES.includes(mode) || !measurementAllowed()) return;
  try {
    // No cookies, user IDs, session IDs, referrers or page URLs in the body.
    void fetch("/api/usage", { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, mode }) }).catch(() => {});
  } catch { /* Measurement must never block work. */ }
}
