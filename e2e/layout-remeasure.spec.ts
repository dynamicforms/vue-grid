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

import { waitForGridSettled } from './grid-settled';

function activeLayout(page: Page): Promise<string> {
  return page.evaluate(() => {
    const bodyGrid = document.querySelector('.df-grid.body-grid') as HTMLElement;
    return (bodyGrid.className.match(/\b(single-line|two-row)\b/) ?? ['?'])[0];
  });
}

async function setContainerWidth(page: Page, width: number) {
  await page.evaluate((w) => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    container.style.setProperty('width', `${w}px`, 'important');
    container.style.setProperty('flex', 'none', 'important');
  }, width);
  await waitForGridSettled(page);
}

/**
 * Narrowest container width, scanning down from `from`, for which the single-line layout is still picked, or 0 when
 * the two-row layout is not picked at any width down to 100. A width no layout fits keeps the previously picked
 * layout, so the scan goes down in coarse steps until two-row is picked; every width between that one and the
 * previous step fits two-row, single-line is picked there from its threshold up, and a bisection finds it.
 */
async function singleLineThreshold(page: Page, from: number): Promise<number> {
  const isSingleLine = async (width: number) => {
    await setContainerWidth(page, width);
    return (await activeLayout(page)) === 'single-line';
  };
  const step = 40;
  /* eslint-disable no-await-in-loop -- each width must be applied and settled before the next */
  for (let width = from; width >= 100; width -= step) {
    if (!(await isSingleLine(width))) {
      let narrow = width;
      let wide = width + step;
      while (wide - narrow > 1) {
        const mid = Math.floor((narrow + wide) / 2);
        if (await isSingleLine(mid)) wide = mid;
        else narrow = mid;
      }
      return wide;
    }
  }
  /* eslint-enable no-await-in-loop */
  return 0;
}

test('layouts measured before the records arrived are measured again from the records', async ({ page }) => {
  await page.goto('/examples/server-side');
  await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });
  await waitForGridSettled(page);

  const headerOnly = await singleLineThreshold(page, 400);
  expect(headerOnly, 'the empty grid never switched to the two-row layout').toBeGreaterThan(0);

  await page.evaluate(() => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    container.style.removeProperty('width');
    container.style.removeProperty('flex');
  });
  await waitForGridSettled(page);
  await page.getByRole('button', { name: 'Load data' }).click();
  await page.locator('.df-grid.body-grid .df-anchored .df-grid.cell.id').first().waitFor({ timeout: 10_000 });
  await waitForGridSettled(page);

  // record titles and artists are far wider than their header labels
  const withRecords = await singleLineThreshold(page, 900);
  expect(withRecords).toBeGreaterThan(headerOnly + 40);
});
