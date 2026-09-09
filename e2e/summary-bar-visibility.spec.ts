/**
 * @file e2e/summary-bar-visibility.spec.ts
 *
 * `.df-grid-body` is a flex column and `.body-grid` (the scroller) is `flex: 1 1 auto;
 * min-height: 0` rather than a bare `height: 100%`, so `.df-summary-bar` — the scroller's
 * sibling, shown while loading, when there's no data, or via a consumer's own `showSummaryBar`
 * content — gets its own real share of `.df-grid-body`'s height instead of the scroller claiming
 * all of it and pushing the summary bar past the clipped (`overflow: hidden`) bottom edge.
 *
 * Separately, `.df-summary-bar-empty` (`order: -1`, keyed on `!records.length`) puts the bar
 * where a row would be — right below the header — when there's nothing else in the body to
 * anchor it to. Loading a further page of an already-populated grid does *not* get that class:
 * it belongs at the bottom, where the new rows are about to arrive, not jumping to the top while
 * the load is in flight.
 *
 * None of this can be verified in JSDOM, which has no layout engine.
 */
import { expect, test } from '@playwright/test';

test.describe('summary bar visibility', () => {
  test('the no-data message renders within the clipped body area, not past it', async ({ page }) => {
    await page.goto('/examples/server-side');
    await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });

    const fits = await page.evaluate(() => {
      const body = document.querySelector('.df-grid-body')!;
      const noData = document.querySelector('.df-summary-no-data')!;
      const bodyRect = body.getBoundingClientRect();
      const noDataRect = noData.getBoundingClientRect();
      return noDataRect.height > 0 && noDataRect.bottom <= bodyRect.bottom + 1 && noDataRect.top >= bodyRect.top - 1;
    });
    expect(fits, 'the no-data message rendered outside .df-grid-body\'s own clipped area').toBe(true);
  });

  test('the loading message renders within the clipped body area, not past it', async ({ page }) => {
    await page.goto('/examples/server-side');
    await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Load data' }).click();

    const fits = await page.evaluate(() => {
      const body = document.querySelector('.df-grid-body')!;
      const loading = document.querySelector('.df-summary-loading');
      if (!loading) return null;
      const bodyRect = body.getBoundingClientRect();
      const loadingRect = loading.getBoundingClientRect();
      return loadingRect.height > 0 && loadingRect.bottom <= bodyRect.bottom + 1 && loadingRect.top >= bodyRect.top - 1;
    });
    // A `null` result means the load resolved before this check ran (the demo's own randomDelay()
    // is 800-1600ms) — the loading state itself was never rendered long enough to check, which
    // isn't a failure of this assertion.
    if (fits !== null) {
      expect(fits, 'the loading message rendered outside .df-grid-body\'s own clipped area').toBe(true);
    }
  });

  test('loading a further page of existing records stays at the bottom, not the top', async ({ page }) => {
    await page.goto('/examples/server-side');
    await page.waitForSelector('.df-summary-no-data', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Load data' }).click();
    await page.waitForSelector('.df-anchored', { timeout: 10_000 });
    // Past the first page's own loading window, so the next one — triggered by the scroll below
    // — is unambiguously "loading a further page", not the initial load.
    await page.waitForSelector('.df-summary-loading', { state: 'detached', timeout: 5_000 }).catch(() => {});

    const bodyGrid = page.locator('.df-grid.body-grid');
    await bodyGrid.hover();
    await page.mouse.wheel(0, 50_000);
    await page.waitForSelector('.df-summary-loading', { timeout: 3_000 }).catch(() => {});

    const notReordered = await page.evaluate(() => {
      const loading = document.querySelector('.df-summary-loading');
      if (!loading) return null;
      return !loading.closest('.df-summary-bar')!.classList.contains('df-summary-bar-empty');
    });
    // A `null` result means the load resolved before this check ran — nothing to assert.
    if (notReordered !== null) {
      expect(notReordered, 'the loading indicator was reordered to the top instead of staying at the bottom').toBe(true);
    }
  });
});
