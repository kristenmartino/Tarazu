import { test, expect } from "@playwright/test";

// Desktop guest-mode happy path: boot → navigate → load samples → confirm the
// list and tradeoff map render together → run the AI advisor and confirm the
// demo fallback renders (no ANTHROPIC_API_KEY in this environment).
test("guest can boot, load samples, see the map beside the list, and get a demo recommendation", async ({ page }) => {
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

  // The right-rail advisor runs; with no API key it falls back to demo mode.
  const generate = page.getByRole("button", { name: /Generate Recommendation/i });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByText(/DEMO MODE/i)).toBeVisible({ timeout: 15_000 });
});
