/**
 * @file e2e/a11y-helpers.ts
 *
 * Helpers for the accessibility tests. They read the table semantics from ARIA attributes only: the table element
 * (`role="table"`), the elements it lists in `aria-owns` and the rows and cells inside them. Elements hidden from the
 * accessibility tree (`aria-hidden`, `visibility: hidden`, `display: none`) are skipped, so the hidden
 * header-measurement clone and the shadow grids never count as rows or cells.
 */
import { CDPSession, expect, Page } from '@playwright/test';

import { waitForGridSettled } from './grid-settled';

export interface AriaCell {
  role: string;
  text: string;
  colspan: string | null;
  /** The cell's field-name class (third class token, after `df-grid` and `cell`). */
  field: string | null;
}

export interface AriaRow {
  rowindex: string | null;
  selected: string | null;
  cells: AriaCell[];
}

export const A11Y_DEMO_RECORDS = 400;

/** Opens `docs/examples/a11y` and waits until the grid has rendered records and settled. */
export async function openA11yDemo(page: Page): Promise<void> {
  await page.goto('/examples/a11y');
  await page.waitForSelector('[role="table"] [role="row"] [role="cell"]', { timeout: 20_000 });
  expect(await waitForGridSettled(page), 'the grid did not settle').toBe(true);
}

/**
 * Rows of the table in accessibility-tree reading order: the elements listed in the table's `aria-owns`, in that
 * order, each either a row itself or a container of rows.
 */
export function ariaRows(page: Page): Promise<AriaRow[]> {
  return page.evaluate(() => {
    const exposed = (el: Element): boolean => {
      if (el.closest('[aria-hidden="true"]')) return false;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none') return false;
      }
      return true;
    };
    const table = document.querySelector('[role="table"]');
    if (!table) return [];
    const owned = (table.getAttribute('aria-owns') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const rows: Element[] = [];
    for (const el of owned) {
      if (el.getAttribute('role') === 'row') rows.push(el);
      else rows.push(...Array.from(el.querySelectorAll('[role="row"]')));
    }
    return rows.filter(exposed).map((row) => ({
      rowindex: row.getAttribute('aria-rowindex'),
      selected: row.getAttribute('aria-selected'),
      cells: Array.from(row.querySelectorAll('[role="cell"], [role="columnheader"]'))
        .filter((cell) => cell.closest('[role="row"]') === row && exposed(cell))
        .map((cell) => ({
          role: cell.getAttribute('role')!,
          text: (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
          colspan: cell.getAttribute('aria-colspan'),
          field: cell.classList.contains('cell') ? (cell.classList[2] ?? null) : null,
        })),
    }));
  });
}

/** Rows whose cells are record cells (`role="cell"` without a filter input), in reading order. */
export function recordRows(rows: AriaRow[], headerRows: number): AriaRow[] {
  return rows.slice(headerRows).filter((row) => row.cells.length > 0 && row.cells.every((c) => c.colspan === null));
}

/** Value of the table's `aria-rowcount`. */
export function rowCount(page: Page): Promise<string | null> {
  return page.locator('[role="table"]').getAttribute('aria-rowcount');
}

/** Scrolls the body grid to its end until the scroll position and the windowed rows stop changing. */
export async function scrollGridToEnd(page: Page): Promise<void> {
  /* eslint-disable no-await-in-loop -- each scroll must land before the next end position is read */
  for (let attempt = 0; attempt < 10; attempt++) {
    const atEnd = await page.evaluate(() => {
      const scroller = document.querySelector<HTMLElement>('.df-grid.body-grid')!;
      const before = scroller.scrollTop;
      scroller.scrollTop = scroller.scrollHeight;
      return Math.abs(scroller.scrollTop - before) < 1;
    });
    await waitForGridSettled(page);
    if (atEnd) return;
  }
  /* eslint-enable no-await-in-loop */
}

interface AXNode {
  nodeId: string;
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  childIds?: string[];
}

export interface EngineRow {
  cells: { role: string; name: string }[];
}

/**
 * Rows of the table named `tableName` as Chromium's own accessibility tree orders them (CDP
 * `Accessibility.getFullAXTree`), with the role and name of each row's cells. Ignored and generic nodes are walked
 * through, as a screen reader does.
 */
export async function chromiumEngineRows(cdp: CDPSession, tableName: string): Promise<EngineRow[] | null> {
  await cdp.send('Accessibility.enable');
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AXNode[] };
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const table = nodes.find((node) => node.role?.value === 'table' && node.name?.value === tableName);
  if (!table) return null;

  const children = (node: AXNode) => (node.childIds ?? []).map((id) => byId.get(id)).filter((n): n is AXNode => !!n);
  const cellRoles = new Set(['cell', 'gridcell', 'columnheader']);
  const collectCells = (node: AXNode, out: EngineRow['cells']) => {
    for (const child of children(node)) {
      const role = child.role?.value ?? '';
      if (!child.ignored && cellRoles.has(role)) out.push({ role, name: child.name?.value ?? '' });
      else if (role !== 'row') collectCells(child, out);
    }
  };
  const rows: EngineRow[] = [];
  const collectRows = (node: AXNode) => {
    for (const child of children(node)) {
      if (!child.ignored && child.role?.value === 'row') {
        const cells: EngineRow['cells'] = [];
        collectCells(child, cells);
        rows.push({ cells });
      } else collectRows(child);
    }
  };
  collectRows(table);
  return rows;
}
