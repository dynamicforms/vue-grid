/**
 * @file e2e/a11y-layouts.spec.ts
 *
 * A screen reader announces a cell with the column header at the same position in the header row. The full-featured
 * demo (`docs/examples/table`, `table-basic.vue`) places cells in three responsive layouts (`single-line`,
 * `three-row`, `single-column`) by CSS, in an order of its own; in every layout the header row and each record row
 * still expose their cells in the same column order, one ARIA row per record also where a record spans several grid
 * lines.
 *
 * The grid is stretched to the window, so the viewport width selects the layout; the demo's footer names the active
 * one.
 */
import { expect, Page, test } from './test';

import { ariaRows } from './a11y-helpers';
import { waitForGridSettled } from './grid-settled';

const LAYOUTS = ['single-line', 'three-row', 'single-column'];
const WIDTHS = [2560, 1920, 1600, 1440, 1280, 1024, 900, 768, 640, 480, 360];

async function activeLayout(page: Page): Promise<string | null> {
  const text = await page.getByText(/Active layout:/).textContent();
  return text?.match(/Active layout:\s*(\S+)/)?.[1] ?? null;
}

async function checkColumnOrder(page: Page, layout: string) {
  const rows = await ariaRows(page);
  const header = rows[0];
  expect(header.cells.length, `${layout}: header row has no column headers`).toBeGreaterThan(0);
  expect(header.cells.every((c) => c.role === 'columnheader'), `${layout}: first row is not the header row`).toBe(true);
  const headerFields = header.cells.map((c) => c.field);

  // the demo shows the filter row, so records start at the third row
  const records = rows.slice(2).filter((row) => row.cells.length > 0 && row.cells.every((c) => c.role === 'cell'));
  expect(records.length, `${layout}: no record rows`).toBeGreaterThan(2);
  for (const row of records) {
    expect(row.cells.map((c) => c.field), `${layout}: row ${row.rowindex} cell order differs from the header`).toEqual(
      headerFields,
    );
  }

  // each rendered record is exactly one ARIA row
  const perRecord = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="rowgroup"] .df-anchored'))
      .filter((el) => getComputedStyle(el).visibility === 'visible' && !el.closest('[aria-hidden="true"]'))
      .map((el) => ({ role: el.getAttribute('role'), nestedRows: el.querySelectorAll('[role="row"]').length })),
  );
  expect(perRecord.length, `${layout}: no rendered records`).toBeGreaterThan(0);
  for (const record of perRecord) expect(record).toEqual({ role: 'row', nestedRows: 0 });
}

test('header and cell order match in every responsive layout', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: WIDTHS[0], height: 1000 });
  await page.goto('/examples/table');
  await page.waitForSelector('[role="table"] [role="row"] [role="cell"]', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Stretch grid to window' }).click();

  const checked = new Set<string>();
  /* eslint-disable no-await-in-loop -- each width must be laid out before its layout is read */
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 1000 });
    await waitForGridSettled(page);
    const layout = await activeLayout(page);
    if (layout && !checked.has(layout)) {
      await checkColumnOrder(page, layout);
      checked.add(layout);
    }
  }
  /* eslint-enable no-await-in-loop */

  expect([...checked].sort()).toEqual([...LAYOUTS].sort());
});
