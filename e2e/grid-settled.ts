/**
 * @file e2e/grid-settled.ts
 *
 * Waits on the grid's own state instead of fixed delays.
 *
 * The grid is settled once, for `quietMs` in a row, nothing inside `.df-grid.container` has
 * mutated, none of the container, body grid or header has changed size, and no font face is
 * loading. The docs site's theme loads most weight/style variants of its body font lazily, once
 * some rendered text needs them; a variant that finishes after the initial paint reflows the text
 * using it, which changes the shadow grids' measured widths and, downstream, the responsive
 * layout the width-based picker selects. The quiet window spans the grid's 100 ms throttles
 * (`syncHeaderColumns`, `onBodyScrollSettle`), so a trailing call still pending counts as activity.
 */

import { Locator, Page } from '@playwright/test';

/**
 * Resolves `true` once the grid is settled, or `false` once `timeoutMs` has passed without it.
 * A grid that never settles is what the render-loop tests measure, so running out of time is not
 * an error here; callers that need the settled state assert on the result.
 */
export function waitForGridSettled(page: Page, { quietMs = 300, timeoutMs = 10_000 } = {}): Promise<boolean> {
  return page.evaluate(({ quiet, timeout }) => new Promise<boolean>((resolve) => {
    const start = performance.now();
    let lastActivity = start;
    const touch = () => { lastActivity = performance.now(); };

    const container = document.querySelector('.df-grid.container');
    const mutations = new MutationObserver(touch);
    const resizes = new ResizeObserver(touch);
    if (container) {
      mutations.observe(container, { childList: true, subtree: true, attributes: true, characterData: true });
      ['.df-grid.container', '.df-grid.body-grid', '.df-grid.card.header'].forEach((selector) => {
        const el = document.querySelector(selector);
        if (el) resizes.observe(el);
      });
    }
    document.fonts.addEventListener('loading', touch);
    document.fonts.addEventListener('loadingdone', touch);

    const finish = (settled: boolean) => {
      mutations.disconnect();
      resizes.disconnect();
      document.fonts.removeEventListener('loading', touch);
      document.fonts.removeEventListener('loadingdone', touch);
      resolve(settled);
    };
    const check = () => {
      const now = performance.now();
      if (container && document.fonts.status === 'loaded' && now - lastActivity >= quiet) finish(true);
      else if (now - start >= timeout) finish(false);
      else setTimeout(check, 50);
    };
    check();
  }), { quiet: quietMs, timeout: timeoutMs });
}

/** Resolves once the window's scroll position has not changed for two animation frames. */
export function waitForScrollSettled(page: Page): Promise<void> {
  return page.evaluate(() => new Promise<void>((resolve) => {
    let lastY = window.scrollY;
    let stableFrames = 0;
    const frame = () => {
      stableFrames = window.scrollY === lastY ? stableFrames + 1 : 0;
      lastY = window.scrollY;
      if (stableFrames >= 2) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }));
}

/**
 * Long-presses the centre of `target` until the grid enters selection mode. The `longpress` directive listens for `mousedown`/`touchstart` only (see
 * `helpers/longpress.ts`), so the gesture goes through `page.mouse`; a dispatched
 * `pointerdown`/`pointerup` pair never starts its timer. The button is held until
 * `.df-grid.container.selection` appears, at most `holdTimeoutMs`. A hold whose 1000 ms timer is
 * delayed past that on a busy machine is released and pressed again, up to `attempts` times.
 * Resolves whether selection mode was entered.
 */
export async function longPressUntilSelection(
  page: Page,
  target: Locator,
  { attempts = 8, holdTimeoutMs = 3_000 } = {},
): Promise<boolean> {
  await target.scrollIntoViewIfNeeded();
  await waitForScrollSettled(page);
  const box = await target.boundingBox();
  if (!box) throw new Error('long-press target has no box');

  /* eslint-disable no-await-in-loop -- each retry must follow the previous attempt's result */
  for (let attempt = 0; attempt < attempts; attempt++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const entered = await page
      .waitForSelector('.df-grid.container.selection', { timeout: holdTimeoutMs })
      .then(() => true, () => false);
    await page.mouse.up();
    if (entered) return true;
  }
  /* eslint-enable no-await-in-loop */
  return false;
}
