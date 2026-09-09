/**
 * @file e2e/row-anchor-stacking.spec.ts
 *
 * The row-anchor (`.df-grid.card`, spanning the full row for zebra/border/selection styling) is
 * `position: absolute` (see df-grid.vue), which makes it a stacking-context participant in its
 * own right — painted, and hit-tested, *above* its static in-flow siblings (the cells) by default.
 * Without an explicit negative `z-index` pulling it back behind them, this otherwise-empty box
 * would sit on top of real cell content and intercept clicks meant for it — a `postRender`-injected
 * button, say. None of this can be verified in JSDOM, which has no layout/paint engine.
 */
import { expect, test } from '@playwright/test';

test.describe('row-anchor stacking', () => {
  test('a click on cell content hits the cell, not the row-anchor', async ({ page }) => {
    await page.goto('/examples/table');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    const cellLocator = page.locator('.df-anchored .df-grid.cell').first();
    // Playwright's scrollIntoViewIfNeeded() has no native Firefox equivalent and is polyfilled,
    // which proved unreliable against this page's deeply nested scroll containers — the standard
    // Element.scrollIntoView(), called directly, is not.
    await cellLocator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(cellLocator).toBeInViewport();

    const hit = await page.evaluate(() => {
      const cell = document.querySelector('.df-anchored .df-grid.cell')!;
      const rect = cell.getBoundingClientRect();
      const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { isRowAnchor: !!el?.classList.contains('card'), cellContainsHit: !!el && cell.contains(el) };
    });
    expect(hit.isRowAnchor, 'the row-anchor intercepted a click meant for cell content').toBe(false);
    expect(hit.cellContainsHit).toBe(true);
  });

  test('a click on a postRender-injected button reaches the button, not the row-anchor', async ({ page }) => {
    await page.goto('/examples/table');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.shuffle-icon', { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const icon = page.locator('.df-anchored .shuffle-icon').first();
    await icon.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(icon).toBeInViewport();
    const box = await icon.boundingBox();
    if (!box) throw new Error('favorite icon has no box');

    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return { isRowAnchor: !!el?.closest('.df-grid.card[data-idx]')?.classList.contains('card') && !el?.closest('.shuffle-icon') };
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit.isRowAnchor, 'the row-anchor intercepted a click meant for a postRender button').toBe(false);
  });

  test('single-row auto-placed layout: a cell click still hits the cell', async ({ page }) => {
    await page.goto('/examples/renderers');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    const cellLocator = page.locator('.df-anchored .df-grid.cell').first();
    // Playwright's scrollIntoViewIfNeeded() has no native Firefox equivalent and is polyfilled,
    // which proved unreliable against this page's deeply nested scroll containers — the standard
    // Element.scrollIntoView(), called directly, is not.
    await cellLocator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(cellLocator).toBeInViewport();

    const hit = await page.evaluate(() => {
      const cell = document.querySelector('.df-anchored .df-grid.cell')!;
      const rect = cell.getBoundingClientRect();
      const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { isRowAnchor: !!el?.classList.contains('card'), cellContainsHit: !!el && cell.contains(el) };
    });
    expect(hit.isRowAnchor).toBe(false);
    expect(hit.cellContainsHit).toBe(true);
  });
});
