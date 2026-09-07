/**
 * @file e2e/spike-single-grid-correctness.spec.ts
 *
 * Correctness checks for the single-grid column-sizing spike: does the candidate (one real
 * shared grid, native column auto-sizing) produce the same visible geometry as the baseline
 * (today's per-row grids + shadow-measure-and-broadcast), for both the uniform (single row per
 * record) and wrapping (three-row-per-record, `--row-base`-driven) layouts?
 *
 * Gate before trusting any of the perf numbers in spike-single-grid-perf.spec.ts.
 */
import { expect, Page, test } from '@playwright/test';

import { waitForTrackListStable } from './spike-perf-utils';

const EPS = 1.5;

async function gotoSpike(page: Page, mode: 'baseline' | 'candidate', layout: 'uniform' | 'wrapping', count = 500) {
  await page.goto('/examples/spike-single-grid');
  await page.waitForFunction(() => !!(window as any).__spike, undefined, { timeout: 20_000 });
  await page.evaluate((m) => (window as any).__spike.setMode(m), mode);
  await page.evaluate((c) => (window as any).__spike.setCount(c), count);
  await page.evaluate((l) => (window as any).__spike.setLayout(l), layout);
  await page.waitForSelector('.df-grid.card, .df-grid.single-grid', { timeout: 20_000 });
  await waitForTrackListStable(page, mode === 'baseline' ? '.df-grid.container' : '.df-grid.single-grid');
}

// Both variants render extra `.df-grid.cell.<field>` elements that are NOT real body rows: the
// baseline's shadow-grid samples up to 500 rows off-screen, and both variants' header rows share
// the same field-name cell classes as body rows. Every query below must exclude those explicitly
// — a bare `.df-grid.cell.title` selector would otherwise silently mix in shadow/header cells.
function bodyCellSelector(mode: 'baseline' | 'candidate', field: string) {
  return mode === 'baseline'
    ? `.df-grid.container > .df-grid.card:not(.header):not(.shadow-grid) .df-grid.cell.${field}`
    : `.df-grid.single-grid > div:not(:first-child) .df-grid.cell.${field}`;
}

for (const mode of ['baseline', 'candidate'] as const) {
  for (const layout of ['uniform', 'wrapping'] as const) {
    test(`[${mode}/${layout}] no horizontal overflow`, async ({ page }) => {
      await gotoSpike(page, mode, layout);
      const gridSelector = mode === 'baseline' ? '.df-grid.container' : '.df-grid.single-grid';
      const overflow = await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement;
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      }, gridSelector);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + EPS);
    });

    test(`[${mode}/${layout}] header and body columns align`, async ({ page }) => {
      await gotoSpike(page, mode, layout);
      // Compare the SAME field on both sides — the header's first DOM cell isn't necessarily
      // 'title' (it's whichever column comes first in that layout's column list).
      const headerSelector = mode === 'baseline' ? '.df-grid.card.header .df-grid.cell.title' : '.df-grid.single-grid > div:first-child .df-grid.cell.title';
      const bodySelector = bodyCellSelector(mode, 'title');
      const geometry = await page.evaluate(
        ({ headerSelector, bodySelector }) => {
          const h = (document.querySelector(headerSelector) as HTMLElement).getBoundingClientRect();
          const b = (document.querySelector(bodySelector) as HTMLElement).getBoundingClientRect();
          return { hLeft: h.left, hRight: h.right, bLeft: b.left, bRight: b.right };
        },
        { headerSelector, bodySelector },
      );
      expect(geometry.hLeft, 'header/body first cell left edge differs').toBeCloseTo(geometry.bLeft, 0);
    });

    test(`[${mode}/${layout}] a sampled column stays aligned across many rows`, async ({ page }) => {
      await gotoSpike(page, mode, layout);
      const selector = bodyCellSelector(mode, 'title');
      const edges = await page.evaluate((sel) => {
        const cells = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
        const step = Math.max(1, Math.floor(cells.length / 20));
        return cells.filter((_, i) => i % step === 0).slice(0, 20).map((el) => el.getBoundingClientRect().left);
      }, selector);
      expect(edges.length).toBeGreaterThan(5);
      const first = edges[0];
      for (const left of edges) expect(left, 'column left edge drifted across rows').toBeCloseTo(first, 0);
    });

    if (layout === 'wrapping') {
      test(`[${mode}/wrapping] consecutive record bands do not overlap`, async ({ page }) => {
        await gotoSpike(page, mode, layout);
        // A record's band spans from its `title` cell (row 1) to its `moods` cell (row 3).
        // Records render no wrapper box of their own (`no-wrapper-item`/`display:contents`), so
        // the band extent is derived from those two cells rather than read off a single element.
        const titleSelector = bodyCellSelector(mode, 'title');
        const moodsSelector = bodyCellSelector(mode, 'moods');
        const bands = await page.evaluate(
          ({ titleSelector, moodsSelector }) => {
            const tops = Array.from(document.querySelectorAll(titleSelector)) as HTMLElement[];
            const bottoms = Array.from(document.querySelectorAll(moodsSelector)) as HTMLElement[];
            const n = Math.min(tops.length, bottoms.length, 20);
            return Array.from({ length: n }, (_, i) => ({
              top: tops[i].getBoundingClientRect().top,
              bottom: bottoms[i].getBoundingClientRect().bottom,
            }));
          },
          { titleSelector, moodsSelector },
        );
        expect(bands.length).toBeGreaterThan(5);
        for (let i = 0; i < bands.length - 1; i++) {
          expect(bands[i].bottom, `record ${i} overlaps record ${i + 1}`).toBeLessThanOrEqual(bands[i + 1].top + EPS);
        }
      });
    }
  }
}
