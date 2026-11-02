/**
 * @file e2e/horizontal-scroll.spec.ts
 *
 * A grid wider than its container scrolls horizontally as a whole: `.df-grid.container` is the
 * horizontal scroller, the header and the body are as wide as their content, and the body grid
 * scrolls only vertically. A header column therefore stays above its body column at any
 * horizontal scroll position.
 */
import { expect, test } from '@playwright/test';

import { waitForGridSettled } from './grid-settled';

test.describe('horizontal scroll', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('the header scrolls together with the body', async ({ page }) => {
    await page.goto('/examples/renderers');
    await page.waitForSelector('.df-anchored', { timeout: 10_000 });
    expect(await waitForGridSettled(page)).toBe(true);

    const result = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>('.df-grid.container')!;
      const body = container.querySelector<HTMLElement>('.df-grid-body .body-grid')!;
      container.scrollLeft = container.scrollWidth;
      const field = 'active';
      const headerCell = container.querySelector(`.df-grid.card.header .df-grid.cell.${field}`)!;
      const bodyCell = body.querySelector(`.df-anchored .df-grid.cell.${field}`)!;
      return {
        overflows: Math.max(container.scrollWidth, body.scrollWidth) > container.clientWidth,
        scrolled: container.scrollLeft,
        bodyOwnOverflow: body.scrollWidth - body.clientWidth,
        headerLeft: headerCell.getBoundingClientRect().left,
        bodyLeft: bodyCell.getBoundingClientRect().left,
      };
    });

    expect(result.overflows, 'the demo grid must be wider than a 360 px viewport').toBe(true);
    expect(result.scrolled).toBeGreaterThan(0);
    expect(result.bodyOwnOverflow).toBeLessThanOrEqual(0);
    expect(Math.abs(result.headerLeft - result.bodyLeft)).toBeLessThan(1);
  });
});
