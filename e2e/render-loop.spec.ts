/**
 * @file e2e/render-loop.spec.ts
 *
 * Playwright browser test: detect an infinite reactivity loop in DfGrid that causes
 * constant CPU usage even when the grid is idle (no user interaction).
 *
 * === Suspected loop (with @pdanpdan/virtual-scroll) ===
 *
 *   1. @pdanpdan/virtual-scroll `itemResizeObserver` fires when a rendered item resizes.
 *   2. `updateItemSizes` → `scrollDetails` changes → `visibleRangeChange` emitted.
 *   3. `updateRenderedRows` (250 ms throttle) → `mainShadowOffset` changes.
 *   4. shadow-grid re-renders (new `:offset` prop).
 *   5. `idxAndItem()` → `nextTick(checkShadowGridColumns)` → `onmeasure` emitted.
 *   6. `doShadowMeasure` (100 ms throttle) → `templateColumns` changes.
 *   7. Container CSS var `--grid-template-columns` changes → grid-card widths change.
 *   8. Width change → `itemResizeObserver` fires → goto 2.
 *
 * === How we measure ===
 *
 * We instrument the live page with MutationObserver to count:
 *
 *   a) Style attribute changes on `.df-grid.container`
 *      Each change = one `doShadowMeasure` call changed `templateColumns`.
 *      Indicator: how often the CSS column layout is recomputed.
 *
 *   b) Subtree mutations inside `.df-grid.shadow-grid`
 *      Each batch = shadow-grid re-rendered with new `offset` prop.
 *      Indicator: how often `mainShadowOffset` changed.
 *
 * We wait 3 s after initial render (to let startup noise settle) then observe for
 * a further 3 s. A healthy system produces ≤ 3 events in that window.
 * A looping system produces O(seconds / throttle_ms) events — 12–30+ per 3 s.
 *
 * === Running ===
 *
 *   npx playwright test e2e/render-loop.spec.ts --headed
 *
 * The webServer config in playwright.config.ts starts the VitePress docs server
 * automatically; navigate to /examples/table to see the 10 000-row demo.
 */

import { expect, test } from '@playwright/test';

// Settle time after mount before we start counting.
const SETTLE_MS = 3_000;
// Observation window.
const OBSERVE_MS = 3_000;
// Max events we allow in the observation window (healthy system).
const IDLE_THRESHOLD = 3;

test.describe('DfGrid — idle render-loop detection', () => {
  test.beforeEach(async ({ page }) => {
    // Inject ResizeObserver counter BEFORE page scripts run so ALL instances are tracked.
    await page.addInitScript(() => {
      const NativeRO = window.ResizeObserver;
      (window as any).__roCallbackCount = 0;
      (window as any).__roCallbackCountStart = 0;

      class TrackedRO extends NativeRO {
        constructor(cb: ResizeObserverCallback) {
          super((entries, observer) => {
            (window as any).__roCallbackCount++;
            cb(entries, observer);
          });
        }
      }
      window.ResizeObserver = TrackedRO as unknown as typeof ResizeObserver;
    });

    await page.goto('/examples/table');

    // Wait for the grid container to appear and at least one card to render.
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card', { timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // [LOOP-1] Container style should not keep changing at idle
  //
  // Each change to the container's `style` attribute means `doShadowMeasure`
  // wrote a new `templateColumns` value. At idle, once the column widths have
  // been measured for the first time, the value should stabilise.
  // ---------------------------------------------------------------------------
  test('[LOOP-1] container style stops changing after initial render', async ({ page }) => {
    // Let the initial render pipeline fully settle.
    await page.waitForTimeout(SETTLE_MS);

    // Inject a MutationObserver that counts container style changes.
    const styleChangeCount = await page.evaluate(({ observeMs }) => new Promise<number>((resolve) => {
      const container = document.querySelector('.df-grid.container') as HTMLElement | null;
      if (!container) { resolve(-1); return; }

      let count = 0;
      const observer = new MutationObserver(() => { count++; });
      observer.observe(container, { attributes: true, attributeFilter: ['style'] });

      setTimeout(() => {
        observer.disconnect();
        resolve(count);
      }, observeMs);
    }), { observeMs: OBSERVE_MS });

    console.log(`[LOOP-1] style changes in ${OBSERVE_MS} ms idle window: ${styleChangeCount}`);
    expect(styleChangeCount, `style changed ${styleChangeCount}× in ${OBSERVE_MS} ms at idle`).toBeLessThanOrEqual(IDLE_THRESHOLD);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-2] Shadow-grid should not keep re-rendering at idle
  //
  // Each mutation batch inside the shadow-grid means the shadow-grid component
  // re-rendered — its `:offset` prop changed (= `mainShadowOffset` changed) or
  // its `:columns` prop changed. At idle, once the initial measurement round
  // completes, neither should change.
  // ---------------------------------------------------------------------------
  test('[LOOP-2] shadow-grid stops re-rendering after initial render', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    const shadowMutationBatches = await page.evaluate(({ observeMs }) => new Promise<number>((resolve) => {
      const shadow = document.querySelector('.df-grid.shadow-grid') as HTMLElement | null;
      if (!shadow) { resolve(-1); return; }

      let batches = 0;
      const observer = new MutationObserver(() => { batches++; });
      observer.observe(shadow, { childList: true, subtree: true, attributes: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(batches);
      }, observeMs);
    }), { observeMs: OBSERVE_MS });

    console.log(`[LOOP-2] shadow-grid mutation batches in ${OBSERVE_MS} ms idle window: ${shadowMutationBatches}`);
    expect(shadowMutationBatches, `shadow-grid mutated ${shadowMutationBatches}× in ${OBSERVE_MS} ms at idle`).toBeLessThanOrEqual(IDLE_THRESHOLD);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-3] Combined: measure total DOM churn in the grid at idle
  //
  // Counts all mutation batches anywhere inside the grid container.  A looping
  // system will show continuous churn; a healthy one shows near-zero.
  // ---------------------------------------------------------------------------
  test('[LOOP-3] total grid DOM churn is near-zero at idle', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    const totalBatches = await page.evaluate(({ observeMs }) => new Promise<number>((resolve) => {
      const container = document.querySelector('.df-grid.container') as HTMLElement | null;
      if (!container) { resolve(-1); return; }

      let batches = 0;
      const observer = new MutationObserver(() => { batches++; });
      observer.observe(container, { childList: true, subtree: true, attributes: true, characterData: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(batches);
      }, observeMs);
    }), { observeMs: OBSERVE_MS });

    // This threshold is more generous because the VirtualScroll scroller may
    // do a single recycle pass during the window; we only care about a *loop*.
    console.log(`[LOOP-3] total grid DOM mutation batches in ${OBSERVE_MS} ms idle window: ${totalBatches}`);
    expect(totalBatches, `grid DOM mutated ${totalBatches}× in ${OBSERVE_MS} ms at idle`).toBeLessThanOrEqual(20);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-4] Activate selection mode: verify grid stabilises after the toggle
  //
  // Clicking the "select column" checkbox should trigger exactly one column-width
  // recalculation round and then stop.  If the loop exists, the DOM will keep
  // changing long after the click.
  // ---------------------------------------------------------------------------
  test('[LOOP-4] grid stabilises within 2 s after selection mode toggle', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    // Long-press on a row to activate selection mode (simulates what the user does).
    // VitePress docs table-basic.vue uses longpress to enter selection mode.
    const firstCard = page.locator('.df-grid.card').first();
    await firstCard.dispatchEvent('pointerdown');
    await page.waitForTimeout(800); // longpress duration
    await firstCard.dispatchEvent('pointerup');

    // Give the grid 2 s to settle after the toggle.
    await page.waitForTimeout(2_000);

    // Now measure if mutations have stopped.
    const postToggleBatches = await page.evaluate(({ observeMs }) => new Promise<number>((resolve) => {
      const container = document.querySelector('.df-grid.container') as HTMLElement | null;
      if (!container) { resolve(-1); return; }

      let batches = 0;
      const observer = new MutationObserver(() => { batches++; });
      observer.observe(container, { childList: true, subtree: true, attributes: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(batches);
      }, observeMs);
    }), { observeMs: OBSERVE_MS });

    console.log(`[LOOP-4] grid DOM mutation batches in ${OBSERVE_MS} ms after selection toggle: ${postToggleBatches}`);
    expect(postToggleBatches, `grid mutated ${postToggleBatches}× in ${OBSERVE_MS} ms after selection toggle`).toBeLessThanOrEqual(20);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-4b] ResizeObserver total callback rate — ALL instances including VirtualScroll
  //
  // Uses the TrackedRO injected by addInitScript to measure total RO callback
  // rate from ALL ResizeObserver instances (including the VirtualScroll's
  // itemResizeObserver, hostResizeObserver, and extraResizeObserver).
  //
  // During the settle window those observers fire legitimately (items first
  // measured).  After settling they must stop firing — if they keep firing,
  // item sizes keep changing, which eventually drives the visibleRangeChange
  // → updateRenderedRows loop.
  // ---------------------------------------------------------------------------
  test('[LOOP-4b] ResizeObserver callbacks stop after initial settle', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    // Snapshot the counter at the start of the observation window.
    await page.evaluate(() => {
      (window as any).__roCallbackCountStart = (window as any).__roCallbackCount;
    });

    await page.waitForTimeout(OBSERVE_MS);

    const { total, inWindow } = await page.evaluate(() => ({
      total: (window as any).__roCallbackCount as number,
      inWindow: (window as any).__roCallbackCount - (window as any).__roCallbackCountStart as number,
    }));

    console.log(`[LOOP-4b] RO callbacks total: ${total}, in ${OBSERVE_MS} ms idle window: ${inWindow}`);
    expect(inWindow, `ResizeObserver fired ${inWindow}× in ${OBSERVE_MS} ms at idle`).toBeLessThanOrEqual(IDLE_THRESHOLD);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-5] JavaScript event-loop saturation at idle
  //
  // Measures how many high-frequency intervals actually fire in 2 seconds.
  // A saturated JS thread will cause intervals to fire less often than expected.
  // We also intercept ResizeObserver to count how many times it fires at idle.
  // ---------------------------------------------------------------------------
  test('[LOOP-5] JS event loop is not saturated at idle', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    const result = await page.evaluate(({ observeMs }) => new Promise<{
      intervalFires: number;
      expectedIntervalFires: number;
      resizeObserverCallbacks: number;
    }>((resolve) => {
      const INTERVAL_MS = 50;
      let intervalFires = 0;
      let resizeCallbacks = 0;

      // Patch ResizeObserver to count callbacks fired after the settle period.
      const OrigResizeObserver = window.ResizeObserver;
      window.ResizeObserver = class PatchedRO extends OrigResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          super((entries, observer) => {
            resizeCallbacks++;
            cb(entries, observer);
          });
        }
      } as unknown as typeof ResizeObserver;

      const interval = setInterval(() => { intervalFires++; }, INTERVAL_MS);

      setTimeout(() => {
        clearInterval(interval);
        window.ResizeObserver = OrigResizeObserver;
        resolve({
          intervalFires,
          expectedIntervalFires: Math.floor(observeMs / INTERVAL_MS),
          resizeObserverCallbacks: resizeCallbacks,
        });
      }, observeMs);
    }), { observeMs: OBSERVE_MS });

    console.log(`[LOOP-5] interval fires: ${result.intervalFires}/${result.expectedIntervalFires}, ResizeObserver callbacks: ${result.resizeObserverCallbacks}`);

    // Interval should fire close to expected count (within 20% tolerance).
    const minExpected = Math.floor(result.expectedIntervalFires * 0.8);
    expect(result.intervalFires, `JS thread busy — only ${result.intervalFires}/${result.expectedIntervalFires} intervals fired`).toBeGreaterThanOrEqual(minExpected);

    // ResizeObserver should fire very few times at idle (one per item per layout change).
    // A looping system fires continuously; a healthy one fires 0 times at idle.
    expect(result.resizeObserverCallbacks, `ResizeObserver fired ${result.resizeObserverCallbacks}× in ${OBSERVE_MS} ms at idle`).toBeLessThanOrEqual(10);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-7] Shadow-grid cards are NOT recreated on selection mode toggle
  //
  // Before the fix, shadow-grid used :key="`${item[keyField]}${selectionActive}`".
  // When selectionActive changed, ALL shadow-grid GridCards were destroyed and
  // recreated (O(mainShadowCount) = up to 500 DOM operations).
  //
  // After the fix, :key="`${item[keyField]}`" — keys are stable across selection
  // mode changes, so v-memo prevents any re-render.  We verify this by counting
  // child-removal mutations in the shadow-grid during a selection toggle.
  // ---------------------------------------------------------------------------
  test('[LOOP-7] shadow-grid cards not recreated on selection mode toggle', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    // Set up mutation counter for shadow-grid child additions/removals.
    await page.evaluate(() => {
      (window as any).__shadowCardRemovals = 0;
      const shadow = document.querySelector('.df-grid.shadow-grid');
      if (!shadow) return;
      const obs = new MutationObserver((records) => {
        for (const r of records) {
          (window as any).__shadowCardRemovals += r.removedNodes.length;
        }
      });
      obs.observe(shadow, { childList: true });
      (window as any).__shadowCardObserver = obs;
    });

    // Trigger selection mode via long-press (same mechanism as [LOOP-4]).
    const firstCard = page.locator('.df-grid.card').first();
    await firstCard.dispatchEvent('pointerdown');
    await page.waitForTimeout(800);
    await firstCard.dispatchEvent('pointerup');
    await page.waitForTimeout(500);

    const removals = await page.evaluate(() => {
      (window as any).__shadowCardObserver?.disconnect();
      return (window as any).__shadowCardRemovals as number;
    });

    console.log(`[LOOP-7] shadow-grid card removals on selection toggle: ${removals}`);
    // With the fixed :key, 0 cards should be removed.
    // Before the fix this count equalled mainShadowCount (up to 500).
    expect(removals, `${removals} shadow-grid cards were destroyed on selection toggle`).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // [LOOP-6] requestAnimationFrame call rate at idle
  //
  // A grid that has continuous rAF loops (e.g. due to inertia or animation)
  // would show a high rAF call rate even when the user is not interacting.
  // At idle, the expected rAF rate is 0 (no animation loops started).
  // ---------------------------------------------------------------------------
  test('[LOOP-6] no requestAnimationFrame loop at idle', async ({ page }) => {
    await page.waitForTimeout(SETTLE_MS);

    const rafCount = await page.evaluate(({ observeMs }) => new Promise<number>((resolve) => {
      let count = 0;
      const origRaf = window.requestAnimationFrame.bind(window);

      // Patch rAF: count calls INITIATED during the observation window.
      // We do NOT intercept calls already queued before our patch.
      window.requestAnimationFrame = (cb: FrameRequestCallback) => {
        count++;
        return origRaf(cb);
      };

      setTimeout(() => {
        window.requestAnimationFrame = origRaf;
        resolve(count);
      }, observeMs);
    }), { observeMs: OBSERVE_MS });

    console.log(`[LOOP-6] requestAnimationFrame calls in ${OBSERVE_MS} ms at idle: ${rafCount}`);

    // Some rAF calls are expected from Vue's scheduler, VitePress, etc.
    // A continuous animation loop would call rAF many times per frame (e.g. 180 per 3s at 60fps).
    expect(rafCount, `${rafCount} rAF calls in ${OBSERVE_MS} ms — possible animation loop`).toBeLessThanOrEqual(60);
  });
});
