/**
 * @file e2e/shadow-grid-resize.spec.ts
 *
 * On a container resize (`df-grid.vue`'s ResizeObserver), the shadow grid is re-measured via
 * `shadowRef.value?.reMeasure()`, which calls `checkShadowGridColumns()` — a pure
 * `getComputedStyle` read off the already-mounted shadow DOM. Nothing in that path touches a
 * reactive prop the shadow grid's `v-for` depends on (`records`, `columns`, `count`, `offset`),
 * so as long as the resize does not cross a responsive-layout breakpoint, Vue has no reason to
 * re-render it: the existing `grid-card` nodes are reused and only read from.
 *
 * A resize that does cross a breakpoint is a different story: the ResizeObserver callback
 * picks a new `bestLayout` and emits `update:activeColumns`, which changes the `:columns` prop
 * passed into the shadow grid. That prop change is what triggers the re-render — not the
 * resize by itself — and the shadow grid (and every real row) is rebuilt for the new column
 * set, same as it would be if `active-columns` were changed programmatically.
 *
 * The docs page hosting `/examples/table` has its own responsive chrome (a VitePress sidebar
 * that appears/disappears across certain viewport widths), which makes the grid container's
 * actual width a non-monotonic function of the browser viewport width. The same-layout case
 * below therefore narrows `.df-grid.container` directly by a few pixels rather than resizing
 * the viewport — from the ResizeObserver's point of view this is identical to a window resize
 * (it only ever sees the container's own contentRect), and it sidesteps the sidebar entirely.
 *
 * A layout's breakpoint is measured text width (`df-grid.vue`'s `shadowMeasurements`), which
 * shifts by a few pixels between rendering engines and font sets. A fixed starting width can
 * therefore land close enough to the breakpoint that narrowing by a few pixels crosses it — so
 * the same-layout case finds its breakpoint live, by binary-searching the container width in
 * this browser, and only then narrows from a point with a safety margin above it.
 *
 * None of this can be verified in JSDOM, which has no layout engine and gives
 * `getComputedStyle` nothing to measure. Hence a real browser.
 */

import { expect, Page, test } from '@playwright/test';

// `checkShadowGridColumns()` (helpers/shadow-grid.vue) measures by calling
// `getComputedStyle` on the shadow grid's own container element. Counting those calls is a
// direct probe for "did a re-measurement happen" that does not depend on the measured pixel
// values actually changing — columns whose content is unaffected by the extra width can
// legitimately re-measure to the same numbers.
async function trackShadowMeasureCalls(page: Page) {
  await page.addInitScript(() => {
    (window as any).__shadowMeasureCalls = 0;
    const orig = window.getComputedStyle;
    window.getComputedStyle = ((el: Element, ...rest: any[]) => {
      if (el instanceof Element && el.classList.contains('shadow-grid')) (window as any).__shadowMeasureCalls++;
      return orig.call(window, el, ...rest);
    }) as typeof window.getComputedStyle;
  });
}

async function gotoGrid(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/examples/table');
  await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
  await page.waitForSelector('.df-grid.dynamic-scroller-item .df-grid.card', { timeout: 10_000 });
  await page.waitForSelector('.df-grid.shadow-grid', { timeout: 10_000, state: 'attached' });
  // Let the measure -> copy -> re-measure round trip settle.
  await page.waitForTimeout(1_500);
}

async function watchShadowMutations(page: Page) {
  await page.evaluate(() => {
    (window as any).__shadowMutations = { added: 0, removed: 0 };
    const shadow = document.querySelector('.df-grid.shadow-grid') as HTMLElement;
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        (window as any).__shadowMutations.added += r.addedNodes.length;
        (window as any).__shadowMutations.removed += r.removedNodes.length;
      }
    });
    obs.observe(shadow, { childList: true, subtree: true });
    (window as any).__shadowObserver = obs;
  });
}

async function collectWatchers(page: Page) {
  return page.evaluate(() => {
    (window as any).__shadowObserver?.disconnect();
    return {
      mutations: (window as any).__shadowMutations as { added: number; removed: number },
      measureCalls: (window as any).__shadowMeasureCalls as number | undefined,
    };
  });
}

async function trackedColumns(page: Page) {
  return page.evaluate(() => {
    const bodyRow = document.querySelector('.df-grid.dynamic-scroller-item .df-grid.card') as HTMLElement;
    return {
      tracks: getComputedStyle(bodyRow).gridTemplateColumns,
      layout: (bodyRow.className.match(/\b(single-line|three-row|single-column)\b/) ?? ['?'])[0],
    };
  });
}

async function setContainerWidth(page: Page, width: number, settleMs = 500) {
  await page.evaluate((w) => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    container.style.setProperty('width', `${w}px`, 'important');
    container.style.setProperty('flex', 'none', 'important');
  }, width);
  await page.waitForTimeout(settleMs);
}

async function containerWidth(page: Page): Promise<number> {
  return page.evaluate(
    () => (document.querySelector('.df-grid.container') as HTMLElement).getBoundingClientRect().width,
  );
}

// Binary-searches the container width down from `startWidth` (known to select `targetLayout`)
// to the narrowest width that still does, i.e. `targetLayout`'s own breakpoint in this browser.
async function findLayoutBreakpoint(page: Page, startWidth: number, targetLayout: string): Promise<number> {
  let lo = 100; // narrow enough to select a different (narrower) layout than any real breakpoint
  let hi = startWidth;
  while (hi - lo > 2) {
    const mid = Math.round((lo + hi) / 2);
    // eslint-disable-next-line no-await-in-loop
    await setContainerWidth(page, mid, 300);
    // eslint-disable-next-line no-await-in-loop
    const { layout } = await trackedColumns(page);
    if (layout === targetLayout) hi = mid; else lo = mid;
  }
  return hi;
}

test.describe('shadow-grid — container resize', () => {
  test('a resize within the same layout re-measures but does not recreate the shadow grid\'s cards', async ({ page }) => {
    await trackShadowMeasureCalls(page);
    await gotoGrid(page, 1600);
    const targetLayout = (await trackedColumns(page)).layout;

    const NARROW_BY = 10;
    const SAFETY_MARGIN = 60; // several times NARROW_BY, so the narrow below cannot reach the breakpoint
    const breakpoint = await findLayoutBreakpoint(page, await containerWidth(page), targetLayout);
    await setContainerWidth(page, breakpoint + SAFETY_MARGIN, 1_500);
    const before = await trackedColumns(page);
    expect(before.layout, 'could not find a starting width safely inside the layout under test').toBe(targetLayout);

    await watchShadowMutations(page);
    await page.evaluate(() => { (window as any).__shadowMeasureCalls = 0; });

    // Narrow the container itself by 10px — small enough to stay inside the current
    // responsive layout, but a real geometry change the ResizeObserver must react to.
    await setContainerWidth(page, breakpoint + SAFETY_MARGIN - NARROW_BY, 1_500);

    const { mutations, measureCalls } = await collectWatchers(page);
    const after = await trackedColumns(page);

    console.log(
      `[same-layout resize] layout before/after: "${before.layout}"/"${after.layout}", `
      + `shadow-grid mutations: +${mutations.added}/-${mutations.removed}, `
      + `measure calls: ${measureCalls}, `
      + `tracks before/after: "${before.tracks}" -> "${after.tracks}"`,
    );

    expect(after.layout, 'test premise violated: the resize crossed a layout breakpoint').toBe(before.layout);

    // The measurement did happen: the shadow grid's own element was measured at least once.
    expect(measureCalls, 'the shadow grid was never re-measured after the resize').toBeGreaterThan(0);

    // But the shadow grid itself was not re-rendered: no nodes added or removed.
    expect(mutations.added, `${mutations.added} nodes were added inside the shadow grid on resize`).toBe(0);
    expect(mutations.removed, `${mutations.removed} nodes were removed inside the shadow grid on resize`).toBe(0);
  });

  test('a resize that crosses a layout breakpoint does rebuild the shadow grid', async ({ page }) => {
    // 1600 -> 480 is chosen to force a different active layout (verified in this test) — the
    // rebuild here is attributed to the column-set change that rides along with the resize,
    // not to the resize itself.
    await gotoGrid(page, 1600);
    const before = await trackedColumns(page);

    await watchShadowMutations(page);

    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(1_500);

    const { mutations } = await collectWatchers(page);
    const after = await trackedColumns(page);

    console.log(
      `[cross-layout resize] layout before/after: "${before.layout}"/"${after.layout}", `
      + `shadow-grid mutations: +${mutations.added}/-${mutations.removed}`,
    );

    expect(after.layout, 'test premise violated: the resize did not cross a layout breakpoint').not.toBe(before.layout);
    expect(mutations.added, 'expected the shadow grid to be rebuilt for the new column set').toBeGreaterThan(0);
  });
});
