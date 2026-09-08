/**
 * @file e2e/scroll-integrity.spec.ts
 *
 * Browser tests for three regressions the auto-sizing suite's structural checks do not exercise,
 * because none of them are about column geometry:
 *
 *   1. A responsive layout's dedicated selection column (single-line's `_selection` field) must
 *      collapse to zero width while selection mode is inactive, not merely have its own content
 *      hidden — an empty grid track is not the same thing as a `display: none` cell inside a
 *      still-sized one.
 *
 *   2. Windowing's un-mounted-row spacers stand in for records using `estimatedRowHeight` until
 *      each record's real height is measured. A single fixed estimate shared by every responsive
 *      layout, when a layout's real row height is nothing like it, makes `recompute()` badly
 *      misjudge how many records a given scrolled distance covers — a fast scroll through
 *      still-unmeasured rows can land the mounted window far from the real viewport, so rows
 *      scrolled into view render empty until later events (and their now-accurate measurements)
 *      catch up.
 *
 *   3. CSS scroll anchoring exists to keep the same visual content in view when content *above*
 *      the viewport changes size — exactly what windowing does on every recompute as spacers
 *      resize and rows mount/unmount. Left enabled on a windowed scroller, an anchor adjustment
 *      racing an actively-scrolling user can leave the browser's own `scrollTop` stuck for
 *      several wheel ticks in a row, starving `recompute()` of the signal it needs to keep the
 *      mounted window under the viewport.
 *
 * None of this can be verified in JSDOM, which has no layout engine and never fires a real
 * `wheel` event's browser-native scroll handling. Hence a real browser.
 */

import { expect, Page, test } from '@playwright/test';

// The docs site's theme registers many weight/style variants of its body font, most of which
// load lazily — only once some rendered text actually needs that particular weight — rather than
// upfront. A variant that finishes loading after this page's initial paint reflows whatever text
// uses it, which can change a secondary shadow grid's own measured natural width, and downstream
// which responsive layout the width-based picker lands on, well after the page otherwise looks
// settled (see auto-sizing-suite.ts's identically-named helper, which this mirrors).
async function waitForStableWidth(page: Page, selector: string, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastWidth = -1;
  let stableSince = Date.now();
  // eslint-disable-next-line no-await-in-loop -- each read must follow the previous one's wait
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const width = await page.evaluate((sel) => document.querySelector(sel)?.getBoundingClientRect().width ?? -1, selector);
    if (width !== lastWidth) {
      lastWidth = width;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 400) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(100);
  }
}

async function gotoGrid(page: Page, width: number, height = 1000) {
  await page.setViewportSize({ width, height });
  await page.goto('/examples/table');
  await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
  await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
  await page.waitForTimeout(1_500);
  await waitForStableWidth(page, '.df-grid.container');
}

// Every mounted row-anchor currently intersecting the body scroller's own viewport should have
// visible field content roughly level with it — the row-anchor-claims-its-band-but-the-cells-
// land-somewhere-else signature both the anchor-offset bug (bug 2 in this file's header) and a
// badly out-of-sync windowed range (bug 3) share, whatever produced it.
async function findBlankVisibleRow(page: Page) {
  return page.evaluate(() => {
    const bodyGrid = document.querySelector('.df-grid.body-grid');
    if (!bodyGrid) return null;
    const bodyRect = bodyGrid.getBoundingClientRect();
    const anchors = Array.from(document.querySelectorAll('.df-grid.body-grid .df-grid.card[data-idx]'));
    for (const anchor of anchors) {
      const rect = anchor.getBoundingClientRect();
      if (rect.bottom < bodyRect.top || rect.top > bodyRect.bottom) continue; // not on screen
      const wrapper = anchor.parentElement;
      if (!wrapper) continue;
      const cells = wrapper.querySelectorAll('.df-grid.cell');
      const hasContentNearAnchor = Array.from(cells).some((c) => {
        const cr = c.getBoundingClientRect();
        return cr.width > 0 && Math.abs(cr.top - rect.top) < 300;
      });
      if (!hasContentNearAnchor) {
        return { idx: anchor.getAttribute('data-idx'), anchorRect: rect };
      }
    }
    return null;
  });
}

test.describe('scroll integrity', () => {
  test('single-line selection column is zero-width until selection mode is active', async ({ page }) => {
    await gotoGrid(page, 2400);
    await page.getByRole('button', { name: 'Stretch grid to window' }).click();
    await page.waitForTimeout(1_500);

    const activeLayout = await page.evaluate(
      () => (document.querySelector('.df-grid.body-grid')!.className.match(/single-line/) ?? [])[0],
    );
    expect(activeLayout, 'test premise violated: the stretched grid did not land on single-line').toBe('single-line');

    const trackBefore = await page.evaluate(
      () => Number.parseFloat(getComputedStyle(document.querySelector('.df-grid.body-grid')!).gridTemplateColumns.split(' ')[0]),
    );
    expect(trackBefore, 'selection column has width while selection mode is inactive').toBeCloseTo(0, 0);

    const firstCard = page.locator('.df-grid.body-grid .df-grid.card[data-idx]').first();
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await firstCard.boundingBox();
    if (!box) throw new Error('first mounted row-anchor has no box');
    let isSelectionActive = false;
    /* eslint-disable no-await-in-loop -- each retry must follow the previous attempt's result */
    for (let attempt = 0; attempt < 8 && !isSelectionActive; attempt++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(150);
      await page.mouse.down();
      await page.waitForTimeout(1_800);
      await page.mouse.up();
      await page.waitForTimeout(500);
      isSelectionActive = await page.evaluate(() => !!document.querySelector('.df-grid.container.selection'));
    }
    /* eslint-enable no-await-in-loop */
    expect(isSelectionActive, 'long-press did not activate selection mode after 8 attempts').toBe(true);

    const trackAfter = await page.evaluate(
      () => Number.parseFloat(getComputedStyle(document.querySelector('.df-grid.body-grid')!).gridTemplateColumns.split(' ')[0]),
    );
    expect(trackAfter, 'selection column did not widen once selection mode activated').toBeGreaterThan(5);
  });

  for (const layout of ['three-row', 'single-column'] as const) {
    test(`sustained scrolling through ${layout} never leaves a mounted row visibly blank`, async ({ page }) => {
      // three-row is the demo's default at this width; single-column needs a narrow one.
      await gotoGrid(page, layout === 'three-row' ? 1400 : 400);
      const activeLayout = await page.evaluate(
        () => (document.querySelector('.df-grid.body-grid')!.className.match(/single-line|three-row|single-column/) ?? [])[0],
      );
      expect(activeLayout, `test premise violated: did not land on ${layout}`).toBe(layout);

      await page.locator('.df-grid.container').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const bodyBox = await page.locator('.df-grid.body-grid').first().boundingBox();
      if (!bodyBox) throw new Error('body grid has no box');
      await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + bodyBox.height / 2);

      let blank: unknown = null;
      /* eslint-disable no-await-in-loop -- each wheel tick must land before the next is sent */
      for (let i = 0; i < 250 && !blank; i++) {
        await page.mouse.wheel(0, 500);
        if (i % 10 === 0) {
          blank = await findBlankVisibleRow(page);
        }
      }
      /* eslint-enable no-await-in-loop */
      expect(blank, `a visible mounted row had no field content near it: ${JSON.stringify(blank)}`).toBeNull();
    });
  }

  test('sustained scrolling keeps scrollTop advancing under continued input', async ({ page }) => {
    // three-row: the layout the freeze was originally found in.
    await gotoGrid(page, 1400);
    const activeLayout = await page.evaluate(
      () => (document.querySelector('.df-grid.body-grid')!.className.match(/three-row/) ?? [])[0],
    );
    expect(activeLayout, 'test premise violated: did not land on three-row').toBe('three-row');

    await page.locator('.df-grid.container').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const bodyBox = await page.locator('.df-grid.body-grid').first().boundingBox();
    if (!bodyBox) throw new Error('body grid has no box');
    await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + bodyBox.height / 2);

    // A real user's scroll gesture is rarely perfectly monotonic — oscillating (mostly down, a
    // little back up) both matches that and is the shape that most reliably reproduced the
    // scroll-anchoring freeze during investigation.
    let prevScrollTop = -1;
    let stuckStreak = 0;
    let maxStuckStreak = 0;
    /* eslint-disable no-await-in-loop -- each cycle's scroll must land before the next is sent */
    for (let cycle = 0; cycle < 40; cycle++) {
      for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(5); }
      for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(5); }
      const scrollTop = await page.evaluate(() => document.querySelector('.df-grid.body-grid')!.scrollTop);
      if (Math.abs(scrollTop - prevScrollTop) < 1) {
        stuckStreak += 1;
        maxStuckStreak = Math.max(maxStuckStreak, stuckStreak);
      } else {
        stuckStreak = 0;
      }
      prevScrollTop = scrollTop;
    }
    /* eslint-enable no-await-in-loop */

    // A couple of consecutive no-op cycles can legitimately happen (e.g. a wheel tick landing
    // while a throttled recompute is already mid-flight) — a long streak is the freeze signature.
    expect(maxStuckStreak, 'scrollTop stopped advancing under continued wheel input').toBeLessThan(5);
  });
});
