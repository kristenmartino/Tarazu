import { test, expect } from "@playwright/test";

test("homepage makes the fictional decision concrete while preserving entry links and the RICE view", async ({ page, request }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.goto("/");
    const hero = page.getByRole("article", { name: "Fictional Relay decision preview", exact: true });
    await expect(hero.getByRole("heading", { name: "Test a readiness checklist", exact: true })).toBeVisible();
    await expect(hero.getByText("Fictional evidence. Effectiveness remains unknown.", { exact: true })).toBeVisible();
    await expect(hero.getByRole("link", { name: "Explore this decision", exact: false })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Try the Relay demo", exact: true })).toHaveAttribute("href", "/demo");
    await expect(page.locator(".hero-actions").first().getByRole("link", { name: "Start prioritizing", exact: false })).toHaveAttribute("href", "/app");

    const lifecycle = page.locator("#lifecycle");
    await lifecycle.scrollIntoViewIfNeeded();
    await expect(lifecycle.getByRole("list", { name: "The five stages of a decision" }).getByRole("listitem")).toHaveCount(5);
    await expect(lifecycle.getByText("Fictional example. No real participants or measured results.", { exact: true })).toBeVisible();
    const screenshot = lifecycle.getByRole("img", { name: /Fictional Relay Round B decision at a glance/ });
    await expect(screenshot).toBeVisible();
    expect(await screenshot.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);

    const worked = page.getByRole("article", { name: "Fictional Relay worked decision", exact: true });
    await worked.scrollIntoViewIfNeeded();
    await expect(worked.getByText(/Small sample; effectiveness and prevalence remain unknown/)).toBeVisible();
    await expect(worked.getByText(/Planned review: October 30, 2026/)).toBeVisible();
    await expect(page.getByRole("table", { name: "Illustrative RICE ranking" })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const response = await request.get("/demo/relay-saved-decision.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
});

test("saved summary links by keyboard to the preserved source without scheduling a narrative date", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Decisions", exact: true }).click({ timeout: 45000 });
  await page.getByRole("button", { name: "Decision: SYNTHETIC • Round B: test readiness before building reminders", exact: true }).click();
  const summary = page.getByRole("region", { name: "Decision at a glance", exact: true });
  await expect(summary.getByText("Request readiness checklist — synthetic", { exact: true })).toBeVisible();
  await expect(summary.locator(".tz-glance-review dd")).toContainText("Not scheduled");
  await expect(summary.locator(".tz-glance-review time")).toHaveCount(0);
  const link = summary.getByRole("link", { name: /View preserved record/ });
  const target = page.locator(await link.getAttribute("href"));
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(target).toBeFocused();
  await expect(target.getByText(/Source brief:.*Revision 5\./)).toBeVisible();
  await expect(target.getByRole("heading", { name: "Next test", exact: true })).toHaveCount(1);
});
