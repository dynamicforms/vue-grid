/**
 * @file df-grid-selection-reflow.spec.ts
 *
 * Regression test for the selection-column layout bug.
 *
 * === The bug ===
 *
 * `.virtual-scroll-item` wrappers rendered by @pdanpdan/virtual-scroll carry
 * `will-change: transform`, which promotes them to GPU-composited layers in Chromium.
 * When `--grid-template-columns` changes on the `.df-grid.container` ancestor, Chromium
 * does NOT re-cascade the new value into composited subtrees — the row cards keep the old
 * column widths until the scroller recycles the element (on the next scroll event).
 *
 * The CSS variable IS correctly updated on the container element (verified by test 1).
 * The missing piece is a mechanism to break the GPU compositing cache (test 2 fails until
 * the fix is applied).
 *
 * === The fix ===
 *
 * After updating `templateColumns` inside the `watch(isSelectionActive)` handler in
 * df-grid.vue, set `--grid-template-columns` directly on each visible `.virtual-scroll-item`
 * element. The card's CSS rule `grid-template-columns: var(--grid-template-columns)` then
 * resolves the variable from its direct parent (within the same composited layer) instead of
 * needing to traverse up through the composited boundary to the container.
 * Items that scroll into view later receive the value via normal cascade from the container.
 *
 * === What this test file checks ===
 *
 * 1. After a selection-mode change the container element has the correct
 *    `--grid-template-columns` inline style.  Already worked; sanity check.
 *
 * 2. After a selection-mode change every visible `.virtual-scroll-item` has `--reflow-tick`
 *    set on its inline style (the force-reflow mechanism is present and fires).
 *    *** This test FAILS until the fix is applied to df-grid.vue. ***
 */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import DfGrid from './df-grid.vue';
import type { SelectionMode } from './selection';

// ===========================================================================
// vi.hoisted — values that must exist inside vi.mock() factories
// ===========================================================================

// A stable DOM element the ShadowGrid mock exposes as `containerEl`.
// df-grid.vue reads `shadowRef.value?.containerEl` inside watch(isSelectionActive) and
// calls window.getComputedStyle() on it to get the column widths.
const { shadowContainerEl } = vi.hoisted(() => ({ shadowContainerEl: document.createElement('div') }));

// ===========================================================================
// Module mocks
// ===========================================================================

vi.mock('@pdanpdan/virtual-scroll', () => ({
  // Renders each item wrapped in a real `.virtual-scroll-item` div so the test
  // can assert that the force-reflow mechanism touches those elements.
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
  GridCard: { name: 'GridCard', template: '<div class="grid-card"/>' },

  // Expose `containerEl` so df-grid.vue's watch(isSelectionActive) can call
  // getComputedStyle() on it to read the new column widths.
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

// Stub useExcessiveScroll — the excessive-scroll feature is not under test here.
vi.mock('./use-excessive-scroll', () => ({ useExcessiveScroll: () => ({ amount: ref(0) }) }));

// ===========================================================================
// Fixtures
// ===========================================================================

const records = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gamma' },
];

// Flat column list (no responsive layouts) → single shadow-grid, no secondary shadows.
const columns = [{ fieldName: 'name', label: 'Name' }];

// ===========================================================================
// Helpers
// ===========================================================================

function mountGrid(selectionMode: SelectionMode = null) {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id', selectionMode },
    global: {
      // v-longpress is registered by the plugin at app level; stub it for tests.
      directives: { longpress: { mounted: () => {}, unmounted: () => {} } },
    },
  });
}

// ===========================================================================
// Tests
// ===========================================================================

describe('DfGrid — selection-column reflow', () => {
  let computedStyleSpy: MockInstance<typeof window.getComputedStyle>;

  beforeEach(() => {
    // df-grid.vue's watch(isSelectionActive) calls window.getComputedStyle on the
    // shadow-grid's containerEl to get the new grid-template-columns value.
    computedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === 'grid-template-columns') return '30px 200px';
        if (prop === 'width') return '600px';
        return '';
      },
    } as CSSStyleDeclaration);

    // Mock ResizeObserver — the grid observes its container but that's not under test.
    // vitest 4 requires a real function here since the mock is invoked with `new`
    // eslint-disable-next-line prefer-arrow-callback, func-names
    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), disconnect: vi.fn() };
    });

    // Suppress requestAnimationFrame so the --reflow-tick *cleanup* (removeProperty)
    // does not fire synchronously. This lets us assert the property's presence before
    // it would be removed in the next animation frame.
    globalThis.requestAnimationFrame = vi.fn();
  });

  afterEach(() => {
    computedStyleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  it('container has the correct --grid-template-columns after selection mode activates', async () => {
    const wrapper = mountGrid(null);
    await wrapper.setProps({ selectionMode: 'selection' });
    await flushPromises();

    // df-grid.vue sets :style="`--${templateColumns}`" on the root element, which
    // becomes "--grid-template-columns: 30px 200px" after the watch fires.
    const style = (wrapper.element as HTMLElement).getAttribute('style') ?? '';
    expect(style).toContain('--grid-template-columns');
    expect(style).toContain('30px 200px');
  });

  // -----------------------------------------------------------------------
  // *** THIS TEST FAILS UNTIL THE FIX IS APPLIED ***
  //
  // Expected behaviour after fix:
  //   After a selection-mode change, df-grid.vue must set `--grid-template-columns`
  //   directly on each visible `.virtual-scroll-item` element.
  //
  // Root cause (why this is needed):
  //   `.virtual-scroll-item { will-change: transform }` creates a GPU-composited layer.
  //   Chromium does not re-cascade CSS custom-property changes from ancestors through that
  //   boundary — the row cards keep old column widths until the scroller recycles them.
  //   Setting the variable directly on the item (rather than only on the ancestor) means
  //   the card finds it locally, within the same composited layer, and uses the new value
  //   immediately. Items that scroll in later pick it up via normal cascade from the
  //   container.
  it('[BUG] sets --grid-template-columns on .virtual-scroll-item after selection mode activates', async () => {
    const wrapper = mountGrid(null);
    await wrapper.setProps({ selectionMode: 'selection' });
    await flushPromises();

    const items = wrapper.findAll('.virtual-scroll-item');
    expect(items.length).toBeGreaterThan(0); // sanity: VirtualScroll mock rendered items

    for (const item of items) {
      expect((item.element as HTMLElement).style.getPropertyValue('--grid-template-columns')).toBe('30px 200px');
    }
  });

  // -----------------------------------------------------------------------
  it('[BUG] sets --grid-template-columns on .virtual-scroll-item after selection mode deactivates', async () => {
    const wrapper = mountGrid('selection');
    await wrapper.setProps({ selectionMode: null });
    await flushPromises();

    const items = wrapper.findAll('.virtual-scroll-item');
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect((item.element as HTMLElement).style.getPropertyValue('--grid-template-columns')).toBe('30px 200px');
    }
  });
});
