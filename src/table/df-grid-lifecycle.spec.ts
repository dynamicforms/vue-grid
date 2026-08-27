/**
 * @file df-grid-lifecycle.spec.ts
 *
 * Tests the parts of df-grid.vue that are neither column measurement (covered by
 * df-grid-auto-sizing.spec.ts) nor a reactivity loop (df-grid-render-loop.spec.ts): what the
 * grid does as rows scroll past, as a row turns out wider than the shadow predicted, and as
 * the component goes away.
 *
 *  - **visible range reporting** — the recently-added tracker decides which arc to flash from
 *    the range the user was actually looking at, so the grid must hand it the scroller's own
 *    `currentIndex`/`currentEndIndex` and not the rendered range, which is inflated by the
 *    render buffers on both sides.
 *
 *  - **overflow learning** — the layout a container width can fit is chosen from the widths the
 *    secondary shadows measured. Those are measured once, on a possibly narrower container, so
 *    a row that ends up overflowing its own track list is the grid's only chance to notice that
 *    a layout needs more room than it was credited with.
 *
 *  - **teardown** — the resize observer is disconnected, so a detached grid stops reacting.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import DfGrid from './df-grid.vue';

const { emitVisibleRangeChange, scrollDetails, resizeCallback, disconnect } = vi.hoisted(() => ({
  emitVisibleRangeChange: { fn: null as ((range: { start: number; end: number }) => void) | null },
  // What the virtual scroller reports as truly visible, as opposed to what it has rendered.
  scrollDetails: { value: null as { currentIndex: number; currentEndIndex: number } | null },
  resizeCallback: { fn: null as ResizeObserverCallback | null },
  disconnect: vi.fn(),
}));

vi.mock('@pdanpdan/virtual-scroll', () => ({
  VirtualScroll: defineComponent({
    name: 'MockVirtualScroll',
    props: { items: { type: Array, default: () => [] }, loading: Boolean },
    emits: ['visible-range-change'],
    setup(props, { slots, emit, expose }) {
      emitVisibleRangeChange.fn = (range) => emit('visible-range-change', range);
      expose({
        get scrollDetails() {
          return scrollDetails.value;
        },
      });
      return () =>
        h('div', { class: 'virtual-scroll' }, [
          ...(props.items as unknown[]).map((item, i) =>
            h('div', { class: 'virtual-scroll-item', key: i }, slots.item?.({ item, index: i, active: true })),
          ),
        ]);
    },
  }),
}));

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));
vi.mock('./df-grid-header.vue', () => ({ default: { name: 'DfGridHeader', template: '<div/>' } }));
vi.mock('./excessive-scroll.vue', () => ({ default: { name: 'ExcessiveScroll', template: '<div/>' } }));
vi.mock('./incoming-arc.vue', () => ({ default: { name: 'IncomingArc', template: '<div/>' } }));

vi.mock('./helpers', () => ({
  // Rendered with the real class names, because the grid finds a row to re-measure by selector.
  GridCard: { name: 'GridCard', template: '<div class="df-grid card"/>' },
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
    emits: ['onmeasure'],
    setup(props, { expose, emit }) {
      const payload = () => ({ totalWidth: props.columns.length * 100, columnWidths: '100px' });
      expose({ containerEl: document.createElement('div'), reMeasure: () => emit('onmeasure', payload()) });
      return () => {
        nextTick(() => emit('onmeasure', payload()));
        return h('div', { class: 'shadow-grid' });
      };
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const records = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Row ${i}` }));

const column = (fieldName: string) => ({ fieldName, label: fieldName });
const responsiveColumns = [
  { name: 'wide', cssClass: 'wide', columns: ['name', 'artist', 'album', 'year'].map(column) },
  { name: 'narrow', cssClass: 'narrow', columns: ['name', 'artist'].map(column) },
];

/** Minimal stand-in for the useRecentlyAdded API surface the grid actually touches. */
function makeRecentlyAdded() {
  return {
    isAdding: ref(false),
    isPendingAdd: vi.fn(() => false),
    setVisibleRange: vi.fn(),
    topArcFlashTick: ref(0),
    bottomArcFlashTick: ref(0),
  };
}

function mountGrid(props: Record<string, any> = {}) {
  return mount(DfGrid, {
    props: { columns: responsiveColumns, records, keyField: 'id', ...props },
    global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
  });
}

async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await nextTick();
    await flushPromises();
  }
}

function resize(width: number) {
  resizeCallback.fn!([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DfGrid — lifecycle', () => {
  beforeEach(() => {
    emitVisibleRangeChange.fn = null;
    scrollDetails.value = null;
    resizeCallback.fn = null;
    disconnect.mockClear();

    const getPropertyValue = (prop: string) => (prop === 'width' ? '400px' : '100px');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);

    // vitest 4 requires a real function here since the mock is invoked with `new`
    // eslint-disable-next-line prefer-arrow-callback, func-names
    globalThis.ResizeObserver = vi.fn().mockImplementation(function (cb: ResizeObserverCallback) {
      resizeCallback.fn = cb;
      return { observe: vi.fn(), disconnect };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('visible range reporting', () => {
    it('reports the truly visible rows, not the buffered render range', async () => {
      const recentlyAdded = makeRecentlyAdded();
      mountGrid({ recentlyAdded });
      await settle();
      scrollDetails.value = { currentIndex: 40, currentEndIndex: 49 };

      emitVisibleRangeChange.fn!({ start: 10, end: 80 }); // rendered range, buffers included

      // end is exclusive, hence currentEndIndex + 1.
      expect(recentlyAdded.setVisibleRange).toHaveBeenCalledWith({ start: 40, end: 50 });
    });

    it('falls back to the rendered range while the scroller has no details yet', async () => {
      const recentlyAdded = makeRecentlyAdded();
      mountGrid({ recentlyAdded });
      await settle();
      scrollDetails.value = null;

      emitVisibleRangeChange.fn!({ start: 10, end: 80 });

      expect(recentlyAdded.setVisibleRange).toHaveBeenCalledWith({ start: 10, end: 80 });
    });

    it('says nothing when the consumer is not tracking recently-added records', async () => {
      mountGrid();
      await settle();

      // The grid still has to survive the event; it drives the shadow window either way.
      expect(() => emitVisibleRangeChange.fn!({ start: 10, end: 80 })).not.toThrow();
    });
  });

  describe('learning that a layout needs more room', () => {
    it('credits a layout with the width a row actually needed', async () => {
      const wrapper = mountGrid({ activeColumns: 'wide' });
      await settle();

      // A row wider than its own content box: the shadow underestimated this layout.
      const row = wrapper.element.querySelector('.df-grid.dynamic-scroller-item .df-grid.card')!;
      Object.defineProperty(row, 'scrollWidth', { configurable: true, get: () => 900 });

      resize(800); // growing, so the grid trusts the rendered row over the shadow
      await settle();
      await wrapper.setProps({ records: [...records] }); // force an update pass
      await settle();

      // 900px is now the price of `wide`, so a container of 800 can no longer afford it
      // even though the shadow had measured the layout at 400.
      resize(800);
      await settle();

      expect(wrapper.emitted('update:activeColumns')?.at(-1)).toEqual(['narrow']);
    });

    it('keeps the shadow measurement when a row fits', async () => {
      const wrapper = mountGrid({ activeColumns: 'wide' });
      await settle();

      const row = wrapper.element.querySelector('.df-grid.dynamic-scroller-item .df-grid.card')!;
      Object.defineProperty(row, 'scrollWidth', { configurable: true, get: () => 400 });

      resize(800);
      await settle();
      await wrapper.setProps({ records: [...records] });
      await settle();

      resize(800);
      await settle();

      // Nothing to change: `wide` is still the widest layout that fits, so no request is made.
      expect(wrapper.emitted('update:activeColumns')).toBeUndefined();
    });
  });

  describe('teardown', () => {
    it('stops observing the container', async () => {
      const wrapper = mountGrid();
      await settle();

      wrapper.unmount();

      expect(disconnect).toHaveBeenCalled();
    });
  });
});
