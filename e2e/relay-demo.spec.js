import { test, expect } from "@playwright/test";

const prefix = "prioritize-ws-relay-demo-v1";
const nav = (page, name) => page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name, exact: true });
const openDemo = async page => {
  await page.goto("/demo");
  await expect(page.getByRole("region", { name: "Guest demo", exact: true })).toBeVisible({ timeout: 45000 });
};

test("a fresh visitor can follow Relay's complete evidence, brief and decision story, then revise and reopen it", async ({ page }) => {
  const requests = []; const errors = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await openDemo(page);
  await expect(page.getByRole("button", { name: "Start the decision walkthrough", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start the decision walkthrough", exact: true }).click();
  await expect(page.getByRole("button", { name: /AI Suggest Scores/ })).toBeDisabled();
  await expect(page.getByRole("slider", { name: "Reach", exact: true })).toHaveValue("55");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Request readiness checklist — synthetic", { exact: true }).first()).toBeVisible();
  await nav(page, "Signals").click();
  await expect(page.getByText("SYNTHETIC • Round B: four of five cases were incomplete", { exact: true }).first()).toBeVisible();
  await nav(page, "Validate").click();
  await page.getByRole("button", { name: "Continue latest saved brief", exact: true }).click();
  await expect(page.getByText("Revision 5 · Saved", { exact: true })).toBeVisible();
  await expect(page.getByLabel("PROBLEM", { exact: true })).toHaveValue(/FICTIONAL ROUND B/);
  await expect(page.getByText("Assessment incomplete", { exact: true })).toBeVisible();
  await page.getByLabel("NEXT VALIDATION ACTIONS", { exact: true }).fill("Visitor proposal: test the checklist before engineering.");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByText("Saved in this browser · Revision 6", { exact: true })).toBeVisible();
  await nav(page, "Decisions").click();
  await page.getByText("SYNTHETIC • Round A: investigate reminder versus readiness", { exact: true }).first().click();
  await expect(page.getByText(/Source brief:.*Revision 4\./)).toBeVisible();
  await page.getByText("SYNTHETIC • Round B: test readiness before building reminders", { exact: true }).first().click();
  await expect(page.getByText(/Source brief:.*Revision 5\./)).toBeVisible();
  await page.reload();
  await nav(page, "Validate").click();
  await page.getByRole("button", { name: "Continue latest saved brief", exact: true }).click();
  await expect(page.getByLabel("NEXT VALIDATION ACTIONS", { exact: true })).toHaveValue("Visitor proposal: test the checklist before engineering.");
  const saved = await page.evaluate(p => ({
    decisions: JSON.parse(localStorage.getItem(`${p}-decisions`)),
    briefs: JSON.parse(localStorage.getItem(`${p}-briefs`)),
  }), prefix);
  expect(saved.briefs[0].revision).toBe(6);
  expect(saved.decisions.map(d => d.recommendation_snapshot.validation_brief.revision)).toEqual([4, 5]);
  await page.getByRole("button", { name: "Create Decision Draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Decisions", exact: true })).toBeVisible();
  const created = await page.evaluate(p => JSON.parse(localStorage.getItem(`${p}-decisions`)), prefix);
  expect(created).toHaveLength(3);
  expect(created[2].recommendation_snapshot.validation_brief.revision).toBe(6);
  const restarted = page.waitForEvent("domcontentloaded");
  await page.getByRole("button", { name: "Restart demo", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restart demo", exact: true }).click();
  await restarted;
  await nav(page, "Validate").click();
  await page.getByRole("button", { name: "Continue latest saved brief", exact: true }).click();
  await expect(page.getByText("Revision 5 · Saved", { exact: true })).toBeVisible();
  expect(await page.evaluate(p => JSON.parse(localStorage.getItem(`${p}-decisions`)).length, prefix)).toBe(2);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("demo initialization and restart preserve ordinary guest work and preferences", async ({ page }) => {
  await page.goto("/app");
  await expect(nav(page, "Home")).toBeVisible({ timeout: 45000 });
  await page.evaluate(() => {
    localStorage.setItem("prioritize-workspaces", JSON.stringify([{ id: "mine", name: "My actual work" }]));
    localStorage.setItem("prioritize-active-workspace", "mine");
    localStorage.setItem("prioritize-ws-mine", JSON.stringify({ features: [{ id: "own", name: "Keep my idea", reach: 50, impact: 50, confidence: 50, effort: 50 }], manualOrder: [] }));
    localStorage.setItem("tarazu-cloud-workspace:existing-user:personal", "own-cloud-id");
  });
  const ownKeys = ["prioritize-workspaces", "prioritize-active-workspace", "prioritize-ws-mine", "tarazu-cloud-workspace:existing-user:personal"];
  const before = await page.evaluate(keys => keys.map(k => localStorage.getItem(k)), ownKeys);
  await openDemo(page);
  // A second tab must reopen the existing copy without adding another seed.
  const other = await page.context().newPage();
  await openDemo(other);
  await other.close();
  await page.getByRole("button", { name: "Restart demo", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start the decision walkthrough", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restart demo", exact: true }).click();
  const restarted = page.waitForEvent("domcontentloaded");
  await page.getByRole("dialog").getByRole("button", { name: "Restart demo", exact: true }).click();
  await restarted;
  await expect(page.getByRole("button", { name: "Start the decision walkthrough", exact: true })).toBeVisible();
  expect(await page.evaluate(keys => keys.map(k => localStorage.getItem(k)), ownKeys)).toEqual(before);
  await page.getByRole("region", { name: "Guest demo", exact: true }).getByRole("link", { name: "Open saved work", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My actual work", exact: true })).toBeVisible();
  await nav(page, "Priorities").click();
  await expect(page.getByText("Keep my idea", { exact: true }).first()).toBeVisible();
});

test("mobile guest can reopen the prepared brief and decisions without overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await page.screenshot({ path: testInfo.outputPath("relay-home-mobile.png") });
  await page.getByRole("button", { name: "Continue a validation brief", exact: true }).click();
  await page.getByRole("button", { name: "Continue latest saved brief", exact: true }).click();
  await expect(page.getByLabel("PROBLEM", { exact: true })).toHaveValue(/FICTIONAL ROUND B/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await nav(page, "Decisions").click();
  await page.getByText("SYNTHETIC • Round A: investigate reminder versus readiness", { exact: true }).first().click();
  await expect(page.getByText(/Source brief:.*Revision 4\./)).toBeVisible();
});

test("storage failures surface a recoverable error instead of an empty successful demo", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("Browser storage blocked"); }; });
  await page.goto("/demo");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Browser storage blocked", { timeout: 45000 });
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(nav(page, "Priorities")).toHaveCount(0);
});

test("public entry and metadata expose the demo link without indexing visitor work", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Try the Relay demo", exact: true })).toHaveAttribute("href", "/demo");
  const response = await request.get("/demo");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toMatch(/name="robots" content="noindex, follow"/);
});
