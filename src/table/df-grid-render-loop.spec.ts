/**
 * @file df-grid-render-loop.spec.ts
 *
 * Detects an infinite (or runaway) reactivity loop that manifests as constant high CPU
 * usage in Firefox even when the user is not interacting with the grid.
 *
 * === Suspected chain ===
 *
 *  1. @pdanpdan/virtual-scroll measures each rendered item via ResizeObserver.
 *  2. A measurement change → scrollDetails changes → `visibleRangeChange` emitted.
 *  3. `updateRenderedRows` (throttled 250 ms) → `mainShadowOffset` changes.
 *  4. shadow-grid re-renders (`:offset` prop changed).
 *  5. shadow-grid `idxAndItem()` schedules `nextTick(checkShadowGridColumns)`.
 *  6. `checkShadowGridColumns` → emits `onmeasure`.
 *  7. `doShadowMeasure` (throttled 100 ms) → sets `templateColumns`.
 *  8. `templateColumns` CSS-var change → grid-card column widths change.
 *  9. Width change → ResizeObserver fires → goto 2.
 *
 * Because the ResizeObserver in step 9 cannot fire inside JSDOM, we simulate the
 * feedback manually: after each `doShadowMeasure`-equivalent call we re-fire
 * `visible-range-change` with a slightly different range, just as the browser would.
 * We then assert that the system converges within a small number of iterations rather
 * than looping indefinitely.
 *
 * === What is being measured ===
 *
 * `shadowRenderCount` — how many times the shadow-grid component renders.
 * `onmeasureCount`    — how many times shadow-grid emits `onmeasure`
 *                       (= how many times `doShadowMeasure` is called).
 * `templateColumnsChanges` — how many distinct values `templateColumns` takes
 *                            (observable as root-element style-attribute changes).
 *
 * A converging system should stabilise in ≤ 3 measurement rounds.
 * A looping system keeps incrementing these counters indefinitely.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import DfGrid from './df-grid.vue';

// ===========================================================================
// vi.hoisted — shared mutable counters visible inside vi.mock() factories
// ===========================================================================

const { shadowRenderCount, onmeasureCount, emitVisibleRangeChange, shadowContainerEl } = vi.hoisted(() => {
  const containerEl = document.createElement('div');

  // These counters are reset in beforeEach.
  const renderCount = { value: 0 };
  const measureCount = { value: 0 };

  // Holds the function injected by the VirtualScroll mock so tests can fire
  // `visible-range-change` programmatically.
  const rangeEmitter = { fn: null as ((range: { start: number; end: number }) => void) | null };

  return {
    shadowRenderCount: renderCount,
    onmeasureCount: measureCount,
    emitVisibleRangeChange: rangeEmitter,
    shadowContainerEl: containerEl,
  };
});

// ===========================================================================
// Module mocks
// ===========================================================================

vi.mock('@pdanpdan/virtual-scroll', () => ({
  VirtualScroll: defineComponent({
    name: 'MockVirtualScroll',
    props: { items: { type: Array, default: () => [] }, loading: Boolean },
    emits: ['visible-range-change'],
    setup(props, { slots, emit }) {
      // Expose the emit so tests can fire visible-range-change.
      emitVisibleRangeChange.fn = (range) => emit('visible-range-change', range);
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

  // ShadowGrid mock that:
  //  - increments shadowRenderCount on every render
  //  - automatically emits `onmeasure` via nextTick after every render
  //    (mirroring the real shadow-grid's `nextTick(checkShadowGridColumns)` in idxAndItem)
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
    setup(_, { expose, emit }) {
      expose({ containerEl: shadowContainerEl, reMeasure: vi.fn() });
      return () => {
        shadowRenderCount.value++;
        // Mimic idxAndItem()'s nextTick(checkShadowGridColumns) → emit onmeasure
        nextTick(() => {
          onmeasureCount.value++;
          emit('onmeasure', { totalWidth: 600, columnWidths: '200px 100px' });
        });
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

// ===========================================================================
// Fixtures
// ===========================================================================

const records = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const columns = [{ fieldName: 'name', label: 'Name' }];

function mountGrid() {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id' },
    global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
  });
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Run N extra nextTick / promise flushes to let async measurement settle. */
async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await nextTick();
    await flushPromises();
  }
}

// ===========================================================================
// Tests
// ===========================================================================

describe('DfGrid — reactive render-loop detection', () => {
  beforeEach(() => {
    shadowRenderCount.value = 0;
    onmeasureCount.value = 0;
    emitVisibleRangeChange.fn = null;

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === 'grid-template-columns') return '200px 100px';
        if (prop === 'width') return '600px';
        return '';
      },
    } as CSSStyleDeclaration);

    // vitest 4 requires a real function here since the mock is invoked with `new`
    // eslint-disable-next-line prefer-arrow-callback, func-names
    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), disconnect: vi.fn() };
    });

    globalThis.requestAnimationFrame = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  // -------------------------------------------------------------------------
  // Baseline: how many shadow-grid renders happen at idle (no user interaction)
  // -------------------------------------------------------------------------
  it('[LOOP] shadow-grid renders converge after initial mount (idle baseline)', async () => {
    mountGrid();
    await settle(10); // generous settling period

    // A converging system: shadow-grid renders once on mount, doShadowMeasure fires
    // once (maybe twice with the leading+trailing throttle), then nothing more.
    // If the counter keeps climbing across 10 settle rounds the loop is active.
    //
    // Expected (healthy): shadowRenderCount ≤ 3, onmeasureCount ≤ 3
    expect(shadowRenderCount.value).toBeLessThanOrEqual(3);
    expect(onmeasureCount.value).toBeLessThanOrEqual(3);
  });

  // -------------------------------------------------------------------------
  // Simulate browser feedback: ResizeObserver → visible-range-change → loop
  // -------------------------------------------------------------------------
  it('[LOOP] visible-range-change chain converges within ≤ 3 measurement rounds', async () => {
    mountGrid();
    await flushPromises();

    // Reset counters — we only care about what happens AFTER mount.
    shadowRenderCount.value = 0;
    onmeasureCount.value = 0;

    // Simulate what @pdanpdan/virtual-scroll does in the browser:
    // Item ResizeObserver fires → scrollDetails changes → visibleRangeChange emitted.
    // We fire it ONCE with a range that moves mainShadowOffset.
    emitVisibleRangeChange.fn!({ start: 300, end: 320 });
    await settle(5);

    const rendersAfterOneEvent = shadowRenderCount.value;
    const measuresAfterOneEvent = onmeasureCount.value;

    // Now simulate the feedback loop: after doShadowMeasure sets templateColumns,
    // the browser ResizeObserver would fire again → another visible-range-change.
    // We fire it once more (same range — the system should NOT re-measure).
    shadowRenderCount.value = 0;
    onmeasureCount.value = 0;
    emitVisibleRangeChange.fn!({ start: 300, end: 320 }); // same range → same mainShadowOffset
    await settle(5);

    // Second identical event: mainShadowOffset didn't change → shadow-grid should NOT
    // re-render → 0 renders, 0 onmeasure calls.
    // If these are > 0 the system is NOT converging on a stable range.
    expect(shadowRenderCount.value).toBe(0);
    expect(onmeasureCount.value).toBe(0);

    // Sanity: the first event DID cause renders (mainShadowOffset changed from 0).
    expect(rendersAfterOneEvent).toBeGreaterThan(0);
    expect(measuresAfterOneEvent).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Simulate N rapid visible-range-change events with DIFFERENT ranges
  // (models what happens when item heights oscillate → range oscillates)
  // -------------------------------------------------------------------------
  it('[LOOP] N alternating visible-range-change events cause O(N) renders, not runaway', async () => {
    mountGrid();
    await flushPromises();

    shadowRenderCount.value = 0;
    onmeasureCount.value = 0;

    // Fire alternating ranges — simulates browser oscillation between two stable
    // item-height values that flip the visible range back and forth.
    const N = 6;

    for (let i = 0; i < N; i++) {
      // Alternate between two ranges that produce *different* mainShadowOffsets.
      const start = i % 2 === 0 ? 260 : 360;
      emitVisibleRangeChange.fn!({ start, end: start + 20 });
      await nextTick();
      await flushPromises();
    }

    // Each distinct visible-range-change should cause at most 1 shadow-grid render
    // plus 1 onmeasure call. Linear growth (≤ N renders) is acceptable.
    // Quadratic growth (>> N) or no convergence is the bug.
    expect(shadowRenderCount.value).toBeLessThanOrEqual(N);
    expect(onmeasureCount.value).toBeLessThanOrEqual(N);
  });
});
