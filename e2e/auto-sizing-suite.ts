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
 * Column widths are never resolved by the browser on the real rows. The shadow grid is
 * measured, its computed `grid-template-columns` is read in pixels, and that pixel list is
 * copied onto every real row through the `--grid-template-columns` custom property. The
 * whole layout is therefore only as correct as the box the shadow was measured in — and
 * none of that can be verified in JSDOM, which has no layout engine. Hence these tests.
 *
 * Two regressions are covered:
 *
 *   1. The shadow grid is `position: absolute; left: 0; right: 0`, so it resolves against the
 *      nearest positioned ancestor. Without `position: relative` on `.df-grid.container` that
 *      was whatever the host app happened to position (in a Vuetify app the full page width),
 *      and the columns measured there were copied onto rows only as wide as the container.
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
  container: { width: number; left: number; right: number; scrollWidth: number; clientWidth: number };
  shadow: { left: number; right: number };
  headerRow: { clientWidth: number; scrollWidth: number; right: number; tracks: string };
  headerContainerRight: number;
  bodyRow: { clientWidth: number; scrollWidth: number; right: number; tracks: string };
  activeLayout: string;
}

async function readMetrics(page: Page): Promise<GridMetrics> {
  return page.evaluate(() => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    const shadow = document.querySelector('.df-grid.shadow-grid') as HTMLElement;
    const headerContainer = document.querySelector('.df-grid.header-container') as HTMLElement;
    const headerRow = document.querySelector('.df-grid.card.header') as HTMLElement;
    const bodyRow = document.querySelector('.df-grid.dynamic-scroller-item .df-grid.card') as HTMLElement;
    const scroller = document.querySelector('.df-grid-body .virtual-scroll-container') as HTMLElement;

    const box = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        width: r.width,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        tracks: getComputedStyle(el).gridTemplateColumns,
      };
    };

    return {
      scrollbarWidth: scroller.offsetWidth - scroller.clientWidth,
      container: box(container),
      shadow: box(shadow),
      headerRow: box(headerRow),
      headerContainerRight: headerContainer.getBoundingClientRect().right - headerContainer.clientLeft
        - (headerContainer.offsetWidth - headerContainer.clientWidth),
      bodyRow: box(bodyRow),
      // The responsive layout in the demo is a CSS class the grid puts on every card.
      activeLayout: (bodyRow.className.match(/\b(single-line|three-row|single-column)\b/) ?? ['?'])[0],
    } as any;
  });
}

async function expectGridConsistent(page: Page, label: string) {
  const m = await readMetrics(page);

  // The shadow measures inside the grid container, not inside some outer positioned ancestor.
  expect(m.shadow.left, `${label}: shadow left edge`).toBeCloseTo(m.container.left, 0);
  expect(m.shadow.right, `${label}: shadow right edge`).toBeCloseTo(m.container.right, 0);

  // Nothing overflows horizontally: not the grid, not a body row, not the header row.
  expect(m.container.scrollWidth, `${label}: container overflows`)
    .toBeLessThanOrEqual(m.container.clientWidth + EPS);
  expect(m.bodyRow.scrollWidth, `${label}: body row overflows its track list`)
    .toBeLessThanOrEqual(m.bodyRow.clientWidth + EPS);
  expect(m.headerRow.scrollWidth, `${label}: header row overflows its track list`)
    .toBeLessThanOrEqual(m.headerRow.clientWidth + EPS);
  expect(m.headerRow.right, `${label}: header row overflows the header container`)
    .toBeLessThanOrEqual(m.headerContainerRight + EPS);

  // Header and body get the same tracks in the same space, which is what makes the
  // columns line up: same track list, same content width.
  expect(m.headerRow.tracks, `${label}: header/body track lists differ`).toBe(m.bodyRow.tracks);
  expect(m.headerRow.clientWidth, `${label}: header/body content widths differ`)
    .toBeCloseTo(m.bodyRow.clientWidth, 0);

  return m;
}

async function gotoGrid(page: Page) {
  await page.goto('/examples/table');
  await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
  await page.waitForSelector('.df-grid.dynamic-scroller-item .df-grid.card', { timeout: 10_000 });
  // Let the measure → copy → re-measure round trip settle.
  await page.waitForTimeout(1_500);
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
      await expectGridConsistent(page, `${mode} @ ${width}`);
    }
    /* eslint-enable no-await-in-loop */
  });

  test(`[${mode}] narrowing the viewport switches to a narrower layout`, async ({ page }) => {
    await gotoGrid(page);
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.waitForTimeout(1_000);
    const wide = await expectGridConsistent(page, `${mode} wide`);

    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(1_500);
    const narrow = await expectGridConsistent(page, `${mode} narrow`);

    expect(narrow.activeLayout, 'layout did not adapt to the narrower container')
      .not.toBe(wide.activeLayout);
  });

  test(`[${mode}] entering selection mode keeps the columns consistent`, async ({ page }) => {
    await gotoGrid(page);

    const firstCard = page.locator('.df-grid.dynamic-scroller-item .df-grid.card').first();
    await firstCard.dispatchEvent('pointerdown');
    await page.waitForTimeout(800);
    await firstCard.dispatchEvent('pointerup');
    await page.waitForTimeout(1_000);

    await expectGridConsistent(page, `${mode} selection`);
  });
}
