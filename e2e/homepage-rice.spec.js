import { test, expect } from '@playwright/test';
import { rice } from '../src/utils.js';

test('homepage preview uses the app RICE calculation and keeps all inputs readable on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const preview = page.getByRole('region', { name: 'Illustrative RICE scorecard' });
  const table = preview.getByRole('table', { name: 'Illustrative RICE ranking' });
  await expect(preview.getByText('Fictional example', { exact: true })).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveText(['Candidate', 'Reach', 'Impact', 'Confidence', 'Effort', 'RICE index']);
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  const scores = [];
  for (const row of await rows.all()) {
    const cells = row.getByRole('cell');
    const values = [];
    for (const cell of await cells.all()) {
      await expect(cell).toBeVisible();
      values.push(Number((await cell.innerText()).replace(/[^\d]/g, '')));
    }
    const [reach, impact, confidence, effort, index] = values;
    for (const input of values.slice(0, 4)) { expect(input).toBeGreaterThanOrEqual(1); expect(input).toBeLessThanOrEqual(100); }
    expect(index).toBe(rice({ reach, impact, confidence, effort }));
    scores.push(index);
  }
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveCSS('opacity', '1');
  await preview.screenshot({ path: testInfo.outputPath('rice-desktop.png'), animations: 'disabled' });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const row of await rows.all()) {
      for (const input of ['Reach', 'Impact', 'Confidence', 'Effort'])
        await expect(row.getByText(input, { exact: true })).toBeVisible();
    }
    expect(await table.evaluate(element => [...element.querySelectorAll('tbody td')].every(cell => cell.scrollWidth <= cell.clientWidth + 1))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await preview.screenshot({ path: testInfo.outputPath(`rice-${width}.png`), animations: 'disabled' });
  }
});
