/**
 * @file e2e/auto-sizing-suite.ts
 *
 * The shared body of the auto-sizing browser tests. It lives in its own file because the two
 * scrollbar regimes need different browser launch options, and `test.use({ launchOptions })`
 * is only allowed at the top level of a spec file — see auto-sizing.spec.ts (overlay
 * scrollbars) and auto-sizing-classic.spec.ts (classic scrollbars).
 *
 * Browser tests for the grid's column auto-sizing geometry.
 *
 * Real rows are direct items of one shared grid (`.df-grid.body-grid`), so the browser resolves
 * their column widths natively — there is nothing to measure and copy for the body itself. The
 * header, sitting outside the body grid as a structurally separate box, still needs its columns
 * copied from the body's own resolved `grid-template-columns` via the `--grid-template-columns`
 * custom property. None of this geometry can be verified in JSDOM, which has no layout engine —
 * hence these tests.
 *
 * Two regressions are covered:
 *
 *   1. Anything absolutely positioned inside `.df-grid.container` (the per-layout secondary
 *      shadow grids, still used to pre-measure a responsive layout before it becomes active)
 *      resolves against the nearest positioned ancestor. Without `position: relative` on
 *      `.df-grid.container` that was whatever the host app happened to position (in a Vuetify
 *      app the full page width).
 *
 *   2. The header sits outside the body scroller, so it has to reserve the same space for the
 *      vertical scrollbar that the body scroller reserves. Reserving a declared amount rather
 *      than the measured one is wrong on any platform whose reservation differs from the
 *      assumption — notably overlay scrollbars, which reserve nothing.
 *
 * Both scrollbar regimes are exercised: headless Chromium/Firefox hide scrollbars by default
 * (overlay-like, 0 px reserved), and the classic-scrollbar spec re-enables them (15 px).
 */

import { expect, Page, test } from '@playwright/test';

// Sub-pixel slack: track widths are fractional, clientWidth/scrollWidth are integers.
const EPS = 1.5;

interface GridMetrics {
  scrollbarWidth: number;
  containerPosition: string;
  container: { width: number; left: number; right: number; scrollWidth: number; clientWidth: number };
  headerRow: { clientWidth: number; scrollWidth: number; right: number };
  headerContainerRight: number;
  bodyGrid: { clientWidth: number; scrollWidth: number; tracks: string };
  bodyRowClientWidth: number;
  headerTracks: string;
  activeLayout: string;
}

async function readMetrics(page: Page): Promise<GridMetrics> {
  return page.evaluate(() => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    const headerContainer = document.querySelector('.df-grid.header-container') as HTMLElement;
    const headerRow = document.querySelector('.df-grid.card.header') as HTMLElement;
    const bodyGridEl = document.querySelector('.df-grid.body-grid') as HTMLElement;
    // A mounted row-anchor, not the shared grid container itself: the anchor carries the same
    // decorative border the header row does, so its clientWidth is directly comparable to the
    // header's — the container has no border of its own, so comparing against it directly would
    // be off by the border width for no meaningful reason.
    const bodyRow = document.querySelector('.df-grid.card[data-idx]') as HTMLElement;

    const box = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        width: r.width,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      };
    };

    return {
      scrollbarWidth: bodyGridEl.offsetWidth - bodyGridEl.clientWidth,
      containerPosition: getComputedStyle(container).position,
      container: box(container),
      headerRow: box(headerRow),
      headerContainerRight: headerContainer.getBoundingClientRect().right - headerContainer.clientLeft
        - (headerContainer.offsetWidth - headerContainer.clientWidth),
      bodyGrid: {
        clientWidth: bodyGridEl.clientWidth,
        scrollWidth: bodyGridEl.scrollWidth,
        tracks: getComputedStyle(bodyGridEl).gridTemplateColumns,
      },
      bodyRowClientWidth: bodyRow.clientWidth,
      headerTracks: getComputedStyle(headerRow).gridTemplateColumns,
      // The responsive layout in the demo is a CSS class the grid puts on the shared body grid.
      activeLayout: (bodyGridEl.className.match(/\b(single-line|three-row|single-column)\b/) ?? ['?'])[0],
    } as any;
  });
}

async function expectGridConsistent(page: Page, label: string) {
  const m = await readMetrics(page);

  // The containing block for the (absolutely positioned) secondary shadow grids is the grid
  // container itself, not some outer positioned ancestor.
  expect(m.containerPosition, `${label}: .df-grid.container is not position:relative`).toBe('relative');

  // Nothing overflows horizontally: not the grid, not the shared body grid, not the header row.
  expect(m.container.scrollWidth, `${label}: container overflows`)
    .toBeLessThanOrEqual(m.container.clientWidth + EPS);
  expect(m.bodyGrid.scrollWidth, `${label}: body grid overflows its own track list`)
    .toBeLessThanOrEqual(m.bodyGrid.clientWidth + EPS);
  expect(m.headerRow.scrollWidth, `${label}: header row overflows its track list`)
    .toBeLessThanOrEqual(m.headerRow.clientWidth + EPS);
  expect(m.headerRow.right, `${label}: header row overflows the header container`)
    .toBeLessThanOrEqual(m.headerContainerRight + EPS);

  // Header and body resolve to the same pixel track list, which is what makes the columns line
  // up: the header's --grid-template-columns is copied straight from the body grid's own native
  // computed style.
  expect(m.headerTracks, `${label}: header/body track lists differ`).toBe(m.bodyGrid.tracks);
  expect(m.headerRow.clientWidth, `${label}: header/body content widths differ`)
    .toBeCloseTo(m.bodyRowClientWidth, 0);

  return m;
}

// The docs site's theme registers many weight/style variants of its body font, most of which
// load lazily — only once some rendered text actually needs that particular weight — rather than
// upfront. A variant that finishes loading after this page's initial paint reflows whatever text
// uses it, which can change a shadow grid's own measured natural width (and, downstream, which
// layout the width-based picker settles on) well after `document.fonts.ready` first resolves.
// Waiting for the container's own measured width to stop moving is a direct, cause-agnostic
// stand-in for "layout has actually settled" — cheaper and more robust than trying to name every
// specific thing that can still be in flight.
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

async function gotoGrid(page: Page) {
  await page.goto('/examples/table');
  await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
  await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
  // Let the measure → copy → re-measure round trip settle.
  await page.waitForTimeout(1_500);
  await waitForStableWidth(page, '.df-grid.container');
}

export function autoSizingSuite(mode: string, expectScrollbar: (width: number) => void) {
  test(`[${mode}] scrollbar reservation is measurable`, async ({ page }) => {
    await gotoGrid(page);
    const m = await readMetrics(page);
    expectScrollbar(m.scrollbarWidth);
  });

  test(`[${mode}] geometry holds after initial render`, async ({ page }) => {
    await gotoGrid(page);
    await expectGridConsistent(page, mode);
  });

  test(`[${mode}] geometry holds across viewport widths`, async ({ page }) => {
    await gotoGrid(page);

    /* eslint-disable no-await-in-loop -- each width must settle before the next one is applied */
    for (const width of [1600, 1280, 900, 700, 500]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(1_000);
      await waitForStableWidth(page, '.df-grid.container');
      await expectGridConsistent(page, `${mode} @ ${width}`);
    }
    /* eslint-enable no-await-in-loop */
  });

  test(`[${mode}] narrowing the viewport switches to a narrower layout`, async ({ page }) => {
    await gotoGrid(page);
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.waitForTimeout(1_000);
    await waitForStableWidth(page, '.df-grid.container');
    const wide = await expectGridConsistent(page, `${mode} wide`);

    // Secondary shadow grids only measure once each (see the comment above the secondary
    // shadow-grid block in df-grid.vue) — an intermediate resize gives every one of them a
    // resizeObserver tick to have measured by the time the final, narrowest width is checked,
    // rather than relying on a single jump landing after all of them happened to finish.
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(1_000);

    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(1_500);
    await waitForStableWidth(page, '.df-grid.container');
    const narrow = await expectGridConsistent(page, `${mode} narrow`);

    expect(narrow.activeLayout, 'layout did not adapt to the narrower container')
      .not.toBe(wide.activeLayout);
  });

  test(`[${mode}] entering selection mode keeps the columns consistent`, async ({ page }) => {
    await gotoGrid(page);

    const firstCard = page.locator('.df-grid.card[data-idx]').first();
    await firstCard.dispatchEvent('pointerdown');
    await page.waitForTimeout(800);
    await firstCard.dispatchEvent('pointerup');
    await page.waitForTimeout(1_000);

    await expectGridConsistent(page, `${mode} selection`);
  });
}
