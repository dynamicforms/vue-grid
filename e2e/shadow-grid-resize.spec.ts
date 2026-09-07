/**
 * @file e2e/shadow-grid-resize.spec.ts
 *
 * The secondary shadow grids (`df-grid.vue`'s `v-for="colsDef in uColumns.builtColumns.value"`
 * block, one `.df-grid.shadow-grid` per responsive layout candidate) each mount once, measure
 * their own natural content width via `getComputedStyle`, and record it in `shadowMeasurements`.
 * That record is a plain (non-reactive) object keyed by layout name, and each shadow grid's
 * `v-if="!shadowMeasurements[colsDef.name]"` only ever transitions from mounted to unmounted —
 * once a layout candidate has measured, its shadow grid is gone from the DOM as soon as
 * `df-grid.vue` next re-renders for any reason (mutating a plain object does not itself trigger
 * one, so exactly when that happens is not something a caller can rely on). A layout's natural
 * width is its own unconstrained text/content width, independent of the container, so nothing
 * about a resize ever gives an already-measured shadow grid a reason to remount: resizing —
 * whether within a layout's own breakpoint or across one — only re-reads the already-recorded
 * measurements (`df-grid.vue`'s `ResizeObserver` picks `bestLayout` from `shadowMeasurements` via
 * `pickBy`/`maxBy`) and, on a cross-layout resize, changes the real body grid's active layout
 * class. Real rows size themselves natively off that class and never consult a shadow grid at
 * all.
 *
 * None of this can be verified in JSDOM, which has no layout engine and gives `getComputedStyle`
 * nothing to measure. Hence a real browser.
 */

import { expect, Page, test } from '@playwright/test';

function shadowGridCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('.df-grid.shadow-grid').length);
}

// The docs site's theme registers many weight/style variants of its body font, most of which
// load lazily — only once some rendered text actually needs that particular weight — rather than
// upfront. A variant that finishes loading after this page's initial paint reflows whatever text
// uses it, which can change a shadow grid's own measured natural width (and, downstream, which
// layout the width-based picker settles on) well after the page otherwise looks settled. Waiting
// for the container's own measured width to stop moving is a direct, cause-agnostic stand-in for
// "layout has actually settled".
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

async function gotoGrid(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/examples/table');
  await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
  await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
  // Let every layout candidate's shadow grid measure.
  await page.waitForTimeout(1_500);
  await waitForStableWidth(page, '.df-grid.container');
}

function activeLayout(page: Page): Promise<string> {
  return page.evaluate(() => {
    const bodyGrid = document.querySelector('.df-grid.body-grid') as HTMLElement;
    return (bodyGrid.className.match(/\b(single-line|three-row|single-column)\b/) ?? ['?'])[0];
  });
}

async function setContainerWidth(page: Page, width: number, settleMs = 1_000) {
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

test.describe('shadow-grid — container resize', () => {
  test('a resize within the same layout never adds a shadow grid back', async ({ page }) => {
    await gotoGrid(page, 1600);
    const before = await activeLayout(page);
    const countBefore = await shadowGridCount(page);

    const width = await containerWidth(page);
    // A few px is well inside any layout's own breakpoint margin — small enough that this
    // resize cannot itself cross into a narrower layout.
    await setContainerWidth(page, width - 10);

    const after = await activeLayout(page);
    expect(after, 'test premise violated: a 10px narrowing crossed a layout breakpoint').toBe(before);
    // A shadow grid only ever goes from mounted to unmounted, never back — a within-layout
    // resize re-reads cached measurements and cannot make one reappear.
    expect(await shadowGridCount(page)).toBeLessThanOrEqual(countBefore);
  });

  test('a resize that crosses a layout breakpoint switches layout without adding a shadow grid back', async ({ page }) => {
    await gotoGrid(page, 1600);
    const countBefore = await shadowGridCount(page);

    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(1_500);
    await waitForStableWidth(page, '.df-grid.container');

    // At this width only the narrowest layout's own natural (unconstrained) content width fits —
    // the docs page's demo data measures it well clear of the others — so it is the one
    // deterministic outcome regardless of which layout happened to be active before narrowing.
    expect(await activeLayout(page)).toBe('single-column');
    expect(await shadowGridCount(page), 'a layout switch should read cached measurements, not remeasure')
      .toBeLessThanOrEqual(countBefore);
  });
});
