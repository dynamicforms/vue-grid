/**
 * @file e2e/single-row-column-placement.spec.ts
 *
 * A single-row layout that never declares an explicit `grid-column` on its cells — letting them
 * fall into place via plain CSS column auto-placement, one per record row — needs two things to
 * hold simultaneously for that to work on a shared grid:
 *
 *   1. The row-anchor (`.df-grid.card`, spanning `1 / -1` in its row for zebra/border/selection
 *      styling) must not itself occupy that row for auto-placement purposes, or every cell
 *      auto-placing its column within that same row finds no free cell and overflows into new
 *      implicit columns instead of the intended track list.
 *   2. The hidden header-measurement clone (also `--row-base: 0`, permanently reserved rows) must
 *      not compete with whichever record is first in the mounted window for the same auto-placed
 *      columns, for the same reason.
 *
 * Both are handled in df-grid.vue (the row-anchor via `position: absolute`, the clone via a
 * dedicated row reservation) — this asserts the visible outcome in a real browser, since none of
 * it can be verified in JSDOM (no layout engine). `docs/examples/renderers` is `table-renderers.vue`,
 * a real single-row layout with no explicit `grid-column` on any cell.
 */
import { expect, test } from '@playwright/test';

test.describe('single-row layout: column auto-placement', () => {
  test('cells land in the declared track list, not newly-created implicit columns', async ({ page }) => {
    await page.goto('/examples/renderers');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const trackCount = await page.evaluate(() => {
      const bodyGrid = document.querySelector('.df-grid.body-grid')!;
      return getComputedStyle(bodyGrid).gridTemplateColumns.trim().split(/\s+/).length;
    });
    // table-renderers.vue declares exactly 6 tracks (2fr 1fr 7em 9em 7em 4em). Cells competing
    // for auto-placement with the row-anchor or the hidden clone would inflate this with extra
    // implicit columns created to fit the overflow.
    expect(trackCount, 'unexpected implicit columns — a cell overflowed auto-placement').toBe(6);
  });

  test('the first mounted record aligns with the header, not with newly-created implicit columns', async ({ page }) => {
    await page.goto('/examples/renderers');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const lefts = await page.evaluate(() => {
      const headerCells = Array.from(document.querySelectorAll('.df-grid.card.header .df-grid.cell'));
      const firstRecord = document.querySelector('.df-anchored');
      const bodyCells = firstRecord ? Array.from(firstRecord.querySelectorAll('.df-grid.cell')) : [];
      return {
        header: headerCells.map((c) => Math.round(c.getBoundingClientRect().left)),
        body: bodyCells.map((c) => Math.round(c.getBoundingClientRect().left)),
      };
    });
    expect(lefts.body.length, 'first mounted record has no cells').toBeGreaterThan(0);
    expect(lefts.body, "the first record's own cells should land under the matching header cells")
      .toEqual(lefts.header.slice(0, lefts.body.length));
  });

  test('the row-anchor fills its row instead of collapsing to near-zero height', async ({ page }) => {
    await page.goto('/examples/renderers');
    await page.waitForSelector('.df-grid.container', { timeout: 20_000 });
    await page.waitForSelector('.df-grid.card[data-idx]', { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const heights = await page.evaluate(() => {
      const firstRecord = document.querySelector('.df-anchored')!;
      const anchor = firstRecord.querySelector('.df-grid.card[data-idx]')!;
      const cell = firstRecord.querySelector('.df-grid.cell')!;
      return {
        anchor: Math.round(anchor.getBoundingClientRect().height),
        cell: Math.round(cell.getBoundingClientRect().height),
      };
    });
    // The anchor's own height should match (not fall well short of) its row's actual content
    // height — align-items:center on this demo's own grid (centering cell text) would otherwise
    // shrink an in-flow anchor to near its own zero intrinsic size.
    expect(heights.anchor).toBeGreaterThanOrEqual(heights.cell - 1);
  });
});
