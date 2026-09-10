/**
 * @file e2e/recently-added-top-insert.spec.ts
 *
 * Prepending a record above the mounted window grows the (unmounted) content above the scroller
 * without moving `scrollTop`, which the browser reports as-is — the rows already on screen would
 * visually slide down by the inserted content's height. `useRecentlyAdded`'s `topInsertedPks`
 * (populated right before `topArcFlashTick` fires) lets df-grid.vue nudge `scrollTop` by that
 * height instead, keeping the viewport showing the same rows in the same place — first with the
 * *estimated* row height (the inserted record is never mounted, so its real height is unknown),
 * then corrected by the difference once/if that record's real height does become known.
 *
 * Measuring a tracked row's position via `getBoundingClientRect()` alone is contaminated by
 * anything that moves the grid's own position on the page (e.g. a "N records" counter label
 * changing width) — the compensation is about the row's position *within the scroller*, not its
 * absolute position in the viewport, so every check here measures relative to `.df-grid-body`'s
 * own rect, not the bare viewport. None of this can be verified in JSDOM, which has no layout
 * engine.
 */
import { expect, test } from '@playwright/test';

test.describe('recently-added top insert', () => {
  test('a row visible before the insert stays in the same place within the scroller', async ({ page }) => {
    await page.goto('/examples/incoming');
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    await page.waitForTimeout(1000);

    const bodyGrid = page.locator('.df-grid.body-grid');
    await bodyGrid.hover();
    /* eslint-disable no-await-in-loop -- each wheel dispatch must land before the next */
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(50);
    }
    /* eslint-enable no-await-in-loop */
    await page.waitForTimeout(500);

    const before = await page.evaluate(() => {
      const body = document.querySelector('.df-grid-body')!;
      const bodyRect = body.getBoundingClientRect();
      const anchored = Array.from(document.querySelectorAll('.df-anchored'));
      const visible = anchored.find((a) => {
        const card = a.querySelector('.df-grid.card[data-idx]')!;
        const r = card.getBoundingClientRect();
        return r.top >= bodyRect.top && r.bottom <= bodyRect.bottom;
      })!;
      const card = visible.querySelector('.df-grid.card[data-idx]')!;
      return { pk: (visible as HTMLElement).dataset.pk, relativeTop: card.getBoundingClientRect().top - bodyRect.top };
    });
    expect(before.pk, 'no fully-visible row found to track').toBeTruthy();

    await page.getByRole('button', { name: 'Add at top' }).click();
    await page.waitForTimeout(1000);

    const after = await page.evaluate((pk) => {
      const body = document.querySelector('.df-grid-body')!;
      const bodyRect = body.getBoundingClientRect();
      const tracked = document.querySelector(`.df-anchored[data-pk="${pk}"]`);
      const card = tracked?.querySelector('.df-grid.card[data-idx]');
      return { found: !!tracked, relativeTop: card ? card.getBoundingClientRect().top - bodyRect.top : null };
    }, before.pk);

    expect(after.found, 'the tracked row was unmounted by the insert').toBe(true);
    expect(
      Math.abs((after.relativeTop ?? Infinity) - before.relativeTop),
      `row shifted within the scroller: ${before.relativeTop} -> ${after.relativeTop}`,
    ).toBeLessThan(2);
  });
});
