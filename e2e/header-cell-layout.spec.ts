/**
 * @file e2e/header-cell-layout.spec.ts
 *
 * Header cell layout in the full-featured demo (`docs/examples/table` is `table-basic.vue`), whose
 * header is bold through `.df-grid.header` and whose three-row layout sizes its short-value
 * columns (id/rating/play count, year/duration/languages, the delete icon) to `max-content`:
 *
 *   1. The hidden header-measurement clone renders in the same font as the visible header, so a
 *      column sized by its header label fits that label on one line.
 *   2. A header cell whose column carries `text-right` puts its label and sorting indicator at
 *      the cell's right edge.
 *   3. A non-sortable column's header has no sorting indicator taking up room.
 *
 * Fonts and layout are only resolved in a real browser, so none of it can be asserted in JSDOM.
 */
import { expect, Page, test } from '@playwright/test';

async function openDemo(page: Page) {
  await page.goto('/examples/table');
  await page.waitForSelector('.df-grid.card.header .df-grid.cell', { timeout: 20_000 });
  await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
  await page.waitForTimeout(1_000);
}

test.describe('header cell layout', () => {
  // At this width the docs page gives the demo its three-row layout with every short-value column
  // at its header label's width, so a label measured in a lighter font than it renders in wraps.
  test.use({ viewport: { width: 1400, height: 1000 } });

  test('the measurement clone uses the visible header font', async ({ page }) => {
    await openDemo(page);

    const weights = await page.evaluate(() => ({
      header: getComputedStyle(document.querySelector('.df-grid.card.header .df-grid.cell')!).fontWeight,
      clone: getComputedStyle(document.querySelector('.body-grid .df-unanchored .df-grid.cell')!).fontWeight,
    }));
    expect(weights.clone).toBe(weights.header);
  });

  test('every header label fits on one line', async ({ page }) => {
    await openDemo(page);

    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.df-grid.card.header .df-grid.cell > .content')).map((c) => ({
        text: c.textContent!.trim(),
        height: c.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(c).lineHeight),
      })),
    );
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.height, `"${label.text}" wraps`).toBeLessThan(label.lineHeight * 1.5);
    }
  });

  test('a text-right header cell ends its label and indicator at the right edge', async ({ page }) => {
    await openDemo(page);

    const gaps = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.df-grid.card.header .df-grid.cell.text-right')).map((c) => {
        const style = getComputedStyle(c);
        const contentRight = c.getBoundingClientRect().right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
        return { field: c.classList[2], gap: contentRight - c.lastElementChild!.getBoundingClientRect().right };
      }),
    );
    expect(gaps.length).toBeGreaterThan(0);
    for (const { field, gap } of gaps) expect(Math.abs(gap), field).toBeLessThan(1);
  });

  test('a non-sortable header has no sorting indicator', async ({ page }) => {
    await openDemo(page);

    const indicators = await page.locator('.df-grid.card.header .df-grid.cell.actions .df-grid-sorting-indicator-wrapper').count();
    expect(indicators).toBe(0);
  });
});
