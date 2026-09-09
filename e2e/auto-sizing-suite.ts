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
  headerBorderWidth: number;
  containerPosition: string;
  container: { width: number; left: number; right: number; scrollWidth: number; clientWidth: number };
  headerRow: { clientWidth: number; scrollWidth: number; right: number };
  headerContainerRight: number;
  bodyGrid: { clientWidth: number; scrollWidth: number; tracks: string };
  bodyRowOuterWidth: number;
  headerTracks: string;
  activeLayout: string;
  headerCellLefts: number[];
  bodyCellLefts: number[];
}

async function readMetrics(page: Page): Promise<GridMetrics> {
  return page.evaluate(() => {
    const container = document.querySelector('.df-grid.container') as HTMLElement;
    const headerContainer = document.querySelector('.df-grid.header-container') as HTMLElement;
    const headerRow = document.querySelector('.df-grid.card.header') as HTMLElement;
    const bodyGridEl = document.querySelector('.df-grid.body-grid') as HTMLElement;
    // A mounted row-anchor, not the shared grid container itself. Scoped to `.body-grid`
    // specifically — the header row also carries `data-idx` (its value is the string "header"),
    // and sits before the body in document order, so an unscoped `[data-idx]` query matches it
    // instead.
    const bodyRow = document.querySelector('.df-grid.body-grid .df-grid.card[data-idx]') as HTMLElement;

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
      // The header row is both the bordered decorative box and the grid container that receives
      // the copied `--grid-template-columns` in one element — unlike a real row, whose border
      // lives on a row-anchor that is an item *inside* the (borderless) body grid, not the
      // container the copied track list has to fit inside. That track list was sized against the
      // body grid's own (border-free) clientWidth, so on the header it can legitimately overflow
      // by exactly the header's own border width.
      headerBorderWidth: headerRow.offsetWidth - headerRow.clientWidth,
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
      // The row-anchor's own outer width, not its border-reduced clientWidth: the anchor spans
      // the full row via `grid-column: 1 / -1`, so its offsetWidth is the row's full width, the
      // same thing the header's clientWidth measures now that the header uses a box-model-free
      // `outline` for its own border look instead of a `border` that would eat into it (see the
      // comment on the header/filter `outline` CSS rule in table-basic.vue).
      bodyRowOuterWidth: bodyRow.offsetWidth,
      headerTracks: getComputedStyle(headerRow).gridTemplateColumns,
      // The responsive layout in the demo is a CSS class the grid puts on the shared body grid.
      activeLayout: (bodyGridEl.className.match(/\b(single-line|three-row|single-column)\b/) ?? ['?'])[0],
      // Per-field left edges, header vs. a real row's own wrapper — comparing these pairwise
      // catches columns that drift out of alignment further right than a coarser clientWidth or
      // aggregate-track-list comparison would (each is only ever off by its own field's rounding,
      // not by every field before it accumulated).
      headerCellLefts: Array.from(headerRow.querySelectorAll('.df-grid.cell')).map(
        (c) => c.getBoundingClientRect().left,
      ),
      bodyCellLefts: Array.from((bodyRow.parentElement as HTMLElement).querySelectorAll('.df-grid.cell')).map(
        (c) => c.getBoundingClientRect().left,
      ),
    } as any;
  });
}

// `readMetrics` right after a resize can catch the header mid-sync: `syncHeaderColumns` is
// throttled (100ms) independently of `waitForStableWidth`'s own settle window, which only tracks
// the *container's* width, not whether the header has actually re-read the body's latest
// `grid-template-columns` yet. Polling for the header's own first field to have caught up with
// the body's is a direct, cause-agnostic proxy for "the sync throttle has actually fired" — far
// cheaper than teaching every call site its own extra wait. It also requires the header and body
// to report the *same active layout class* before trusting a field-position match: a resize can
// still be mid-switch between two responsive layouts, and a header field that happens to land on
// the same pixel a differently-named body field currently occupies would otherwise read as
// "synced" by coincidence. Both conditions have to hold on two checks 100ms apart (bridging the
// sync throttle's own window), not just once, so a match that is itself about to be superseded by
// another in-flight switch doesn't pass prematurely.
async function waitForHeaderBodySync(page: Page, timeoutMs = 3_000) {
  const check = () => page.evaluate(() => {
    const bodyGridEl = document.querySelector('.df-grid.body-grid');
    const headerRow = document.querySelector('.df-grid.card.header');
    const bodyRow = document.querySelector('.df-grid.body-grid .df-grid.card[data-idx]');
    if (!bodyGridEl || !headerRow || !bodyRow) return false;
    const layoutOf = (el: Element) => (el.className.match(/\b(single-line|three-row|single-column)\b/) ?? ['?'])[0];
    if (layoutOf(bodyGridEl) !== layoutOf(headerRow)) return false;
    const headerCell = headerRow.querySelector('.df-grid.cell');
    const bodyCell = bodyRow.parentElement?.querySelector('.df-grid.cell');
    if (!headerCell || !bodyCell) return false;
    return Math.abs(headerCell.getBoundingClientRect().left - bodyCell.getBoundingClientRect().left) < 1;
  });

  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-await-in-loop -- each check must follow the previous one's wait
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    if (await check()) {
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(100);
      // eslint-disable-next-line no-await-in-loop
      if (await check()) return;
    }
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(50);
  }
}

async function expectGridConsistent(page: Page, label: string) {
  await waitForHeaderBodySync(page);
  const m = await readMetrics(page);

  // The containing block for the (absolutely positioned) secondary shadow grids is the grid
  // container itself, not some outer positioned ancestor.
  expect(m.containerPosition, `${label}: .df-grid.container is not position:relative`).toBe('relative');

  // Nothing overflows horizontally: not the grid, not the shared body grid, not the header row.
  expect(m.container.scrollWidth, `${label}: container overflows`)
    .toBeLessThanOrEqual(m.container.clientWidth + EPS);
  expect(m.bodyGrid.scrollWidth, `${label}: body grid overflows its own track list`)
    .toBeLessThanOrEqual(m.bodyGrid.clientWidth + EPS);
  // The copied track list was sized against the body grid's own border-free clientWidth, so on
  // the header — which is itself the bordered box — it can overflow by exactly the header's own
  // border width without that being a real layout bug (see the headerBorderWidth comment above).
  expect(m.headerRow.scrollWidth, `${label}: header row overflows its track list`)
    .toBeLessThanOrEqual(m.headerRow.clientWidth + m.headerBorderWidth + EPS);
  expect(m.headerRow.right, `${label}: header row overflows the header container`)
    .toBeLessThanOrEqual(m.headerContainerRight + EPS);

  // Header and body resolve to (within sub-pixel rounding) the same pixel track list, which is
  // what makes the columns line up: the header's --grid-template-columns is copied straight from
  // the body grid's own native computed style. The two can still round to slightly different
  // used values — the same explicit px list, laid out inside two different boxes, is not
  // guaranteed to resolve to bit-identical values once the engine's own track-sizing algorithm
  // reconciles it against each box's actual available width.
  const headerTrackValues = m.headerTracks.split(' ').map(Number.parseFloat);
  const bodyTrackValues = m.bodyGrid.tracks.split(' ').map(Number.parseFloat);
  expect(headerTrackValues.length, `${label}: header/body track counts differ`).toBe(bodyTrackValues.length);
  headerTrackValues.forEach((v, i) => {
    expect(v, `${label}: header/body track ${i} differs`).toBeCloseTo(bodyTrackValues[i], 1);
  });
  expect(m.headerRow.clientWidth, `${label}: header/body content widths differ`)
    .toBeCloseTo(m.bodyRowOuterWidth, 0);

  // Per-field alignment: each header cell's left edge against the corresponding field's left
  // edge in a real row. A regression that puts the header a few pixels off (its own border
  // eating into the copied track list's assumed width, say) shows up here as every field being
  // off by roughly the same amount, growing most visibly toward the last column — exactly the
  // symptom a coarser aggregate-width comparison can miss if it happens to still fall inside a
  // generous tolerance.
  expect(m.headerCellLefts.length, `${label}: header/body field counts differ`).toBe(m.bodyCellLefts.length);
  m.headerCellLefts.forEach((left, i) => {
    expect(left, `${label}: field ${i}'s header/body left edges differ`).toBeCloseTo(m.bodyCellLefts[i], 0);
  });

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
    await page.waitForTimeout(1_500);
    await waitForStableWidth(page, '.df-grid.container');
    const wide = await expectGridConsistent(page, `${mode} wide`);

    // Secondary shadow grids only measure once each (see the comment above the secondary
    // shadow-grid block in df-grid.vue) — an intermediate resize gives every one of them a
    // resizeObserver tick to have measured by the time the final, narrowest width is checked,
    // rather than relying on a single jump landing after all of them happened to finish.
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(1_000);

    await page.setViewportSize({ width: 400, height: 800 });
    await page.waitForTimeout(1_500);
    await waitForStableWidth(page, '.df-grid.container');
    const narrow = await expectGridConsistent(page, `${mode} narrow`);

    // Rarely, in Firefox, a still-lazily-loading font variant (see `waitForStableWidth`) shifts a
    // shadow grid's measured width right as this resize settles, landing `wide` on the same
    // layout `narrow` picks too — a flake in this width-picking race, not the geometry checks
    // above, which already passed for both widths.
    expect(narrow.activeLayout, 'layout did not adapt to the narrower container')
      .not.toBe(wide.activeLayout);
  });

  test(`[${mode}] entering selection mode keeps the columns consistent`, async ({ page }) => {
    await gotoGrid(page);
    // Pinned wide enough to guarantee three-row specifically, since this test exercises its own
    // long-press/selection handling — the project's default viewport isn't guaranteed to land there.
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.waitForTimeout(1_500);
    await waitForStableWidth(page, '.df-grid.container');

    // Scoped to `.body-grid` — an unscoped `[data-idx]` query matches the header row first (its
    // own `data-idx` is the string "header"). The `longpress` directive only listens for
    // `mousedown`/`touchstart` (see `helpers/longpress.ts`), so the gesture has to go through
    // `page.mouse`, not a dispatched `pointerdown`/`pointerup` pair.
    const firstCard = page.locator('.df-grid.body-grid .df-grid.card[data-idx]').first();
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200); // let the scroll itself settle before reading a box off it
    const box = await firstCard.boundingBox();
    if (!box) throw new Error('first mounted row-anchor has no box');

    // Not asserted on the first attempt: on a busy machine a synthetic 1000ms-threshold hold can
    // occasionally miss its window for reasons that have nothing to do with the grid (a paused
    // event loop delays when the timer's callback actually runs, same as it would delay a real
    // user's own hold), and re-pressing after that is indistinguishable from a real user trying
    // again. The geometry check below is the point of this test; retrying the gesture just gets
    // it into the state that check needs.
    let isSelectionActive = false;
    /* eslint-disable no-await-in-loop -- each retry must follow the previous attempt's result */
    for (let attempt = 0; attempt < 8 && !isSelectionActive; attempt++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(150);
      await page.mouse.down();
      await page.waitForTimeout(1_800); // longpress.ts's default threshold is 1000ms
      await page.mouse.up();
      await page.waitForTimeout(500);
      isSelectionActive = await page.evaluate(() => !!document.querySelector('.df-grid.container.selection'));
    }
    /* eslint-enable no-await-in-loop */

    expect(isSelectionActive, `${mode}: long-press did not activate selection mode after 8 attempts`).toBe(true);

    await expectGridConsistent(page, `${mode} selection`);
  });
}
