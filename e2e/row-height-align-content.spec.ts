/**
 * @file e2e/row-height-align-content.spec.ts
 *
 * `.df-grid.body-grid` has a definite height of its own, so its `auto`-sized row tracks are
 * subject to CSS Grid's `align-content` default of `stretch` unless the grid overrides it (see
 * df-grid.vue): with fewer rows than the container's height needs, every row track would grow by
 * an equal share of the leftover space instead of leaving it below the last row. None of this can
 * be verified in JSDOM, which has no layout engine.
 */
import { expect, test } from '@playwright/test';

test.describe('sparse rows do not stretch to fill the container', () => {
  test('a row keeps its natural height in a container much taller than its content', async ({ page }) => {
    await page.goto('/examples/renderers');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card[data-idx="0"]', { timeout: 10_000 });

    // The demo's own container is sized in em via a static (Vue-managed) inline style, which a
    // plain DOM mutation would lose on the next re-render — an `!important` stylesheet rule wins
    // over a non-important inline style regardless. Forced far taller than its 20 rows need, so
    // any leftover space would be visible if the rows stretched into it.
    await page.addStyleTag({ content: '.df-grid.container { height: 2000px !important; }' });
    await page.waitForTimeout(300);

    const rowHeight = await page.evaluate(() => {
      const row = document.querySelector('.df-grid.card[data-idx="0"]') as HTMLElement;
      return row.getBoundingClientRect().height;
    });

    // Stretched, the leftover ~1600px would spread across 20-odd rows at ~80px extra each; the
    // real content (single line of text, default font-size) is nowhere near that tall.
    expect(rowHeight).toBeLessThan(60);
  });
});
