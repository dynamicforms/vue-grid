/**
 * @file e2e/server-side-demo.spec.ts
 *
 * Two behaviours specific to `docs/examples/server-side.md`'s own demo code (not the library
 * itself), regression-tested here because both are easy for a consumer building a similar
 * server-backed grid to reproduce:
 *
 *  - `.df-grid.cell` in this demo is `overflow: hidden` for single-line ellipsis truncation.
 *    Once enough rows are loaded for the body grid's own scrolling to give it a definite height
 *    smaller than every row's true height combined, a grid item with non-visible overflow gets an
 *    *automatic minimum size* of 0 for the default `auto` row-sizing function instead of its real
 *    content size, letting rows compress toward that 0 instead of the grid scrolling as expected.
 *    `table-server.vue` sets `grid-auto-rows: min-content` on `.df-record-grid` to avoid it — an
 *    explicit (non-`auto`) row-sizing function isn't subject to that reduction. See the Card
 *    layout CSS section of docs/reference/df-grid.md for the general guidance.
 *  - The demo's own `initialLoad()` simulates a server round-trip with a random delay and, before
 *    this fix, could apply an older, now-stale response after a newer one — the older filter's
 *    slower "server" reply overwriting the newer filter's already-correct, already-displayed
 *    result. A generation token now makes a response a no-op once a newer request has started.
 */
import { expect, test } from '@playwright/test';

test.describe('server-side demo', () => {
  test('rows keep their natural height once enough are loaded to need scrolling', async ({ page }) => {
    await page.goto('/examples/server-side');
    await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Load data' }).click();

    const bodyGrid = page.locator('.df-grid.body-grid');
    await bodyGrid.hover();
    /* eslint-disable no-await-in-loop -- each scroll must land before the next is sent */
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 3_000);
      await page.waitForTimeout(700);
    }
    /* eslint-enable no-await-in-loop */

    const spacings = await page.evaluate(() => {
      const tops = Array.from(document.querySelectorAll('.df-anchored .df-grid.cell.id'))
        .map((el) => el.getBoundingClientRect().top);
      return tops.slice(1).map((t, i) => t - tops[i]).filter((s) => Math.abs(s) > 0.5);
    });

    expect(spacings.length, 'no distinct rows were measured').toBeGreaterThan(5);
    const min = Math.min(...spacings);
    const max = Math.max(...spacings);
    // A genuine compression collapses rows toward 0 while the natural row height stays in the
    // teens/twenties of pixels at this font size — a wide min/max spread (not just sub-pixel
    // rounding) is the signature, not an exact row-height value the demo could change later.
    expect(max - min, `row spacing was not uniform: ${min}px..${max}px`).toBeLessThan(1);
  });

  test('a filter applied while a slower, older one is still resolving is not clobbered by it', async ({ page }) => {
    await page.goto('/examples/server-side');
    await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Load data' }).click();
    await page.waitForTimeout(1_500);

    const yearFilter = page.locator('input[placeholder="Filter Year..."]');
    await yearFilter.click();
    await yearFilter.fill('2000');
    await page.waitForTimeout(300);
    await yearFilter.fill('');
    await page.waitForTimeout(300);
    const artistFilter = page.locator('input[placeholder="Filter Artist..."]');
    await artistFilter.click();
    await artistFilter.fill('Queen');
    await page.waitForTimeout(2_500);

    const artists = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.df-anchored .df-grid.cell.artist')).map((el) => el.textContent),
    );
    expect(artists.every((a) => a === 'Queen'), `expected only Queen, got: ${artists.join(', ')}`).toBe(true);
  });
});
