/**
 * @file e2e/a11y-axe.spec.ts
 *
 * axe-core finds no serious or critical violation in the grid of the accessibility demo (`docs/examples/a11y`) when it
 * is sorted, filtered, in selection mode with a selected row, and empty. The scan covers the grid element only, so the
 * docs site around it does not take part.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

import { openA11yDemo } from './a11y-helpers';
import { waitForGridSettled } from './grid-settled';

async function expectNoSeriousViolations(page: Page) {
  await waitForGridSettled(page);
  const results = await new AxeBuilder({ page }).include('.df-grid.container').analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }));
  expect(serious).toEqual([]);
}

test.describe('axe', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('a sorted grid', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('button', { name: /Sort by Year/ }).click();
    await expect(page.getByRole('columnheader', { name: 'Year', exact: true })).toHaveAttribute('aria-sort', 'ascending');
    await expectNoSeriousViolations(page);
  });

  test('a filtered grid', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('textbox', { name: /Filter Artist/ }).fill('Queen');
    await expect.poll(() => page.locator('[role="table"]').getAttribute('aria-rowcount'), { timeout: 10_000 }).toBe('82');
    await expectNoSeriousViolations(page);
  });

  test('a grid in selection mode', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('cell', { name: 'Track 003', exact: true }).click({ modifiers: ['Shift'] });
    await expect(
      page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Track 003', exact: true }) }),
    ).toHaveAttribute('aria-selected', 'true');
    await expectNoSeriousViolations(page);
  });

  test('an empty grid', async ({ page }) => {
    await openA11yDemo(page);
    await page.getByRole('button', { name: 'Remove all records' }).click();
    // header row, filter row and the summary row
    await expect.poll(() => page.locator('[role="table"]').getAttribute('aria-rowcount')).toBe('3');
    await expectNoSeriousViolations(page);
  });
});
