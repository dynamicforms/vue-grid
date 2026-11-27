/**
 * @file df-grid-header-aria.spec.ts
 *
 * Tests the table semantics of df-grid-header.vue: the header row and the filter row with their ids and
 * `aria-rowindex`, the cell roles, and the `rowAttrs` / `cellAttrs` props of the `#header` slot.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import type { ColumnDefinition } from './columns';
import { createFilterState } from './columns-filtering';
import DfGridHeader from './df-grid-header.vue';

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));

vi.mock('@dynamicforms/vuetify-inputs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dynamicforms/vuetify-inputs')>()),
  DfInput: { name: 'DfInput', template: '<input />' },
  DfSelect: { name: 'DfSelect', template: '<select />' },
  DfCheckbox: { name: 'DfCheckbox', template: '<input type="checkbox" />' },
  DfDateTime: { name: 'DfDateTime', template: '<input type="date" />' },
}));

vi.mock('./helpers', () => ({
  GridCard: { name: 'GridCard', props: ['item', 'columns', 'renderers', 'cellAttrs'], template: '<div/>' },
  useHeaderContent: () => ({ setHeaderContent: vi.fn() }),
  headerRowBaseVars: (rowsPerRecord: number) => ({ '--row-base': '0', '--rows-per-record': `${rowsPerRecord}` }),
}));

vi.mock('./cell-renderers', () => ({
  DefaultRenderers: {},
  gridColumnCreate: vi.fn(),
}));

vi.mock('./cell-renderers/internal-exports', () => ({
  columnIdOption: Symbol('columnId'),
  columnNameOption: Symbol('columnName'),
  gridIdOption: Symbol('gridId'),
}));

const columns: ColumnDefinition[] = [
  { fieldName: 'line', label: 'Line', filterable: true },
  { fieldName: 'departure', label: 'Departure' },
];

function mountHeader(props: Record<string, any> = {}, slots: Record<string, any> = {}) {
  return mount(DfGridHeader, {
    props: {
      columns,
      gridId: Symbol('grid'),
      gridClass: '',
      sortState: [],
      filterState: createFilterState(columns),
      domId: 'grid-1',
      ...props,
    },
    slots,
  });
}

describe('DfGridHeader — table semantics', () => {
  it('renders the header row with its id, role and aria-rowindex 1', () => {
    const card = mountHeader().findComponent({ name: 'GridCard' });
    expect(card.attributes('id')).toBe('grid-1-header');
    expect(card.attributes('role')).toBe('row');
    expect(card.attributes('aria-rowindex')).toBe('1');
  });

  it('gives the header cells role columnheader', () => {
    const card = mountHeader().findComponent({ name: 'GridCard' });
    expect(card.props('cellAttrs')).toEqual({ role: 'columnheader' });
  });

  it('renders no header row id without domId', () => {
    const card = mountHeader({ domId: undefined }).findComponent({ name: 'GridCard' });
    expect(card.attributes('id')).toBeUndefined();
    expect(card.attributes('role')).toBe('row');
  });

  it('renders the filter row as row 2 with cells', () => {
    const filterRow = mountHeader({ showFilterRow: true }).find('.filter-row');
    expect(filterRow.attributes('id')).toBe('grid-1-filter');
    expect(filterRow.attributes('role')).toBe('row');
    expect(filterRow.attributes('aria-rowindex')).toBe('2');
    const cells = filterRow.findAll('.filter-cell');
    expect(cells).toHaveLength(columns.length);
    cells.forEach((cell) => expect(cell.attributes('role')).toBe('cell'));
  });

  it('keeps the status bar out of the rows', () => {
    const statusBar = mountHeader({ showStatusBar: true }).find('.df-status-bar');
    expect(statusBar.exists()).toBe(true);
    expect(statusBar.attributes('id')).toBeUndefined();
    expect(statusBar.attributes('aria-rowindex')).toBeUndefined();
  });

  it('hands rowAttrs and cellAttrs to the #header slot', () => {
    let received: { rowAttrs: Record<string, unknown>; cellAttrs: Record<string, unknown> } | undefined;
    const wrapper = mountHeader(
      {},
      {
        header: (slotProps: any) => {
          received = { rowAttrs: slotProps.rowAttrs, cellAttrs: slotProps.cellAttrs };
          return h('div', { class: 'my-header', ...slotProps.rowAttrs }, [
            h('div', { class: 'my-cell', ...slotProps.cellAttrs }, 'Line'),
          ]);
        },
      },
    );
    expect(received!.rowAttrs).toEqual({ id: 'grid-1-header', role: 'row', 'aria-rowindex': 1 });
    expect(received!.cellAttrs).toEqual({ role: 'columnheader' });
    const row = wrapper.find('.my-header');
    expect(row.attributes('id')).toBe('grid-1-header');
    expect(row.attributes('role')).toBe('row');
    expect(row.find('.my-cell').attributes('role')).toBe('columnheader');
  });
});
