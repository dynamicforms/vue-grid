/**
 * @file e2e/spike-perf-utils.ts
 *
 * Shared CDP `Performance` domain helper for the single-grid column-sizing spike
 * (see e2e/spike-single-grid-perf.spec.ts). `Performance.getMetrics()` returns cumulative
 * counters since page load, so a trial opens one session, takes two snapshots around the action
 * under test, and diffs them — it does not open a fresh session per read.
 */
import { Page } from '@playwright/test';

const METRIC_NAMES = ['LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount', 'TaskDuration'] as const;
export type MetricSnapshot = Record<(typeof METRIC_NAMES)[number], number>;

export async function openMetricsSession(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  const snapshot = async (): Promise<MetricSnapshot> => {
    const { metrics } = await client.send('Performance.getMetrics');
    const byName = Object.fromEntries(metrics.map((m) => [m.name, m.value]));
    return Object.fromEntries(METRIC_NAMES.map((n) => [n, byName[n] ?? 0])) as MetricSnapshot;
  };
  return { snapshot, close: () => client.detach() };
}

export function diff(a: MetricSnapshot, b: MetricSnapshot): MetricSnapshot {
  return Object.fromEntries(METRIC_NAMES.map((k) => [k, b[k] - a[k]])) as MetricSnapshot;
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function medianSnapshot(snapshots: MetricSnapshot[]): MetricSnapshot {
  return Object.fromEntries(METRIC_NAMES.map((k) => [k, median(snapshots.map((s) => s[k]))])) as MetricSnapshot;
}

// Polls `getComputedStyle(selector).gridTemplateColumns` until it stops changing across two
// consecutive checks, instead of a blind timeout — needed to genuinely capture the baseline's
// 100ms-throttled shadow-measure settling, not just whatever happened to run before an arbitrary
// wait elapsed.
export async function waitForTrackListStable(page: Page, selector: string, timeoutMs = 3000): Promise<void> {
  await page.waitForFunction(
    ({ selector, timeoutMs }) => {
      const w = window as any;
      w.__spikeStable ??= {};
      const state = (w.__spikeStable[selector] ??= { last: '', stableSince: 0, start: Date.now() });
      const el = document.querySelector(selector);
      const current = el ? getComputedStyle(el).gridTemplateColumns : '';
      const now = Date.now();
      if (current !== state.last) {
        state.last = current;
        state.stableSince = now;
        return false;
      }
      if (now - state.start > timeoutMs) return true; // give up waiting, avoid hanging forever
      return now - state.stableSince > 150;
    },
    { selector, timeoutMs },
    { timeout: timeoutMs + 1000 },
  );
}
