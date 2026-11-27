/**
 * @file e2e/a11y-keyboard.spec.ts
 *
 * Keyboard-only use of the accessibility demo (`docs/examples/a11y`): Tab reaches each column's sort button, Enter and
 * Space sort like a click on the header cell, Shift+Enter and Shift+Space add the column to a multi-column sort like a
 * Shift+click. The selection bar's cancel and invert controls are buttons that Enter and Space activate. Tab reaches the
 * record list, which scrolls with Page Down and End.
 *
 * Every key press goes through the keyboard; the mouse is not used except to enter selection mode, which is a mouse
 * or touch gesture.
 */
import { expect, Locator, Page, test } from '@playwright/test';

import { A11Y_DEMO_RECORDS, ariaRows, openA11yDemo, recordRows } from './a11y-helpers';
import { waitForGridSettled } from './grid-settled';

/** Presses Tab from the demo's last control before the grid until `target` has focus. */
async function tabTo(page: Page, target: Locator) {
  await page.getByRole('button', { name: 'Remove all records' }).focus();
  /* eslint-disable no-await-in-loop -- each Tab moves focus from where the previous one left it */
  for (let presses = 0; presses < 40; presses++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  /* eslint-enable no-await-in-loop */
  await expect(target, 'Tab did not reach the element').toBeFocused();
}

async function columnValues(page: Page, column: number): Promise<string[]> {
  await waitForGridSettled(page);
  return recordRows(await ariaRows(page), 2).map((row) => row.cells[column].text);
}

const YEAR = 3;
const TITLE = 1;

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('the sort buttons are in the tab order with a name per column', async ({ page }) => {
    await openA11yDemo(page);
    for (const label of ['Id', 'Title', 'Artist', 'Year']) {
      const button = page.getByRole('button', { name: new RegExp(`Sort by ${label}`) });
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAttribute('tabindex', '0');
    }
    await tabTo(page, page.getByRole('button', { name: /Sort by Year/ }));
  });

  test('Enter and Space sort the column', async ({ page }) => {
    await openA11yDemo(page);
    const year = page.getByRole('columnheader', { name: 'Year', exact: true });
    await tabTo(page, page.getByRole('button', { name: /Sort by Year/ }));

    await page.keyboard.press('Enter');
    await expect(year).toHaveAttribute('aria-sort', 'ascending');
    const ascending = await columnValues(page, YEAR);
    expect(ascending[0]).toBe('1960');
    expect(ascending).toEqual([...ascending].sort());

    await page.keyboard.press('Space');
    await expect(year).toHaveAttribute('aria-sort', 'descending');
    const descending = await columnValues(page, YEAR);
    expect(descending[0]).toBe('1999');
    expect(descending).toEqual([...descending].sort().reverse());

    await page.keyboard.press('Enter');
    await expect(year).not.toHaveAttribute('aria-sort', /ascending|descending/);
    expect((await columnValues(page, 0)).slice(0, 3)).toEqual(['1', '2', '3']);
  });

  test('Shift+Enter adds a column to a multi-column sort', async ({ page }) => {
    await openA11yDemo(page);
    const year = page.getByRole('columnheader', { name: 'Year', exact: true });
    const title = page.getByRole('columnheader', { name: 'Title', exact: true });
    const yearButton = page.getByRole('button', { name: /Sort by Year/ });
    const titleButton = page.getByRole('button', { name: /Sort by Title/ });

    await tabTo(page, yearButton);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(year).toHaveAttribute('aria-sort', 'descending');

    await tabTo(page, titleButton);
    await page.keyboard.press('Shift+Enter');
    await waitForGridSettled(page);

    await expect(year).toHaveAttribute('aria-sort', 'descending');
    await expect(title).not.toHaveAttribute('aria-sort');
    const years = await columnValues(page, YEAR);
    const titles = await columnValues(page, TITLE);
    expect(years[0]).toBe('1999');
    const firstYearTitles = titles.filter((_, i) => years[i] === '1999');
    expect(firstYearTitles.length).toBeGreaterThan(1);
    expect(firstYearTitles).toEqual([...firstYearTitles].sort());

    // Shift+Space on the secondary column turns it descending; Year stays the primary column
    await page.keyboard.press('Shift+Space');
    await waitForGridSettled(page);
    await expect(year).toHaveAttribute('aria-sort', 'descending');
    const titlesDesc = await columnValues(page, TITLE);
    const yearsDesc = await columnValues(page, YEAR);
    const firstYearTitlesDesc = titlesDesc.filter((_, i) => yearsDesc[i] === '1999');
    expect(firstYearTitlesDesc).toEqual([...firstYearTitlesDesc].sort().reverse());
  });

  test('the selection bar buttons respond to Enter and Space', async ({ page }) => {
    await openA11yDemo(page);
    const row = (title: string) => page.getByRole('row').filter({ has: page.getByRole('cell', { name: title, exact: true }) });
    await page.getByRole('cell', { name: 'Track 003', exact: true }).click({ modifiers: ['Shift'] });
    await expect(row('Track 003')).toHaveAttribute('aria-selected', 'true');

    const invert = page.getByRole('status').getByRole('button', { name: /invert selection/i });
    const cancel = page.getByRole('status').getByRole('button', { name: /cancel selection/i });
    await expect(invert).toHaveAttribute('tabindex', '0');
    await expect(cancel).toHaveAttribute('tabindex', '0');

    await invert.focus();
    await page.keyboard.press('Enter');
    await expect(row('Track 003')).toHaveAttribute('aria-selected', 'false');
    await expect(row('Track 004')).toHaveAttribute('aria-selected', 'true');

    await invert.focus();
    await page.keyboard.press('Space');
    await expect(row('Track 003')).toHaveAttribute('aria-selected', 'true');

    await cancel.focus();
    await page.keyboard.press('Space');
    await expect(row('Track 003')).not.toHaveAttribute('aria-selected');
  });

  test('Tab reaches the record list, which scrolls from the keyboard', async ({ page }) => {
    await openA11yDemo(page);
    const list = page.getByRole('table', { name: 'Music library' }).getByRole('rowgroup');
    const scrollTop = () => list.evaluate((el) => el.scrollTop);
    await tabTo(page, list);
    expect(await scrollTop()).toBe(0);

    await page.keyboard.press('PageDown');
    await expect.poll(scrollTop).toBeGreaterThan(0);

    await page.keyboard.press('End');
    await waitForGridSettled(page);
    // the last record is rendered and in view
    const lastTitle = `Track ${A11Y_DEMO_RECORDS}`;
    const lastRendered = async () => recordRows(await ariaRows(page), 2).at(-1)?.cells[1].text;
    await expect.poll(lastRendered, { timeout: 10_000 }).toBe(lastTitle);
    await expect(page.getByRole('cell', { name: lastTitle, exact: true })).toBeInViewport();
  });
});
