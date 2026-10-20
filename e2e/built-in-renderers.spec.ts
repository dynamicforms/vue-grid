/**
 * @file e2e/built-in-renderers.spec.ts
 *
 * Every cell of a built-in renderer fills its grid area, and a swatch, a link or the framed `null` keeps its own size
 * inside it. In the `-fast` variants the element is the cell itself. Runs against `docs/examples/built-in-renderers.md`.
 */
import { expect, type Locator, type Page, test } from '@playwright/test';

const grid = (page: Page, renderer: string) =>
  page.locator('.built-in-renderers').filter({ has: page.locator(`.df-grid.header .df-grid.cell.${renderer}`) });

const firstCell = (page: Page, renderer: string) =>
  grid(page, renderer).locator(`.df-anchored .df-grid.cell.${renderer}`).first();

const width = async (locator: Locator) => (await locator.boundingBox())!.width;

test.describe('built-in renderers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/built-in-renderers');
    await page.waitForSelector('.built-in-renderers .df-anchored .df-grid.cell');
  });

  test('a cell fills its grid area', async ({ page }) => {
    for (const renderer of ['color', 'null-null', 'link', 'email', 'file']) {
      // eslint-disable-next-line no-await-in-loop -- one measurement after another
      const size = await firstCell(page, renderer).evaluate((cell) => {
        // every column of the demo is as wide as the first, and every cell of a row is as tall as the row
        const body = cell.closest('.df-grid.body-grid')!;
        const track = parseFloat(getComputedStyle(body).gridTemplateColumns);
        const row = [...cell.parentElement!.querySelectorAll(':scope > .df-grid.cell')];
        const rowHeight = Math.max(...row.map((c) => c.getBoundingClientRect().height));
        const rect = cell.getBoundingClientRect();
        return { width: rect.width, track, height: rect.height, rowHeight };
      });
      expect(size.width, renderer).toBeCloseTo(size.track, 0);
      expect(size.height, renderer).toBeCloseTo(size.rowHeight, 0);
    }
  });

  test('a swatch, a link and the framed null keep their own size inside the cell', async ({ page }) => {
    const swatch = await firstCell(page, 'color').evaluate((cell) => {
      const before = getComputedStyle(cell, '::before');
      return { width: parseFloat(before.width), height: parseFloat(before.height), fontSize: parseFloat(before.fontSize) };
    });
    expect(swatch.width).toBeCloseTo(1.25 * swatch.fontSize, 0);
    expect(swatch.height).toBeCloseTo(1.25 * swatch.fontSize, 0);

    for (const [renderer, inner] of [
      ['null-null', '.df-cell-null'],
      ['link', 'a'],
      ['email', 'a'],
      ['file', 'a'],
    ]) {
      const cell = firstCell(page, renderer);
      // eslint-disable-next-line no-await-in-loop -- one measurement after another
      expect(await width(cell.locator(inner)), renderer).toBeLessThan(await width(cell));
    }
  });

  test('in a -fast variant the element is the cell', async ({ page }) => {
    for (const renderer of ['link-fast', 'email-fast', 'file-fast']) {
      // eslint-disable-next-line no-await-in-loop -- one renderer after another
      expect(await firstCell(page, renderer).evaluate((cell) => cell.tagName), renderer).toBe('A');
    }
    await expect(firstCell(page, 'null-null-fast')).toHaveClass(/df-cell-null/);
  });

  test('a click beside the link of a file cell reaches the row, in a file-fast cell it does not', async ({ page }) => {
    const lastClick = grid(page, 'file').locator('.last-click');

    await firstCell(page, 'file-fast').click({ position: { x: (await width(firstCell(page, 'file-fast'))) - 3, y: 5 } });
    await expect(lastClick).toHaveText('Last row click: —');

    await firstCell(page, 'file').click({ position: { x: (await width(firstCell(page, 'file'))) - 3, y: 5 } });
    await expect(lastClick).toHaveText('Last row click: 1');
  });
});
