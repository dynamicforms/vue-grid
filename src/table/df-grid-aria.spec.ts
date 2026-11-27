/**
 * @file df-grid-aria.spec.ts
 *
 * Tests the table semantics df-grid.vue renders: the table element and its `aria-owns` order, the body rowgroup,
 * record rows with `aria-rowindex` (also with windowing and with the filter row), `aria-rowcount` (also with a local
 * and an external filter), `aria-selected`, the summary row and the slot props of `#item` and `#summary-bar`.
 */

import { Field, Group } from '@dynamicforms/vue-forms';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommentVNode, createTextVNode, defineComponent, Fragment, h, ref } from 'vue';

import { filterExternal } from './columns-filtering';
import DfGrid from './df-grid.vue';
import * as windowingModule from './use-grid-windowing';

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));
vi.mock('./df-grid-header.vue', () => ({
  default: { name: 'DfGridHeader', props: ['domId', 'showFilterRow'], template: '<div/>' },
}));
vi.mock('./incoming-arc.vue', () => ({ default: { name: 'IncomingArc', template: '<div/>' } }));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();
  return {
    rowBaseVars: actual.rowBaseVars,
    headerRowBaseVars: actual.headerRowBaseVars,
    GridCard: {
      name: 'GridCard',
      props: ['item', 'columns', 'renderers', 'noWrapperItem', 'cellAttrs'],
      template: '<div/>',
    },
    ShadowGrid: { name: 'ShadowGrid', template: '<div class="shadow-grid"/>' },
    useHeaderContent: () => ({ provideHeaderContent: () => ref([]) }),
  };
});

vi.mock('./cell-renderers', () => ({
  DefaultRenderers: {},
  gridColumnCreate: vi.fn(),
  gridDestroy: vi.fn(),
  RendererOptionsMap: {},
}));

vi.mock('./cell-renderers/internal-exports', () => ({
  columnIdOption: Symbol('columnId'),
  columnNameOption: Symbol('columnName'),
  gridIdOption: Symbol('gridId'),
  CellOptionsInternal: {},
}));

vi.mock('./use-excessive-scroll', () => ({ useExcessiveScroll: () => ({ amount: ref(0) }) }));

// The mounted window is set by the test: `start` / `end` index into the sorted records.
vi.mock('./use-grid-windowing', async () => {
  const { computed, ref: vueRef } = await import('vue');
  const mountedWindow = { start: vueRef(0), end: vueRef(Number.POSITIVE_INFINITY) };
  return {
    testWindow: mountedWindow,
    useGridWindowing: (options: { records: { value: unknown[] } }) => ({
      start: mountedWindow.start,
      end: computed(() => Math.min(mountedWindow.end.value, options.records.value.length)),
      recompute: () => {},
      setMeasured: () => {},
      topSpacerHeight: vueRef(100),
      bottomSpacerHeight: vueRef(100),
      totalHeight: vueRef(0),
      rowHeights: new Map(),
    }),
  };
});

const testWindow = (windowingModule as any).testWindow as {
  start: { value: number };
  end: { value: number };
};

const records = Array.from({ length: 6 }, (_, i) => ({ id: i, name: `Row ${i}`, city: `City ${i}` }));
const columns = [
  { fieldName: 'name', label: 'Name' },
  { fieldName: 'city', label: 'City' },
];

function mountGrid(props: Record<string, any> = {}, slots: Record<string, any> = {}) {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id', ...props },
    slots,
    global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
  });
}

async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
    await flushPromises();
  }
}

function table(wrapper: VueWrapper<any>) {
  return wrapper.find('[role="table"]');
}

/** The id prefix the grid hands to its header. */
function domId(wrapper: VueWrapper<any>): string {
  return wrapper.findComponent({ name: 'DfGridHeader' }).props('domId');
}

function recordRows(wrapper: VueWrapper<any>) {
  return wrapper.findAll('.df-anchored');
}

describe('DfGrid — table semantics', () => {
  beforeEach(() => {
    const getPropertyValue = (prop: string) => (prop === 'width' ? '400px' : '100px');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);
    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
    testWindow.start.value = 0;
    testWindow.end.value = Number.POSITIVE_INFINITY;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('roles', () => {
    it('renders the body as a table holding the body rowgroup', async () => {
      const wrapper = mountGrid();
      await settle();
      const tableEl = table(wrapper);
      expect(tableEl.exists()).toBe(true);
      expect(tableEl.classes()).toContain('df-grid-body');
      const rowgroup = tableEl.find('[role="rowgroup"]');
      expect(rowgroup.attributes('data-section')).toBe('body');
      expect(rowgroup.attributes('id')).toBe(`${domId(wrapper)}-body`);
      // the rowgroup is the scroll container: focusable, so it scrolls from the keyboard
      expect(rowgroup.attributes('tabindex')).toBe('0');
    });

    it('gives every record a row, its anchor role none and its cells role cell', async () => {
      const wrapper = mountGrid();
      await settle();
      const rows = recordRows(wrapper);
      expect(rows).toHaveLength(records.length);
      rows.forEach((row) => {
        expect(row.attributes('role')).toBe('row');
        expect(row.find('.df-grid.card').attributes('role')).toBe('none');
      });
      wrapper.findAllComponents({ name: 'GridCard' }).forEach((card) => {
        expect(card.props('cellAttrs')).toEqual({ role: 'cell' });
      });
    });

    it('hands each grid of an application its own id prefix', async () => {
      const wrapper = mount(
        defineComponent({
          setup: () => () => [
            h(DfGrid, { columns, records, keyField: 'id' }),
            h(DfGrid, { columns, records, keyField: 'id' }),
          ],
        }),
        { global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } } },
      );
      await settle();
      const ids = wrapper.findAllComponents({ name: 'DfGridHeader' }).map((header) => header.props('domId'));
      expect(ids).toHaveLength(2);
      expect(ids[0]).toBeTruthy();
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('name and description', () => {
    it('renders ariaLabel, ariaLabelledby and ariaDescribedby on the table', async () => {
      const wrapper = mountGrid({ ariaLabel: 'Departures', ariaLabelledby: 'heading', ariaDescribedby: 'help' });
      await settle();
      expect(table(wrapper).attributes('aria-label')).toBe('Departures');
      expect(table(wrapper).attributes('aria-labelledby')).toBe('heading');
      expect(table(wrapper).attributes('aria-describedby')).toBe('help');
    });

    it('renders no name attributes without the props', async () => {
      const wrapper = mountGrid();
      await settle();
      expect(table(wrapper).attributes('aria-label')).toBeUndefined();
      expect(table(wrapper).attributes('aria-labelledby')).toBeUndefined();
      expect(table(wrapper).attributes('aria-describedby')).toBeUndefined();
    });
  });

  describe('aria-owns', () => {
    it('lists the header row and the body rowgroup', async () => {
      const wrapper = mountGrid();
      await settle();
      const id = domId(wrapper);
      expect(table(wrapper).attributes('aria-owns')).toBe(`${id}-header ${id}-body`);
    });

    it('lists the filter row after the header row when it is shown', async () => {
      const wrapper = mountGrid({ showFilterRow: true });
      await settle();
      const id = domId(wrapper);
      expect(table(wrapper).attributes('aria-owns')).toBe(`${id}-header ${id}-filter ${id}-body`);
    });

    it('lists the summary row last while it holds a cell', async () => {
      const wrapper = mountGrid({ loading: true });
      await settle();
      const id = domId(wrapper);
      expect(table(wrapper).attributes('aria-owns')).toBe(`${id}-header ${id}-body ${id}-summary`);
    });
  });

  describe('row count and position', () => {
    it('counts the header row and the records', async () => {
      const wrapper = mountGrid();
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe(String(records.length + 1));
      expect(recordRows(wrapper).map((row) => row.attributes('aria-rowindex'))).toEqual(['2', '3', '4', '5', '6', '7']);
    });

    it('counts the filter row as a second header row', async () => {
      const wrapper = mountGrid({ showFilterRow: true });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe(String(records.length + 2));
      expect(recordRows(wrapper)[0].attributes('aria-rowindex')).toBe('3');
    });

    it('counts the records the application reports in recordCount', async () => {
      const wrapper = mountGrid({ recordCount: { matching: 1000, total: 5000 } });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe('1001');
    });

    it('counts the records that pass a local filter', async () => {
      const named = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map((name, id) => ({ id, name }));
      const filterState = new Group({ name: new Field({ value: 'ta' }) });
      const wrapper = mountGrid({
        records: named,
        columns: [{ fieldName: 'name', label: 'Name', filterable: true }],
        filterState,
      });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe('4');
      expect(recordRows(wrapper).map((row) => row.attributes('aria-rowindex'))).toEqual(['2', '3', '4']);
    });

    it('counts the loaded records while a column filters externally', async () => {
      const filterState = new Group({ city: new Field({ value: 'City 1' }) });
      const wrapper = mountGrid({
        columns: [
          { fieldName: 'name', label: 'Name' },
          { fieldName: 'city', label: 'City', filterable: { key: filterExternal } },
        ],
        filterState,
      });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe(String(records.length + 1));
      expect(recordRows(wrapper)).toHaveLength(records.length);
    });

    it('indexes rows over the whole data set while the top spacer is active', async () => {
      testWindow.start.value = 2;
      testWindow.end.value = 4;
      const wrapper = mountGrid({ showFilterRow: true });
      await settle();
      const spacers = wrapper.findAll('.df-grid-row-spacer');
      expect(spacers).toHaveLength(2);
      spacers.forEach((spacer) => expect(spacer.attributes('aria-hidden')).toBe('true'));
      expect(recordRows(wrapper).map((row) => row.attributes('data-idx'))).toEqual(['2', '3']);
      expect(recordRows(wrapper).map((row) => row.attributes('aria-rowindex'))).toEqual(['5', '6']);
      expect(table(wrapper).attributes('aria-rowcount')).toBe(String(records.length + 2));
    });
  });

  describe('aria-selected', () => {
    it('is absent while selection mode is inactive', async () => {
      const wrapper = mountGrid();
      await settle();
      recordRows(wrapper).forEach((row) => expect(row.attributes('aria-selected')).toBeUndefined());
    });

    it('marks selected and unselected rows in selection mode', async () => {
      const wrapper = mountGrid({ selectionMode: 'selection', selectionKeys: new Set([1, 3]) });
      await settle();
      expect(recordRows(wrapper).map((row) => row.attributes('aria-selected'))).toEqual([
        'false',
        'true',
        'false',
        'true',
        'false',
        'false',
      ]);
    });

    it('marks the rows not excluded as selected in exclusion mode', async () => {
      const wrapper = mountGrid({ selectionMode: 'exclusion', selectionKeys: new Set([0]) });
      await settle();
      expect(recordRows(wrapper)[0].attributes('aria-selected')).toBe('false');
      expect(recordRows(wrapper)[1].attributes('aria-selected')).toBe('true');
    });
  });

  describe('summary row', () => {
    it('is a row with one cell spanning all columns while loading', async () => {
      const wrapper = mountGrid({ loading: true });
      await settle();
      const summary = wrapper.find('.df-summary-bar');
      expect(summary.attributes('role')).toBe('row');
      expect(summary.attributes('id')).toBe(`${domId(wrapper)}-summary`);
      const cells = summary.findAll('[role="cell"]');
      expect(cells).toHaveLength(1);
      expect(cells[0].classes()).toContain('df-summary-loading');
      expect(cells[0].attributes('aria-colspan')).toBe(String(columns.length));
    });

    it('holds the no-data cell without records', async () => {
      const wrapper = mountGrid({ records: [] });
      await settle();
      const summary = wrapper.find('.df-summary-bar');
      expect(summary.attributes('role')).toBe('row');
      expect(summary.find('[role="cell"]').classes()).toContain('df-summary-no-data');
    });

    it('is the last counted row of an empty grid', async () => {
      const wrapper = mountGrid({ records: [] });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe('2');
      expect(wrapper.find('.df-summary-bar').attributes('aria-rowindex')).toBe('2');
    });

    it('follows the records while loading', async () => {
      const wrapper = mountGrid({ loading: true });
      await settle();
      const rowCount = String(records.length + 2);
      expect(table(wrapper).attributes('aria-rowcount')).toBe(rowCount);
      expect(wrapper.find('.df-summary-bar').attributes('aria-rowindex')).toBe(rowCount);
    });

    it('is no row while it holds nothing', async () => {
      const wrapper = mountGrid({ showSummaryBar: true });
      await settle();
      const summary = wrapper.find('.df-summary-bar');
      expect(summary.exists()).toBe(true);
      expect(summary.attributes('role')).toBeUndefined();
      expect(table(wrapper).attributes('aria-owns')).not.toContain('-summary');
    });

    it('hands cellAttrs to the summary-bar slot', async () => {
      let received: Record<string, unknown> | undefined;
      const wrapper = mountGrid(
        { showSummaryBar: true },
        {
          'summary-bar': (slotProps: { cellAttrs: Record<string, unknown> }) => {
            received = slotProps.cellAttrs;
            return h('div', { class: 'my-summary', ...slotProps.cellAttrs }, 'Total');
          },
        },
      );
      await settle();
      expect(received).toEqual({ role: 'cell', 'aria-colspan': columns.length });
      expect(wrapper.find('.df-summary-bar').attributes('role')).toBe('row');
      expect(wrapper.find('.my-summary').attributes('role')).toBe('cell');
    });
  });

  describe('summary row position', () => {
    it('follows the header and filter rows in an empty grid', async () => {
      const wrapper = mountGrid({ records: [], showFilterRow: true });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe('3');
      expect(wrapper.find('.df-summary-bar').attributes('aria-rowindex')).toBe('3');
    });

    it('is not counted while it is no row', async () => {
      const wrapper = mountGrid({ showSummaryBar: true });
      await settle();
      expect(table(wrapper).attributes('aria-rowcount')).toBe(String(records.length + 1));
      expect(wrapper.find('.df-summary-bar').attributes('aria-rowindex')).toBeUndefined();
    });
  });

  describe('summary-bar slot without output', () => {
    it.each([
      ['renders nothing', () => []],
      ['renders only a v-if comment', () => [createCommentVNode('v-if', true)]],
      ['renders blank text', () => [createTextVNode('  ')]],
    ])('is no row when the slot %s', async (_name, slot) => {
      const wrapper = mountGrid({ loading: true }, { 'summary-bar': slot });
      await settle();
      const summary = wrapper.find('.df-summary-bar');
      expect(summary.exists()).toBe(true);
      expect(summary.attributes('role')).toBeUndefined();
      expect(summary.attributes('aria-rowindex')).toBeUndefined();
      expect(table(wrapper).attributes('aria-owns')).not.toContain('-summary');
      expect(table(wrapper).attributes('aria-rowcount')).toBe(String(records.length + 1));
    });

    it('is a row when the slot renders an element inside a fragment', async () => {
      const wrapper = mountGrid(
        { showSummaryBar: true },
        {
          'summary-bar': (slotProps: { cellAttrs: Record<string, unknown> }) => [
            h(Fragment, [createCommentVNode('v-if', true), h('div', slotProps.cellAttrs, 'Total')]),
          ],
        },
      );
      await settle();
      expect(wrapper.find('.df-summary-bar').attributes('role')).toBe('row');
      expect(table(wrapper).attributes('aria-owns')).toContain('-summary');
    });
  });

  describe('#item slot', () => {
    it('hands cellAttrs to the slot and keeps the row attributes on the wrapper', async () => {
      const received: Record<string, unknown>[] = [];
      const wrapper = mountGrid(
        { selectionMode: 'selection', selectionKeys: new Set([0]) },
        {
          item: (slotProps: { item: { name: string }; cellAttrs: Record<string, unknown> }) => {
            received.push(slotProps.cellAttrs);
            return h('div', { class: 'my-cell', ...slotProps.cellAttrs }, slotProps.item.name);
          },
        },
      );
      await settle();
      expect(received.length).toBeGreaterThan(0);
      received.forEach((attrs) => expect(attrs).toEqual({ role: 'cell' }));
      const first = recordRows(wrapper)[0];
      expect(first.attributes('role')).toBe('row');
      expect(first.attributes('aria-rowindex')).toBe('2');
      expect(first.attributes('aria-selected')).toBe('true');
      expect(first.find('.my-cell').attributes('role')).toBe('cell');
    });
  });
});
