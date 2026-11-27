/**
 * @file e2e/a11y-tree.spec.ts
 *
 * Table semantics of df-grid in the accessibility demo (`docs/examples/a11y`, `table-a11y.vue`: 400 records, columns
 * Id, Title, Artist, Year, filter row and status bar shown, `ariaLabel` "Music library"):
 *
 *   1. The table is exposed with its name; header, filter and record rows and their cells reach the accessibility tree
 *      although record rows are `display: contents` wrappers.
 *   2. Reading order through `aria-owns`: header row, filter row, records, summary row.
 *   3. `aria-rowcount` and `aria-rowindex` over the whole data set, with and without the filter row, filtered and
 *      scrolled to the end, where the top windowing spacer stands in for the records before the rendered window.
 *   4. `aria-sort` on the primary sort column, `aria-selected` in selection mode, the status bar as `role="status"`
 *      and the summary row of an empty grid.
 *
 * Playwright's `ariaSnapshot` is computed from the DOM by Playwright itself, in every engine; roles and content are
 * asserted on that tree. It places the elements `aria-owns` lists after the owner's DOM children and leaves a DOM
 * descendant where it is, so the body rowgroup precedes the header rows in it: the reading order is asserted on
 * Chromium's own tree, read over CDP, and on the `aria-owns` list. Firefox's and WebKit's own trees are not read.
 */
import { expect, test } from '@playwright/test';

import {
  A11Y_DEMO_RECORDS,
  ariaRows,
  chromiumEngineRows,
  openA11yDemo,
  recordRows,
  rowCount,
  scrollGridToEnd,
} from './a11y-helpers';
import { waitForGridSettled } from './grid-settled';

const COLUMN_LABELS = ['Id', 'Title', 'Artist', 'Year'];

test.describe('accessibility tree', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('the table, its rows and cells reach the accessibility tree', async ({ page }) => {
    await openA11yDemo(page);
    const table = page.getByRole('table', { name: 'Music library' });
    await expect(table).toHaveCount(1);

    await expect(table).toMatchAriaSnapshot(`
      - table "Music library":
        - row:
          - columnheader "Id"
          - columnheader "Title"
          - columnheader "Artist"
          - columnheader "Year"
    `);
    await expect(table).toMatchAriaSnapshot(`
      - table "Music library":
        - row:
          - cell:
            - textbox /Filter Title/
          - cell:
            - textbox /Filter Artist/
    `);
    await expect(table).toMatchAriaSnapshot(`
      - table "Music library":
        - rowgroup:
          - row:
            - cell "1"
            - cell "Track 001"
            - cell "Queen"
            - cell "1961"
          - row:
            - cell "2"
            - cell "Track 002"
            - cell "Pink Floyd"
            - cell "1962"
    `);
  });

  test('the header row, the filter row and the records are read in that order', async ({ page }) => {
    await openA11yDemo(page);

    const rows = await ariaRows(page);
    expect(rows.length).toBeGreaterThan(3);
    expect(rows[0].cells.map((c) => c.role)).toEqual(['columnheader', 'columnheader', 'columnheader', 'columnheader']);
    COLUMN_LABELS.forEach((label, i) => expect(rows[0].cells[i].text).toContain(label));
    expect(rows[1].cells.every((c) => c.role === 'cell')).toBe(true);
    await expect(page.getByRole('textbox', { name: /Filter Title/ })).toHaveCount(1);
    expect(rows[2].cells.map((c) => c.text)).toEqual(['1', 'Track 001', 'Queen', '1961']);
  });

  test('Chromium exposes the rows in aria-owns order with their cells', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the engine accessibility tree is read over CDP, which only Chromium has');
    await openA11yDemo(page);

    const rows = await chromiumEngineRows(await page.context().newCDPSession(page), 'Music library');
    expect(rows, 'Chromium exposes no table named "Music library"').not.toBeNull();
    expect(rows!.length).toBeGreaterThan(3);
    expect(rows![0].cells.map((c) => c.role)).toEqual(['columnheader', 'columnheader', 'columnheader', 'columnheader']);
    COLUMN_LABELS.forEach((label, i) => expect(rows![0].cells[i].name).toBe(label));
    expect(rows![1].cells.length).toBe(4);
    expect(rows![2].cells).toEqual([
      { role: 'cell', name: '1' },
      { role: 'cell', name: 'Track 001' },
      { role: 'cell', name: 'Queen' },
      { role: 'cell', name: '1961' },
    ]);
  });

  test('aria-rowcount and aria-rowindex count the header and filter rows and every record', async ({ page }) => {
    await openA11yDemo(page);

    expect(await rowCount(page)).toBe(String(A11Y_DEMO_RECORDS + 2));
    const rows = await ariaRows(page);
    expect(rows[0].rowindex).toBe('1');
    expect(rows[1].rowindex).toBe('2');
    const records = recordRows(rows, 2);
    expect(records.length).toBeGreaterThan(0);
    records.forEach((row, i) => expect(row.rowindex).toBe(String(i + 3)));
  });

  test('without the filter row the header is the only header row', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('button', { name: 'Hide filter row' }).click();
    await waitForGridSettled(page);

    await expect.poll(() => rowCount(page)).toBe(String(A11Y_DEMO_RECORDS + 1));
    await expect(page.getByRole('textbox', { name: /Filter Title/ })).toHaveCount(0);
    const rows = await ariaRows(page);
    expect(rows[0].rowindex).toBe('1');
    expect(rows[0].cells.every((c) => c.role === 'columnheader')).toBe(true);
    const records = recordRows(rows, 1);
    expect(records[0].cells.map((c) => c.text)).toEqual(['1', 'Track 001', 'Queen', '1961']);
    records.forEach((row, i) => expect(row.rowindex).toBe(String(i + 2)));
  });

  test('scrolled to the end, row indexes continue past the records the window leaves out', async ({ page }) => {
    await openA11yDemo(page);
    await scrollGridToEnd(page);

    expect(await rowCount(page)).toBe(String(A11Y_DEMO_RECORDS + 2));
    const rows = await ariaRows(page);
    expect(rows[0].rowindex).toBe('1');
    expect(rows[1].rowindex).toBe('2');
    const records = recordRows(rows, 2);
    const first = Number(records[0].rowindex);
    expect(first, 'every record is rendered, so the top windowing spacer is not in use').toBeGreaterThan(3);
    records.forEach((row, i) => expect(row.rowindex).toBe(String(first + i)));
    expect(records.at(-1)!.rowindex).toBe(String(A11Y_DEMO_RECORDS + 2));
    expect(records.at(-1)!.cells[1].text).toBe(`Track ${A11Y_DEMO_RECORDS}`);
    // the record at row index r is record r - 2 of the data set (ids start at 1)
    expect(records[0].cells[0].text).toBe(String(first - 2));
  });

  test('a local filter sets the row count to the matching records', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('textbox', { name: /Filter Artist/ }).fill('Queen');

    const matching = A11Y_DEMO_RECORDS / 5;
    await expect.poll(() => rowCount(page), { timeout: 10_000 }).toBe(String(matching + 2));
    await waitForGridSettled(page);
    await expect(page.getByRole('status')).toContainText(`${matching} of ${A11Y_DEMO_RECORDS}`);
    const records = recordRows(await ariaRows(page), 2);
    expect(records.length).toBe(matching);
    records.forEach((row, i) => {
      expect(row.rowindex).toBe(String(i + 3));
      expect(row.cells[2].text).toBe('Queen');
    });
  });

  test('aria-sort marks the primary sort column only', async ({ page }) => {
    await openA11yDemo(page);
    const year = page.getByRole('columnheader', { name: 'Year', exact: true });
    const title = page.getByRole('columnheader', { name: 'Title', exact: true });
    const sortValue = async () => ({ year: await year.getAttribute('aria-sort'), title: await title.getAttribute('aria-sort') });

    expect(['none', null]).toContain((await sortValue()).year);

    await page.getByRole('button', { name: /Sort by Year/ }).click();
    await expect(year).toHaveAttribute('aria-sort', 'ascending');
    expect(['none', null]).toContain((await sortValue()).title);

    await page.getByRole('button', { name: /Sort by Year/ }).click();
    await expect(year).toHaveAttribute('aria-sort', 'descending');

    await page.getByRole('button', { name: /Sort by Title/ }).click({ modifiers: ['Shift'] });
    await waitForGridSettled(page);
    await expect(year).toHaveAttribute('aria-sort', 'descending');
    expect((await sortValue()).title, 'a secondary sort column carries aria-sort').toBeNull();

    const records = recordRows(await ariaRows(page), 2);
    records.forEach((row, i) => expect(row.rowindex).toBe(String(i + 3)));
    expect(records[0].cells[3].text).toBe('1999');
  });

  test('rows carry aria-selected only while selection mode is active', async ({ page }) => {
    await openA11yDemo(page);
    const row = (title: string) => page.getByRole('row').filter({ has: page.getByRole('cell', { name: title, exact: true }) });

    await expect(row('Track 003')).not.toHaveAttribute('aria-selected');
    await page.getByRole('cell', { name: 'Track 003', exact: true }).click({ modifiers: ['Shift'] });

    await expect(row('Track 003')).toHaveAttribute('aria-selected', 'true');
    await expect(row('Track 004')).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('table', { name: 'Music library' })).toMatchAriaSnapshot(`
      - table "Music library":
        - rowgroup:
          - row [selected=false]:
            - cell "Track 002"
          - row [selected]:
            - cell "Track 003"
    `);
    const records = recordRows(await ariaRows(page), 2);
    expect(records.every((r) => r.selected === 'true' || r.selected === 'false')).toBe(true);
    expect(records.filter((r) => r.selected === 'true').map((r) => r.cells[1].text)).toEqual(['Track 003']);
  });

  test('the status bar is a status region with the record count', async ({ page }) => {
    await openA11yDemo(page);

    const status = page.getByRole('status');
    await expect(status).toHaveCount(1);
    await expect(status).toContainText(`${A11Y_DEMO_RECORDS}`);
    // the status bar holds buttons and is not content of the table
    await expect(page.getByRole('table', { name: 'Music library' }).getByRole('status')).toHaveCount(0);
  });

  test('an empty grid reads its summary as one row with one cell spanning all columns', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('button', { name: 'Remove all records' }).click();
    await waitForGridSettled(page);

    // header row, filter row and the summary row
    await expect.poll(() => rowCount(page)).toBe('3');
    const rows = await ariaRows(page);
    expect(rows.map((r) => r.rowindex)).toEqual(['1', '2', '3']);
    const summary = rows.at(-1)!;
    expect(summary.cells.length).toBe(1);
    expect(summary.cells[0].role).toBe('cell');
    expect(summary.cells[0].colspan).toBe(String(COLUMN_LABELS.length));
    expect(summary.cells[0].text.length, 'the summary cell has no text').toBeGreaterThan(0);
    expect(rows.length, 'records are still exposed').toBe(3);
  });
});
