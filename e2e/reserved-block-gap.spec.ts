/**
 * @file e2e/reserved-block-gap.spec.ts
 *
 * The hidden header-measurement clone reserves `rowsPerRecord` grid row lines (see
 * use-row-placement.ts) with every box-model contributor collapsed to 0, but the consumer's own
 * `row-gap` still applies between those (empty) tracks and between the last of them and the
 * first real row — a gap that grows with `rowsPerRecord` since it's paid once per reserved
 * track. df-grid.vue compensates by shifting the body scroller up (and growing it by the same
 * amount) by `rowsPerRecord * row-gap`, computed from the consumer's own resolved `row-gap`. None
 * of this can be verified in JSDOM, which has no layout engine.
 */
import { expect, test } from '@playwright/test';

async function gapAboveFirstRow(page: import('@playwright/test').Page): Promise<number> {
  await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const outer = document.querySelector('.df-grid-body')!;
    const firstRow = document.querySelector('.df-anchored .df-grid.card[data-idx]')!;
    return firstRow.getBoundingClientRect().top - outer.getBoundingClientRect().top;
  });
}

test.describe('reserved-block gap compensation', () => {
  test('single-row layout: no visible gap above the first row', async ({ page }) => {
    await page.goto('/examples/renderers');
    expect(Math.abs(await gapAboveFirstRow(page))).toBeLessThan(2);
  });

  test('three-row layout: no visible gap above the first row', async ({ page }) => {
    await page.goto('/examples/table');
    await page.setViewportSize({ width: 900, height: 800 });
    expect(Math.abs(await gapAboveFirstRow(page))).toBeLessThan(2);
  });

  test('single-column layout: no visible gap above the first row', async ({ page }) => {
    await page.goto('/examples/table');
    expect(Math.abs(await gapAboveFirstRow(page))).toBeLessThan(2);
  });

  test('scrolled to the end, the last real row is not clipped by the compensated height', async ({ page }) => {
    await page.goto('/examples/table');
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    const bodyGrid = page.locator('.df-grid.body-grid');
    await page.waitForTimeout(500);

    // A single instant `scrollTop = scrollHeight` jump only fires one 'scroll' event — not
    // enough for windowing's own throttled recompute to converge on a dataset this size (each
    // recompute can only refine the estimate by so much before the next one is needed). Several
    // large jumps toward the end, each followed by a real dispatched 'scroll' event and a wait
    // past the throttle window, give it the repeated chances a real (if fast) scroll gesture
    // would.
    /* eslint-disable no-await-in-loop -- each jump must land before the next is sent */
    for (let i = 0; i < 8; i++) {
      await bodyGrid.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
        el.dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(150);
    }
    /* eslint-enable no-await-in-loop */
    await page.waitForTimeout(500);

    const lastRowClipped = await page.evaluate(() => {
      const outer = document.querySelector('.df-grid-body')!;
      const anchors = Array.from(document.querySelectorAll('.df-anchored .df-grid.card[data-idx]'));
      const last = anchors[anchors.length - 1];
      if (!last) return null;
      return last.getBoundingClientRect().bottom > outer.getBoundingClientRect().bottom + 2;
    });
    expect(lastRowClipped).toBe(false);
  });
});
