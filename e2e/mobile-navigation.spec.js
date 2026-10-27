import { test, expect } from '@playwright/test';

const nav = (page, name) => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true });
const main = page => page.locator('#main-content');
const bottom = page => page.evaluate(() => window.scrollTo({ top: document.scrollingElement.scrollHeight, behavior: 'instant' }));
const center = control => control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));

async function reachable(page, control, { overlay = false, scroll = true } = {}) {
  await expect(control).toBeVisible();
  if (scroll) await center(control);
  const result = await control.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    const navigation = document.querySelector('[role="navigation"][aria-label="Main navigation"]');
    const bar = navigation?.getBoundingClientRect();
    const bottomBar = navigation && getComputedStyle(navigation).position === 'fixed' && bar.width > bar.height;
    return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, navTop: bottomBar ? bar.top : innerHeight, ownsHit: element === hit || element.contains(hit), hit: hit?.textContent?.slice(0, 100) };
  });
  expect(result.scrollWidth, JSON.stringify(result)).toBeLessThanOrEqual(result.width + 1);
  expect(result.x, JSON.stringify(result)).toBeGreaterThanOrEqual(-1);
  expect(result.right, JSON.stringify(result)).toBeLessThanOrEqual(result.width + 1);
  expect(result.y, JSON.stringify(result)).toBeGreaterThanOrEqual(-1);
  expect(result.bottom, JSON.stringify(result)).toBeLessThanOrEqual(overlay ? result.height : result.navTop);
  expect(result.ownsHit, JSON.stringify(result)).toBe(true);
}

async function tap(page, control, options) {
  await reachable(page, control, options);
  await control.click();
}

const cases = [
  { width: 390, height: 844, inset: 0, path: '/demo', theme: 'onyx' },
  { width: 320, height: 780, inset: 0, path: '/demo', theme: 'warm-light' },
  { width: 390, height: 480, inset: 34, path: '/app', theme: 'colorblind' },
];

for (const size of cases) test(`Home last-row actions clear navigation at ${size.width}×${size.height}, inset ${size.inset}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.addInitScript(theme => localStorage.setItem('tarazu-theme', theme), size.theme);
  await page.goto(size.path);
  await expect(nav(page, 'Home')).toBeVisible({ timeout: 45000 });
  await page.evaluate(inset => document.documentElement.style.setProperty('--safe-area-bottom', `${inset}px`), size.inset);
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button')).toHaveCount(5);
  const barHeight = await page.getByRole('navigation', { name: 'Main navigation', exact: true }).evaluate(element => element.getBoundingClientRect().height);
  expect(barHeight).toBe(57 + size.inset);
  await bottom(page);
  const scenarios = main(page).getByRole('button', { name: 'Scenarios', exact: true });
  await tap(page, scenarios, { scroll: false });
  await expect(main(page).getByRole('heading', { name: 'Scenarios', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await nav(page, 'Home').click();
  await bottom(page);
  await tap(page, main(page).getByRole('button', { name: 'Settings', exact: true }), { scroll: false });
  await expect(main(page).getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await tap(page, main(page).getByRole('button', { name: 'Clear', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Cancel', exact: true }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`settings-${size.width}-${size.height}.png`) });
});

test('long records, signal/brief forms, review actions and Advisor remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/demo');
  await nav(page, 'Signals').click({ timeout: 45000 });
  await tap(page, main(page).getByRole('button', { name: '+ Add Signal', exact: true }));
  await page.getByPlaceholder('Signal title', { exact: true }).fill('Fictional mobile evidence');
  await page.getByPlaceholder('Details, quotes, or notes...', { exact: true }).fill('Fictional source; no real research. '.repeat(35));
  await tap(page, main(page).getByRole('button', { name: 'Add Signal', exact: true }));
  const edit = main(page).getByRole('button', { name: 'Edit signal: Fictional mobile evidence', exact: true });
  await tap(page, edit);
  await tap(page, main(page).getByRole('button', { name: 'Cancel', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Delete signal: Fictional mobile evidence', exact: true }));
  await nav(page, 'Home').click();
  await tap(page, main(page).getByRole('button', { name: 'Validate', exact: true }));
  await page.getByRole('button', { name: 'Continue latest saved brief', exact: true }).click();
  await page.getByLabel('Test question or assumption', { exact: true }).fill('Fictional mobile test question');
  await tap(page, page.getByRole('button', { name: 'Save brief', exact: true }));
  await expect(page.getByText('Saved in this browser · Revision 6', { exact: true })).toBeVisible();
  await tap(page, page.getByRole('button', { name: 'Create Decision Draft', exact: true }));
  const title = 'Decision: Validation: Approval reminders — synthetic';
  await page.getByRole('button', { name: title, exact: true }).click();
  const record = page.getByRole('region', { name: title, exact: true });
  await tap(page, record.getByRole('button', { name: 'Review decision', exact: true }));
  await record.getByLabel(/What happened/).fill('Not tested yet.');
  await record.getByLabel('Reason and next action', { exact: true }).fill('Keep the small fictional test.');
  await tap(page, record.getByRole('button', { name: 'Save review', exact: true }));
  await tap(page, record.getByRole('button', { name: 'Review decision', exact: true }));
  await tap(page, record.getByRole('button', { name: 'Cancel review', exact: true }));
  await tap(page, record.getByRole('button', { name: 'Edit', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Update', exact: true }));
  await tap(page, record.getByRole('button', { name: 'Delete', exact: true }));
  await nav(page, 'Advisor').click();
  await tap(page, main(page).getByText('Recommendation feedback history', { exact: true }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('short viewport supports fixed candidate actions, sheet, imports, menus and dialogs', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/app');
  await expect(nav(page, 'Home')).toBeVisible({ timeout: 45000 });
  await page.evaluate(() => {
    const workspaces = Array.from({ length: 18 }, (_, index) => ({ id: `mobile-${index}`, name: `Fictional workspace ${index}` }));
    workspaces[0].name = 'Long fictional workspace '.repeat(12);
    localStorage.setItem('prioritize-workspaces', JSON.stringify(workspaces));
    localStorage.setItem('prioritize-active-workspace', 'mobile-0');
  });
  await page.goto('/app?start=decision');
  await page.evaluate(() => document.documentElement.style.setProperty('--safe-area-bottom', '34px'));
  await expect(page.getByLabel('Candidate name', { exact: true })).toBeFocused();
  await page.getByLabel('Candidate name', { exact: true }).fill('Fictional candidate');
  await tap(page, page.getByRole('form', { name: 'New candidate', exact: true }).getByRole('button', { name: 'Add Candidate', exact: true }));
  await nav(page, 'Priorities').click();
  await main(page).getByTitle('Fictional candidate', { exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Candidate detail', exact: true });
  await tap(page, sheet.getByRole('button', { name: /Edit/ }), { overlay: true });
  await tap(page, page.getByRole('form', { name: 'Edit candidate', exact: true }).getByRole('button', { name: 'Cancel', exact: true }));
  // Cancelling the edit preserves selection, so the detail sheet reopens.
  await expect(sheet).toBeVisible();
  await tap(page, sheet.getByRole('button', { name: '✕ Close', exact: true }), { overlay: true });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'fictional.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Description\nImported option,Fictional planning exercise\n') });
  await tap(page, main(page).getByRole('button', { name: 'Import 1 Candidates', exact: true }));
  await nav(page, 'Home').click();
  await tap(page, main(page).getByRole('button', { name: 'Scenarios', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Custom Weights', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Save Scenario', exact: true }));
  const dialog = page.getByRole('dialog', { name: 'Save scenario', exact: true });
  await dialog.getByLabel('Scenario name', { exact: true }).fill('Fictional saved scenario');
  await tap(page, dialog.getByRole('button', { name: 'Save', exact: true }), { overlay: true });
  await page.getByRole('banner').getByRole('button', { name: /Long fictional workspace/ }).click();
  const menu = page.locator('.tz-mobile-workspace-menu');
  await tap(page, menu.getByRole('button', { name: '+ New Workspace', exact: true }));
  await tap(page, page.getByRole('dialog', { name: 'New workspace', exact: true }).getByRole('button', { name: 'Cancel', exact: true }), { overlay: true });
  await nav(page, 'Home').click();
  await tap(page, main(page).getByRole('button', { name: 'Settings', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Delete', exact: true }));
  await tap(page, main(page).getByRole('button', { name: 'Confirm', exact: true }));
  await tap(page, page.getByRole('dialog', { name: 'Delete workspace?', exact: true }).getByRole('button', { name: 'Cancel', exact: true }), { overlay: true });
  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard Shortcuts', exact: true });
  await tap(page, shortcuts.getByRole('button', { name: 'Esc', exact: true }), { overlay: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('short-mobile.png') });
});

test('desktop Home keeps its original navigation layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/demo');
  await expect(nav(page, 'Home')).toBeVisible({ timeout: 45000 });
  expect(await page.locator('.tz-app').evaluate(element => getComputedStyle(element).paddingBottom)).toBe('0px');
  await expect(main(page).getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(nav(page, 'Settings')).toBeVisible();
  await main(page).getByRole('button', { name: 'Scenarios', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Scenarios', exact: true })).toBeVisible();
});


test('a long save error keeps candidate fields and actions usable in a short safe-area viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/app?start=decision');
  await expect(page.getByLabel('Candidate name', { exact: true })).toBeFocused({ timeout: 45000 });
  await page.evaluate(() => document.documentElement.style.setProperty('--safe-area-bottom', '34px'));
  const form = page.getByRole('form', { name: 'New candidate', exact: true });
  await form.getByLabel('Candidate name', { exact: true }).fill('Fictional save-error test');
  await page.evaluate(() => {
    window.__mobileOriginalWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'prioritize-ws-default') throw new Error('Fictional storage failure; changes must remain reachable. '.repeat(8));
      return window.__mobileOriginalWrite.call(this, key, value);
    };
  });
  const save = form.getByRole('button', { name: 'Add Candidate', exact: true });
  await tap(page, save);
  await expect(form.getByRole('alert')).toContainText('Fictional storage failure');
  await expect.poll(() => form.locator('.tz-candidate-save').evaluate(element => element.getBoundingClientRect().height)).toBeLessThanOrEqual(192);
  const reserve = await form.evaluate(element => parseFloat(getComputedStyle(element).getPropertyValue('--candidate-action-height')));
  const footerHeight = await form.locator('.tz-candidate-save').evaluate(element => element.getBoundingClientRect().height);
  expect(Math.abs(reserve - footerHeight)).toBeLessThan(1);
  await reachable(page, form.getByLabel('Candidate name', { exact: true }));
  await reachable(page, form.getByLabel('Candidate description', { exact: true }));
  await reachable(page, form.getByText('What scores mean', { exact: true }));
  const status = form.getByRole('region', { name: 'Save status and error', exact: true });
  await status.focus();
  await page.keyboard.press('End');
  expect(await status.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await reachable(page, form.getByRole('button', { name: 'Cancel', exact: true }));
  await page.evaluate(() => { Storage.prototype.setItem = window.__mobileOriginalWrite; delete window.__mobileOriginalWrite; });
  await tap(page, save);
  await expect(form).toHaveCount(0);
});

test('landscape rail tabs, workspace menu and shortcuts scroll within the short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/demo');
  await expect(nav(page, 'Home')).toBeVisible({ timeout: 45000 });
  await tap(page, nav(page, 'Settings'));
  await expect(main(page).getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await tap(page, nav(page, 'Advisor'));
  await expect(main(page).getByRole('heading', { name: 'Advisor', exact: true })).toBeVisible();
  await page.goto('/app');
  await expect(nav(page, 'Home')).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem('prioritize-workspaces', JSON.stringify(Array.from({ length: 18 }, (_, index) => ({ id: `landscape-${index}`, name: `Landscape ${index}` }))));
    localStorage.setItem('prioritize-active-workspace', 'landscape-0');
  });
  await page.reload();
  await page.getByTitle('Landscape 0', { exact: true }).click();
  await tap(page, page.locator('.tz-rail-workspace-menu').getByRole('button', { name: '+ New Workspace', exact: true }));
  await tap(page, page.getByRole('dialog', { name: 'New workspace', exact: true }).getByRole('button', { name: 'Cancel', exact: true }), { overlay: true });
  await page.keyboard.press('?');
  await tap(page, page.getByRole('dialog', { name: 'Keyboard Shortcuts', exact: true }).getByRole('button', { name: 'Esc', exact: true }), { overlay: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
