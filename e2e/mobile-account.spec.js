import { test, expect } from '@playwright/test';

// Default browser project is intentionally no-key/guest. Live Clerk QA is separate.
const sizes = [
  { width: 320, height: 480, theme: 'onyx', path: '/app' },
  { width: 390, height: 844, theme: 'warm-light', path: '/demo' },
  { width: 844, height: 390, theme: 'colorblind', path: '/app' },
];
for (const size of sizes) test(`Settings account storage and guards at ${size.width}×${size.height}`, async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize(size);
  await page.addInitScript(theme => localStorage.setItem('tarazu-theme', theme), size.theme);
  await page.goto(size.path);
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation).toBeVisible({ timeout: 45000 });
  if (size.width <= 800) await page.locator('#main-content').getByRole('button', { name: 'Settings', exact: true }).click();
  else await navigation.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.evaluate(() => document.documentElement.style.setProperty('--safe-area-bottom', '34px'));
  const section = page.getByRole('region', { name: 'Account and team', exact: true });
  await expect(section).toBeVisible();
  await expect(section).toContainText(size.path === '/demo' ? 'fictional Relay browser demo' : 'Browser workspace. Your data is stored on this device.');
  await expect(section.getByRole('button')).toHaveCount(0);
  await section.scrollIntoViewIfNeeded();
  const geometry = await section.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth };
  });
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.left).toBeGreaterThanOrEqual(0); expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  const theme = page.locator('#main-content').getByRole('button', { name: 'Onyx', exact: true });
  await theme.scrollIntoViewIfNeeded();
  const hit = await theme.evaluate(element => { const box = element.getBoundingClientRect(); const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return element === target || element.contains(target); });
  expect(hit).toBe(true); await theme.click(); await expect(theme).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(navigation).toBeVisible();
  expect(errors).toEqual([]);
});

test('normal desktop Settings keeps its existing account placement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/app');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Settings', exact: true }).click({ timeout: 45000 });
  await expect(page.getByRole('region', { name: 'Account and team', includeHidden: true })).toBeHidden();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
});
