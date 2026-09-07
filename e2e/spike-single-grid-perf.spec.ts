/**
 * @file e2e/spike-single-grid-perf.spec.ts
 *
 * Exploratory, manual diagnostic for the single-grid column-sizing spike — not a CI regression
 * gate. Run directly: `npx playwright test e2e/spike-single-grid-perf.spec.ts --project=chromium`.
 *
 * Compares the baseline (today's per-row grids + shadow-measure-and-broadcast) against the
 * candidate (one shared grid, native column auto-sizing) across two scenarios — initial mount,
 * and a container resize (which forces both variants to re-settle column widths) — at several
 * row counts, using CDP `Performance.getMetrics()` diffs. Chromium only — the CDP `Performance`
 * domain has no Firefox equivalent, so this comparison necessarily only covers one engine; the
 * correctness spec still runs both.
 */
import { expect, Page, test } from '@playwright/test';

import { diff, medianSnapshot, MetricSnapshot, openMetricsSession, waitForTrackListStable } from './spike-perf-utils';

const TRIALS = 7;

async function gotoSpike(page: Page, mode: 'baseline' | 'candidate', layout: 'uniform' | 'wrapping', count: number) {
  await page.goto('/examples/spike-single-grid');
  await page.waitForFunction(() => !!(window as any).__spike, undefined, { timeout: 20_000 });
  await page.evaluate((m) => (window as any).__spike.setMode(m), mode);
  await page.evaluate((l) => (window as any).__spike.setLayout(l), layout);
  await page.evaluate((c) => (window as any).__spike.setCount(c), count);
  await page.waitForSelector('.df-grid.card, .df-grid.single-grid', { timeout: 20_000 });
  await settle(page, mode);
}

async function settle(page: Page, mode: 'baseline' | 'candidate') {
  await waitForTrackListStable(page, mode === 'baseline' ? '.df-grid.container' : '.df-grid.single-grid');
}

type Action = 'mount' | 'resize';

async function runTrial(page: Page, mode: 'baseline' | 'candidate', layout: 'uniform' | 'wrapping', count: number, action: Action): Promise<MetricSnapshot> {
  const { snapshot, close } = await openMetricsSession(page);
  const before = await snapshot();
  if (action === 'mount') {
    await page.evaluate(() => (window as any).__spike.remount());
  } else {
    await page.evaluate(() => (window as any).__spike.resizeContainer(700));
    await settle(page, mode);
    await page.evaluate(() => (window as any).__spike.resizeContainer(1400));
  }
  await settle(page, mode);
  const after = await snapshot();
  await close();
  return diff(before, after);
}

async function measure(page: Page, mode: 'baseline' | 'candidate', layout: 'uniform' | 'wrapping', count: number, action: Action) {
  await gotoSpike(page, mode, layout, count);
  const snapshots: MetricSnapshot[] = [];
  /* eslint-disable no-await-in-loop -- each trial must fully settle before the next starts */
  for (let i = 0; i < TRIALS; i++) {
    snapshots.push(await runTrial(page, mode, layout, count, action));
  }
  /* eslint-enable no-await-in-loop */
  return medianSnapshot(snapshots.slice(1)); // discard first (JIT/cache warm-up)
}

test('single-grid spike: performance comparison', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP Performance domain is Chromium-only');
  // 16 (mode x action x scenario) cells x 7 trials each, each trial a real page action plus a
  // settle wait — comfortably exceeds the default 60s per-test timeout.
  test.setTimeout(15 * 60_000);

  const rows: Record<string, unknown>[] = [];
  const scenarios: { layout: 'uniform' | 'wrapping'; counts: number[] }[] = [
    { layout: 'uniform', counts: [500, 2000, 5000] },
    { layout: 'wrapping', counts: [500] },
  ];

  /* eslint-disable no-await-in-loop -- sequential trials, not a hot path */
  for (const { layout, counts } of scenarios) {
    for (const count of counts) {
      for (const action of ['mount', 'resize'] as Action[]) {
        for (const mode of ['baseline', 'candidate'] as const) {
          const m = await measure(page, mode, layout, count, action);
          rows.push({ layout, count, action, mode, ...m });
        }
      }
    }
  }
  /* eslint-enable no-await-in-loop */

  // eslint-disable-next-line no-console -- this spec's whole purpose is to report numbers
  console.table(rows);
  expect(rows.length).toBeGreaterThan(0);
});
