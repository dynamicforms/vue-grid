/**
 * @file df-grid-summary-slot.spec.ts
 *
 * Tests the summary row with the `#summary-bar` slot in df-grid.vue: a single element root is the summary cell
 * without binding `cellAttrs`, and other slot output leaves the summary bar out of the table rows.
 */

import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Comment, Fragment, h, ref } from 'vue';

import DfGrid from './df-grid.vue';

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

const records = Array.from({ length: 3 }, (_, i) => ({ id: i, name: `Row ${i}`, city: `City ${i}` }));
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

function summary(wrapper: VueWrapper<any>) {
  return wrapper.find('.df-summary-bar');
}

describe('DfGrid — #summary-bar slot', () => {
  beforeEach(() => {
    const getPropertyValue = (prop: string) => (prop === 'width' ? '400px' : '100px');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);
    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('makes the single element root of the slot the summary cell', async () => {
    const wrapper = mountGrid(
      { showSummaryBar: true },
      { 'summary-bar': () => h('div', { class: 'my-summary' }, 'Total') },
    );
    await settle();
    expect(summary(wrapper).attributes('role')).toBe('row');
    expect(summary(wrapper).element.children).toHaveLength(1);
    const cell = summary(wrapper).find('.my-summary');
    expect(cell.attributes('role')).toBe('cell');
    expect(cell.attributes('aria-colspan')).toBe(String(columns.length));
    expect(cell.text()).toBe('Total');
    expect(table(wrapper).attributes('aria-owns')).toContain('-summary');
  });

  it('finds the element root beside comments and inside a fragment', async () => {
    const wrapper = mountGrid(
      { showSummaryBar: true },
      { 'summary-bar': () => [h(Comment, 'v-if'), h(Fragment, [h('span', { class: 'my-summary' }, 'Total')])] },
    );
    await settle();
    expect(summary(wrapper).attributes('role')).toBe('row');
    expect(summary(wrapper).find('.my-summary').attributes('role')).toBe('cell');
  });

  it('is no row with several root elements', async () => {
    const wrapper = mountGrid(
      { showSummaryBar: true },
      { 'summary-bar': () => [h('span', { class: 'a' }, 'A'), h('span', { class: 'b' }, 'B')] },
    );
    await settle();
    expect(summary(wrapper).attributes('role')).toBeUndefined();
    expect(summary(wrapper).find('.a').attributes('role')).toBeUndefined();
    expect(summary(wrapper).find('.b').exists()).toBe(true);
    expect(table(wrapper).attributes('aria-owns')).not.toContain('-summary');
  });

  it('is no row with text only or nothing', async () => {
    const text = mountGrid({ showSummaryBar: true }, { 'summary-bar': () => 'Total' });
    const empty = mountGrid({ showSummaryBar: true }, { 'summary-bar': () => [h(Comment, 'v-if')] });
    await settle();
    expect(summary(text).attributes('role')).toBeUndefined();
    expect(summary(text).text()).toBe('Total');
    expect(summary(empty).attributes('role')).toBeUndefined();
    expect(table(empty).attributes('aria-owns')).not.toContain('-summary');
  });

  it('runs the slot once per render', async () => {
    let calls = 0;
    let renders = 0;
    const countRenders = {
      beforeMount(this: any) {
        if (this.$.type.__name === (DfGrid as any).__name) renders += 1;
      },
      beforeUpdate(this: any) {
        if (this.$.type.__name === (DfGrid as any).__name) renders += 1;
      },
    };
    const wrapper = mount(DfGrid, {
      props: { columns, records, keyField: 'id', showSummaryBar: true },
      slots: {
        'summary-bar': () => {
          calls += 1;
          return h('div', 'Total');
        },
      },
      global: { mixins: [countRenders], directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
    });
    await settle();
    await wrapper.setProps({ showFilterRow: true });
    await settle();
    expect(renders).toBeGreaterThan(1);
    expect(calls).toBe(renders);
  });
});
