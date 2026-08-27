/**
 * @file df-grid-selection-perf.spec.ts
 *
 * Performance regression test: switching selectionMode must not re-render grid cards.
 *
 * === The bug ===
 *
 * `columnRendererOptionsInternal` in df-grid.vue read `uSelection.selectionMode.value` so
 * Vue would mark the computed dirty whenever selection mode changed. On the next render pass
 * the computed re-ran, produced a new array with new object references, and passed it as
 * `:columns` to every visible GridCard. Every GridCard's `useFormattedData.formattedData`
 * recomputed (O(rows × columns) cell renders). With 500 visible rows this took >1 second.
 *
 * An additional side-effect: `floatGridColumnCreate` stored each newly-created Symbol in
 * `measurements`, so every selectionMode toggle leaked O(columns) entries.
 *
 * === The fix ===
 *
 * Remove `selectionMode` from the computed's dependency set — don't read `selMode` inside
 * `columnRendererOptionsInternal`. The CSS-variable cascade problem (GPU compositing
 * boundary) is already solved by the `watch(isSelectionActive)` handler that sets
 * `--grid-template-columns` directly on each `.virtual-scroll-item` element.
 * Row-class changes (selected / unselected) are handled by the reactive `:class` binding
 * in the template; GridCard itself never needs to know about selection state.
 *
 * === What this test file checks ===
 *
 * 1. [PERF] `gridColumnCreate` is NOT called when selectionMode changes.
 *    `gridColumnCreate` is invoked once per column inside `columnRendererOptionsInternal`.
 *    Calling it on selectionMode change proves the computed re-evaluated unnecessarily.
 *    *** This test FAILS until the fix is applied. ***
 *
 * 2. [PERF] The `columns` prop reference passed to GridCards is stable across selectionMode
 *    changes. The mock GridCard records the most-recent `columns` ref it received. With the
 *    bug the ref changes (new array from the re-evaluated computed); with the fix it stays
 *    the same (Vue returns the cached computed value). A stable ref means GridCard's
 *    `useFormattedData.formattedData` doesn't recompute — O(rows × columns) work is saved.
 *    *** This test FAILS until the fix is applied. ***
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import DfGrid from './df-grid.vue';
import type { SelectionMode } from './selection';

// ===========================================================================
// vi.hoisted — must exist before vi.mock() factories run
// ===========================================================================

const { shadowContainerEl, lastSeenColumns } = vi.hoisted(() => ({
  shadowContainerEl: document.createElement('div'),
  // Tracks the most-recent `columns` prop reference received by any GridCard render.
  lastSeenColumns: { value: null as unknown[] | null },
}));

// ===========================================================================
// Module mocks
// ===========================================================================

vi.mock('@pdanpdan/virtual-scroll', () => ({
  VirtualScroll: defineComponent({
    name: 'MockVirtualScroll',
    props: { items: { type: Array, default: () => [] }, loading: Boolean },
    setup(props, { slots }) {
      return () =>
        h('div', { class: 'virtual-scroll', 'data-section': 'body' }, [
          slots.header?.(),
          ...(props.items as unknown[]).map((item, i) =>
            h('div', { class: 'virtual-scroll-item', key: i }, slots.item?.({ item, index: i, active: true })),
          ),
          slots.footer?.(),
        ]);
    },
  }),
}));

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));

vi.mock('./df-grid-header.vue', () => ({ default: { name: 'DfGridHeader', template: '<div/>' } }));

vi.mock('./excessive-scroll.vue', () => ({ default: { name: 'ExcessiveScroll', template: '<div/>' } }));

vi.mock('./helpers', () => ({
  // GridCard that records the most-recent `columns` prop reference.
  // By comparing the reference before and after a selectionMode change we can tell
  // whether `columnRendererOptionsInternal` returned a new (re-computed) array.
  GridCard: defineComponent({
    name: 'GridCard',
    // `class`, `data-pk` and `data-idx` are deliberately not declared: they are fallthrough
    // attrs on the real component too, and only `columns` is ever read here.
    props: {
      item: { type: Object, default: () => ({}) },
      columns: { type: Array, default: () => [] },
      renderers: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () => {
        lastSeenColumns.value = props.columns as unknown[];
        return h('div', { class: 'grid-card' });
      };
    },
  }),

  ShadowGrid: defineComponent({
    name: 'ShadowGrid',
    props: {
      records: { type: Array, default: () => [] },
      columns: { type: Array, default: () => [] },
      renderers: { type: Object, default: () => ({}) },
      count: { type: Number, default: 0 },
      offset: { type: Number, default: 0 },
      keyField: { type: String, default: '' },
      selectionActive: { type: Boolean, default: false },
    },
    setup(_, { expose }) {
      expose({ containerEl: shadowContainerEl, reMeasure: vi.fn() });
      return () => h('div', { class: 'shadow-grid' });
    },
  }),

  ShadowGridMeasurements: {},
  useHeaderContent: () => ({ provideHeaderContent: vi.fn() }),
}));

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

// ===========================================================================
// Fixtures
// ===========================================================================

const ROW_COUNT = 20;
const records = Array.from({ length: ROW_COUNT }, (_, i) => ({ id: i, name: `Row ${i}` }));
const columns = [
  { fieldName: 'name', label: 'Name' },
  { fieldName: 'id', label: 'ID' },
];

// ===========================================================================
// Helpers
// ===========================================================================

function mountGrid(selectionMode: SelectionMode = null) {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id', selectionMode },
    global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
  });
}

// ===========================================================================
// Tests
// ===========================================================================

describe('DfGrid — selection mode switch performance', () => {
  let gridColumnCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    lastSeenColumns.value = null;

    const mod = await import('./cell-renderers');
    gridColumnCreate = vi.mocked(mod.gridColumnCreate);

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === 'grid-template-columns') return '30px 200px';
        if (prop === 'width') return '600px';
        return '';
      },
    } as CSSStyleDeclaration);

    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));

    global.requestAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // *** THIS TEST FAILS UNTIL THE FIX IS APPLIED ***
  //
  // `gridColumnCreate` is called once per column inside `columnRendererOptionsInternal`.
  // If it fires when only `selectionMode` changes (columns are identical), the computed
  // re-evaluated due to the `selMode` reactive dependency — that is the bottleneck.
  it('[PERF] gridColumnCreate not called when selectionMode toggles on', async () => {
    const wrapper = mountGrid(null);
    await flushPromises();

    gridColumnCreate.mockClear(); // discard initial-mount calls

    await wrapper.setProps({ selectionMode: 'selection' });
    await flushPromises();

    // With the bug: called once per column because `columnRendererOptionsInternal` re-ran.
    // With the fix: columns didn't change, computed is cached → 0 calls.
    expect(gridColumnCreate).toHaveBeenCalledTimes(0);
  });

  // -----------------------------------------------------------------------
  // *** THIS TEST FAILS UNTIL THE FIX IS APPLIED ***
  it('[PERF] gridColumnCreate not called when selectionMode toggles off', async () => {
    const wrapper = mountGrid('selection');
    await flushPromises();

    gridColumnCreate.mockClear();

    await wrapper.setProps({ selectionMode: null });
    await flushPromises();

    expect(gridColumnCreate).toHaveBeenCalledTimes(0);
  });

  // -----------------------------------------------------------------------
  // *** THIS TEST FAILS UNTIL THE FIX IS APPLIED ***
  //
  // When selectionMode toggles, the `:columns` prop passed to every GridCard must stay
  // the same object reference. A new reference means `columnRendererOptionsInternal`
  // re-evaluated — causing every card's `useFormattedData.formattedData` computed to
  // recompute (O(rows × columns) cell renders), which is the root performance bottleneck.
  //
  // Note: re-renders due to `:class` changing (selected / unselected) are expected and
  // not counted here. What must NOT change is the `columns` array reference.
  it('[PERF] columns prop reference is stable when selectionMode toggles on', async () => {
    const wrapper = mountGrid(null);
    await flushPromises();

    const columnsBefore = lastSeenColumns.value;
    expect(columnsBefore).not.toBeNull(); // sanity: cards rendered at all

    await wrapper.setProps({ selectionMode: 'selection' });
    await flushPromises();

    // With the bug: new Symbol → new array reference every time.
    // With the fix: `columnRendererOptionsInternal` cached → same reference.
    expect(lastSeenColumns.value).toBe(columnsBefore);
  });

  // -----------------------------------------------------------------------
  // *** THIS TEST FAILS UNTIL THE FIX IS APPLIED ***
  it('[PERF] columns prop reference is stable when selectionMode toggles off', async () => {
    const wrapper = mountGrid('selection');
    await flushPromises();

    const columnsBefore = lastSeenColumns.value;
    expect(columnsBefore).not.toBeNull();

    await wrapper.setProps({ selectionMode: null });
    await flushPromises();

    expect(lastSeenColumns.value).toBe(columnsBefore);
  });
});
