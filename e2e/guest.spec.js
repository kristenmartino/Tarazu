import { test, expect } from "@playwright/test";

// Desktop guest-mode happy path: boot → navigate → load samples → confirm the
// list and tradeoff map render together → confirm the AI advisor prompts for
// sign-in rather than serving a guest.
//
// The free, no-account product surface (scoring, the map, CSV) stays intact for
// guests; only the AI advisor is gated, because /api/analyze bills the Anthropic
// API per call and must never run anonymously.
test("guest can boot, load samples, see the map beside the list, and is prompted to sign in for AI", async ({ page }) => {
  await page.goto("/app");

  // App shell boots in guest mode. Scope to the nav landmark — "Priorities"
  // also appears as a shortcut on the home screen. Generous timeout: `next dev`
  // compiles /app on first hit and the client hydrates before the nav renders.
  const prioritiesNav = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Priorities" });
  await expect(prioritiesNav).toBeVisible({ timeout: 45_000 });

  // Navigate to Priorities; the onboarding panel offers a sample backlog.
  await prioritiesNav.click();
  const loadSamples = page.getByRole("button", { name: "Load Example Backlog" });
  await expect(loadSamples).toBeVisible();
  await loadSamples.click();

  // Onboarding is replaced by ranked candidates.
  await expect(loadSamples).toHaveCount(0);
  await expect(page.getByText(/CANDIDATES/).first()).toBeVisible();

  // The tradeoff map now renders alongside the ranked list (side-by-side on
  // desktop), so the matrix canvas is visible without a view toggle.
  await expect(page.locator("#main-content canvas").first()).toBeVisible();

  // The right-rail advisor is reachable, but /api/analyze 401s an anonymous
  // caller, so the panel prompts for sign-in.
  const generate = page.getByRole("button", { name: /Generate Recommendation/i });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByText(/Sign in to run the AI advisor/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /^Sign in$/i })).toBeVisible();

  // The regression this guards: AIPanel used to fall back to a locally
  // generated "DEMO MODE" recommendation on ANY non-OK response. Serving that
  // to a signed-out visitor gives them no reason to ever sign in.
  await expect(page.getByText(/DEMO MODE/i)).toHaveCount(0);
});
