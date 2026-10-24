import { test, expect } from "@playwright/test";

const nav = (page, name) => page.getByRole("navigation", {name:"Main navigation"}).getByRole("button", {name,exact:true});

test("keyboard users can skip navigation, expand decisions, edit and return focus", async ({page}) => {
  await page.goto("/demo");
  await expect(nav(page,"Home")).toBeVisible({timeout:45000});
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link",{name:"Skip to main content",exact:true})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await nav(page,"Decisions").focus(); await page.keyboard.press("Enter");
  const decision = page.getByRole("button",{name:"Decision: SYNTHETIC • Round A: investigate reminder versus readiness",exact:true});
  await decision.focus(); await page.keyboard.press("Enter");
  await expect(decision).toHaveAttribute("aria-expanded","true");
  const details = page.getByRole("region",{name:"Decision: SYNTHETIC • Round A: investigate reminder versus readiness",exact:true});
  await expect(details.getByText(/Source brief:.*Revision 4\./)).toBeVisible();
  await page.keyboard.press("Space"); await expect(decision).toHaveAttribute("aria-expanded","false");
  await page.keyboard.press("Enter"); await page.keyboard.press("Tab");
  const edit = details.getByRole("button",{name:"Edit",exact:true});
  for (let step=0;step<30 && !(await edit.evaluate(el=>el===document.activeElement));step++) await page.keyboard.press("Tab");
  await expect(edit).toBeFocused(); await page.keyboard.press("Enter");
  await expect(page.getByLabel("Decision title",{exact:true})).toBeFocused();
  await page.getByRole("button",{name:"Close decision editor",exact:true}).focus(); await page.keyboard.press("Enter");
  await expect(edit).toBeFocused();
  await nav(page,"Signals").click();
  await page.getByRole("link",{name:"Skip to main content",exact:true}).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("demo handoff opens a blank candidate while keeping both demo and ordinary guest work", async ({page}) => {
  await page.goto("/app"); await expect(nav(page,"Home")).toBeVisible({timeout:45000});
  await page.getByRole("button",{name:"+ Add Candidate",exact:true}).click();
  await page.getByRole("textbox",{name:"Candidate name",exact:true}).fill("Existing guest idea");
  await page.getByRole("button",{name:"Add Candidate",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Saved in this browser"})).toBeVisible();
  await page.goto("/demo");
  await page.getByRole("region",{name:"Guest demo",exact:true}).getByRole("link",{name:"Start your own decision",exact:true}).click();
  await expect(page.getByRole("region",{name:"Your own decision",exact:true})).toContainText("Existing candidates stay in place");
  await expect(page.getByRole("textbox",{name:"Candidate name",exact:true})).toHaveValue("");
  await expect(page.getByRole("textbox",{name:"Candidate name",exact:true})).toBeFocused();
  await expect(page).toHaveURL(/\/app$/);
  const saved = await page.evaluate(() => ({mine:JSON.parse(localStorage.getItem("prioritize-ws-default")),demo:JSON.parse(localStorage.getItem("prioritize-ws-relay-demo-v1"))}));
  expect(saved.mine.features.map(f=>f.name)).toEqual(["Existing guest idea"]);
  expect(saved.demo.features).toHaveLength(3);
  await page.getByRole("textbox",{name:"Candidate name",exact:true}).fill("My next decision");
  await page.getByRole("button",{name:"Add Candidate",exact:true}).click();
  await expect(page.getByText("My next decision",{exact:true}).first()).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
  await page.reload(); await nav(page,"Priorities").click();
  await expect(page.getByText("Existing guest idea",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("My next decision",{exact:true}).first()).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Candidate name",exact:true})).toHaveCount(0);
});

test("candidate child actions and workspace picker work from the keyboard", async ({page}) => {
  await page.goto("/app"); await nav(page,"Priorities").click({timeout:45000});
  await page.getByRole("button",{name:"Load Example Backlog",exact:true}).click();
  const edit = page.getByRole("button",{name:/^Edit /}).first();
  await edit.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox",{name:"Candidate name",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  const picker = page.getByRole("button",{name:"My Backlog ▼",exact:true});
  await picker.focus(); await page.keyboard.press("Enter");
  const workspace = page.getByRole("button",{name:"Switch to workspace: My Backlog",exact:true});
  await expect(workspace).toBeVisible(); await workspace.focus(); await page.keyboard.press("Escape");
  await expect(picker).toBeFocused(); await expect(workspace).toHaveCount(0);
  await nav(page,"Scenarios").click();
  const scenarioCandidate=page.getByRole("button",{name:/^Inspect candidate:/}).first();
  await scenarioCandidate.focus();await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary",{name:"Detail panel"})).toContainText("RICE");

});

test("feedback is reachable and export limits are explicit without sending email", async ({page}) => {
  await page.goto("/demo");
  await page.getByRole("link",{name:"Feedback and contact",exact:true}).click({timeout:45000});
  await expect(page.getByRole("heading",{name:"Help shape Tarazu.",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Share product feedback",exact:true})).toHaveAttribute("href","mailto:kristen@kristenmartino.ai?subject=Tarazu%20feedback");
  await expect(page.getByRole("link",{name:"Ask for data help or deletion",exact:true})).toHaveAttribute("href",/^mailto:/);
  await expect(page.getByText(/There is currently no complete workspace backup export/)).toBeVisible();
  await page.goto("/faq");
  // Cold Next development compilation can outlast Playwright's 5s default.
  await expect(page.getByText(/Copy a saved decision as a Markdown brief/)).toBeVisible({timeout:45000});
  await expect(page.getByText(/CSV\/PDF omit scoring claims, Signals, saved validation briefs and decision history/)).toBeVisible();
  await expect(page.getByText(/There is no lock-in/)).toHaveCount(0);
});

test("mobile handoff and contact remain readable at 320px", async ({page},testInfo) => {
  await page.setViewportSize({width:320,height:780}); await page.goto("/demo");
  await expect(page.getByRole("region",{name:"Guest demo",exact:true})).toBeVisible({timeout:45000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("region",{name:"Guest demo",exact:true}).getByRole("link",{name:"Start your own decision",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Candidate name",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("own-decision-mobile.png")});
  await page.getByRole("link",{name:"Feedback and contact",exact:true}).click();
  await expect(page.getByRole("link",{name:"Share product feedback",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("sign-in handoff retains the own-decision destination in no-auth guest deployments", async ({page}) => {
  await page.goto("/demo");
  await expect(page.getByRole("region",{name:"Guest demo",exact:true})).toBeVisible({timeout:45000});
  const signIn=page.getByRole("region",{name:"Guest demo",exact:true}).getByRole("link",{name:"Sign in first",exact:true});
  await expect(signIn).toHaveAttribute("href","/sign-in?start=decision");
  await signIn.click();
  await expect(page.getByRole("region",{name:"Your own decision",exact:true})).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Candidate name",exact:true})).toHaveValue("");
});
