/**
 * @file e2e/layout-remeasure.spec.ts
 *
 * The server-side demo starts with no records, so its responsive layouts are first measured from
 * the header alone. Once a page of records arrives, every layout is measured again from them, and
 * the layout picked for a given container width is the one that fits the records.
 *
 * The demo's data is random, so no absolute width is asserted: the narrowest container the
 * single-line layout is picked for is found with the header alone and again with records, and the
 * second is clearly wider.
 */
import { expect, Page, test } from '@playwright/test';

function activeLayout(page: Page): Promise<string> {
  return page.evaluate(() => {
    const bodyGrid = document.querySelector('.df-grid.body-grid') as HTMLElement;
    return (bodyGrid.className.match(/\b(single-line|two-row)\b/) ?? ['?'])[0];
  });
}

async function setContainerWidth(page: Page, width: number, settleMs = 200) {
  await page.evaluate((w) => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    container.style.setProperty('width', `${w}px`, 'important');
    container.style.setProperty('flex', 'none', 'important');
  }, width);
  await page.waitForTimeout(settleMs);
}

/** Narrowest container width, scanning down from `from`, for which the single-line layout is still picked. */
async function singleLineThreshold(page: Page, from: number): Promise<number> {
  /* eslint-disable no-await-in-loop -- each width must be applied and settled before the next */
  for (let width = from; width >= 100; width -= 5) {
    await setContainerWidth(page, width);
    if ((await activeLayout(page)) === 'two-row') return width + 5;
  }
  /* eslint-enable no-await-in-loop */
  return 0;
}

test('layouts measured before the records arrived are measured again from the records', async ({ page }) => {
  await page.goto('/examples/server-side');
  await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });
  await page.waitForTimeout(1_000);

  const headerOnly = await singleLineThreshold(page, 400);
  expect(headerOnly, 'the empty grid never switched to the two-row layout').toBeGreaterThan(0);

  await page.evaluate(() => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    container.style.removeProperty('width');
    container.style.removeProperty('flex');
  });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Load data' }).click();
  await page.locator('.df-grid.body-grid .df-anchored .df-grid.cell.id').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1_000);

  // record titles and artists are far wider than their header labels
  const withRecords = await singleLineThreshold(page, 900);
  expect(withRecords).toBeGreaterThan(headerOnly + 40);
});
