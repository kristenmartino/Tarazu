import { test, expect } from "@playwright/test";

const validateNav = page => page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Validate" });

test("save and reopen a brief across reload, revise it, then create an independent decision", async ({ page }) => {
  await page.goto("/app");
  await validateNav(page).click({ timeout: 45000 });
  await page.getByLabel("IDEA NAME", { exact: true }).fill("Approval reminders — demo");
  await page.getByLabel("PROBLEM", { exact: true }).fill("Approvals stall without a reminder");
  await page.getByLabel("AUDIENCE", { exact: true }).fill("Workspace admins");
  await page.getByLabel("Problem severity: 5 of 5", { exact: true }).click();
  await page.getByLabel("RISKS / UNKNOWNS", { exact: true }).fill("We have not tested demand");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByText("Saved in this browser · Revision 1", { exact: true })).toBeVisible();
  await page.reload();
  await validateNav(page).click();
  await page.getByRole("button", { name: "Open brief: Approval reminders — demo", exact: true }).click();
  await expect(page.getByLabel("PROBLEM", { exact: true })).toHaveValue("Approvals stall without a reminder");
  await expect(page.getByLabel("Problem severity: 5 of 5", { exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Assessment incomplete", { exact: true })).toBeVisible();
  await page.getByLabel("NEXT VALIDATION ACTIONS", { exact: true }).fill("Interview three admins");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByText("Saved in this browser · Revision 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create Decision Draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Decisions", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => ({
    briefs: JSON.parse(localStorage.getItem("prioritize-ws-default-briefs")),
    decisions: JSON.parse(localStorage.getItem("prioritize-ws-default-decisions")),
  }));
  expect(saved.briefs).toHaveLength(1);
  expect(saved.briefs[0].revision).toBe(2);
  expect(saved.decisions).toHaveLength(1);
  expect(saved.decisions[0].status).toBe("draft");
  expect(saved.decisions[0].recommendation_snapshot.validation_brief.revision).toBe(2);
  expect(saved.briefs[0].draft.scores.evidenceStrength).toBeNull();
  await validateNav(page).click();
  await page.getByRole("button", { name: "Open brief: Approval reminders — demo", exact: true }).click();
  await page.getByLabel("RISKS / UNKNOWNS", { exact: true }).fill("New information after the decision");
  await page.getByRole("button", { name: "Save brief", exact: true }).click();
  await expect(page.getByText("Saved in this browser · Revision 3", { exact: true })).toBeVisible();
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("prioritize-ws-default-decisions"))[0].recommendation_snapshot.validation_brief);
  expect(snapshot.revision).toBe(2);
  expect(snapshot.draft.risks).toBe("We have not tested demand");
});

test("high opportunity ratings cannot produce Build without evidence", async ({ page }) => {
  await page.goto("/app");
  await validateNav(page).click({ timeout: 45000 });
  await page.getByLabel("IDEA NAME", { exact: true }).fill("Unvalidated idea");
  await page.getByLabel("PROBLEM", { exact: true }).fill("A problem assumption");
  await page.getByLabel("AUDIENCE", { exact: true }).fill("An audience assumption");
  for (const dimension of ["Problem severity", "Market pull", "Differentiation", "Monetization clarity", "Build feasibility", "Strategic fit"])
    await page.getByLabel(`${dimension}: 5 of 5`, { exact: true }).click();
  await page.getByLabel("Evidence strength: 1 of 5", { exact: true }).click();
  await expect(page.getByText("Build", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Validate Further", { exact: true })).toBeVisible();
});
