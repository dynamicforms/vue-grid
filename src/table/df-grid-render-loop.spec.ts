/**
 * @file df-grid-render-loop.spec.ts
 *
 * Detects a runaway reactivity loop in the header column-sync mechanism.
 *
 * === The mechanism under test ===
 *
 * `syncHeaderColumns` (throttled 100ms) reads the body grid's own native
 * `grid-template-columns` via `getComputedStyle` and writes it into `templateColumns`, which is
 * bound into the container's `:style`. It runs from `onMounted`, `onUpdated`, the container
 * `ResizeObserver`, and the `uColumns.active`/`isSelectionActive` watchers. `onUpdated` firing
 * again because `templateColumns` itself just changed the container's `style` attribute is the
 * shape of loop this file guards against — the old version of this file guarded the equivalent
 * loop through the (now-removed) shadow-grid/`visible-range-change` mechanism; the risk moved,
 * not disappeared, once column sizing became native.
 *
 * === Why it should converge ===
 *
 * Writing a CSS custom property onto the container does not change the body grid's own resolved
 * `grid-template-columns` (that's driven by real content, unaffected by the container's custom
 * properties). So the second `syncHeaderColumns` call in any such cycle reads back the *same*
 * string it just wrote, sets `templateColumns.value` to a ref already holding that value, and
 * Vue's reactivity skips the no-op update — no further render, no further `onUpdated`, no further
 * call. The counters below should stay bounded, not grow with every settle round.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import DfGrid from './df-grid.vue';

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));
vi.mock('./df-grid-header.vue', () => ({ default: { name: 'DfGridHeader', template: '<div/>' } }));
vi.mock('./excessive-scroll.vue', () => ({ default: { name: 'ExcessiveScroll', template: '<div/>' } }));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();
  return {
    rowBaseVars: actual.rowBaseVars,
    headerRowBaseVars: actual.headerRowBaseVars,
    GridCard: {
      name: 'GridCard',
      props: ['item', 'columns', 'renderers', 'noWrapperItem'],
      template: '<div class="grid-card"/>',
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

/** Run N extra microtask/promise flushes to let throttled resyncs settle. */
async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
    await flushPromises();
  }
}

// ===========================================================================
// Tests
// ===========================================================================

describe('DfGrid — reactive render-loop detection', () => {
  let getComputedStyleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === 'grid-template-columns') return '200px 100px';
        if (prop === 'width') return '600px';
        return '';
      },
    } as CSSStyleDeclaration);

    // vitest 4 requires a real function here since the mock is invoked with `new`

    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('[LOOP] header column sync converges after initial mount (idle baseline)', async () => {
    mountGrid();
    await settle(10); // generous settling period

    const callsAfterFirstSettle = getComputedStyleSpy.mock.calls.length;
    expect(callsAfterFirstSettle).toBeGreaterThan(0); // sanity: it actually synced at least once

    // Idle from here — no props change, no resize. Further settling must not keep calling it.
    await settle(10);
    expect(getComputedStyleSpy.mock.calls.length).toBe(callsAfterFirstSettle);
  });

  it('[LOOP] repeated content updates cause bounded, not runaway, resync work', async () => {
    const wrapper = mountGrid();
    await settle(5);

    getComputedStyleSpy.mockClear();

    // Each of these triggers onUpdated once (a genuine content change), which itself must not
    // cascade into more than a small, bounded number of extra syncHeaderColumns calls.
    const N = 6;
    for (let i = 0; i < N; i++) {
      await wrapper.setProps({ records: [...records, { id: 100 + i, name: `Extra ${i}` }] });

      await settle(2);
    }

    // Linear growth (bounded by a small constant factor of N) is healthy; unbounded/quadratic
    // growth is the bug this file exists to catch.
    expect(getComputedStyleSpy.mock.calls.length).toBeLessThanOrEqual(N * 3);
  });
});
