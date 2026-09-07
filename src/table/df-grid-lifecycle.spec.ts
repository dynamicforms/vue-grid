/**
 * @file df-grid-lifecycle.spec.ts
 *
 * Tests the parts of df-grid.vue that are neither column measurement (covered by
 * df-grid-auto-sizing.spec.ts) nor a reactivity loop (df-grid-render-loop.spec.ts).
 *
 *  - **teardown** — the resize observer is disconnected, so a detached grid stops reacting.
 *
 * Two categories this file used to cover are gone:
 *
 *  - **visible range reporting** (recentlyAdded's `setVisibleRange`, fed from the virtual
 *    scroller's `currentIndex`/`currentEndIndex`) has no signal to test against right now — rows
 *    are no longer windowed at all in this stage of the single-shared-grid migration (see the
 *    TODO in df-grid.vue, near `useHeaderContent`). This returns once the windowing stage
 *    restores a true-viewport signal.
 *  - **"learning that a layout needs more room"** (the `onUpdated` overflow-learning block that
 *    credited a responsive layout with extra width when a shadow-predicted track list turned out
 *    too narrow) is deleted, not just untested: with native column sizing a real row's own grid
 *    track *is* the measurement, so there is nothing left for it to overflow.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import DfGrid from './df-grid.vue';

const { resizeCallback, disconnect } = vi.hoisted(() => ({
  resizeCallback: { fn: null as ResizeObserverCallback | null },
  disconnect: vi.fn(),
}));

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));
vi.mock('./df-grid-header.vue', () => ({ default: { name: 'DfGridHeader', template: '<div/>' } }));
vi.mock('./excessive-scroll.vue', () => ({ default: { name: 'ExcessiveScroll', template: '<div/>' } }));
vi.mock('./incoming-arc.vue', () => ({ default: { name: 'IncomingArc', template: '<div/>' } }));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();
  return {
    rowBaseVars: actual.rowBaseVars,
    headerRowBaseVars: actual.headerRowBaseVars,
    GridCard: {
      name: 'GridCard',
      props: ['item', 'columns', 'renderers', 'noWrapperItem'],
      template: '<div class="df-grid card"/>',
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const records = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const columns = [{ fieldName: 'name', label: 'Name' }];

function mountGrid(props: Record<string, any> = {}) {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id', ...props },
    global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
  });
}

async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
    await flushPromises();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DfGrid — lifecycle', () => {
  beforeEach(() => {
    resizeCallback.fn = null;
    disconnect.mockClear();

    const getPropertyValue = (prop: string) => (prop === 'width' ? '400px' : '100px');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);

    // vitest 4 requires a real function here since the mock is invoked with `new`

    globalThis.ResizeObserver = vi.fn().mockImplementation(function (cb: ResizeObserverCallback) {
      resizeCallback.fn = cb;
      return { observe: vi.fn(), disconnect };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('teardown', () => {
    it('stops observing the container', async () => {
      const wrapper = mountGrid();
      await settle();

      wrapper.unmount();

      expect(disconnect).toHaveBeenCalled();
    });
  });
});
