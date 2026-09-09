/**
 * @file df-grid-lifecycle.spec.ts
 *
 * Tests the parts of df-grid.vue that are neither column measurement (covered by
 * df-grid-auto-sizing.spec.ts) nor a reactivity loop (df-grid-render-loop.spec.ts).
 *
 *  - **visible range reporting** — `recentlyAdded` needs the range of records actually on screen
 *    to decide which arc to flash. Found by scanning mounted row-anchor positions against the
 *    body grid's own scroll position — see `onBodyScrollSettle` in df-grid.vue. Mounted rows are
 *    always a superset of the visible ones (the windowing buffer adds extras on both sides), so
 *    this scan doesn't need to know about windowing at all.
 *  - **windowed row placement** — `--row-base` and the windowing spacers' `grid-row` stay small
 *    regardless of dataset size; see use-row-placement.ts.
 *  - **teardown** — the resize observers are disconnected, so a detached grid stops reacting.
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

/** Minimal stand-in for the useRecentlyAdded API surface the grid actually touches. */
function makeRecentlyAdded() {
  return {
    isAdding: ref(false),
    isPendingAdd: vi.fn(() => false),
    setVisibleRange: vi.fn(),
    topArcFlashTick: ref(0),
    bottomArcFlashTick: ref(0),
    topInsertedPks: ref<any[]>([]),
  };
}

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
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('visible range reporting', () => {
    it('reports the range of row-anchors within the visible scroll viewport', async () => {
      const recentlyAdded = makeRecentlyAdded();
      const wrapper = mountGrid({ recentlyAdded });
      await settle();

      const bodyGrid = wrapper.element.querySelector('.body-grid') as HTMLElement;
      Object.defineProperty(bodyGrid, 'clientHeight', { configurable: true, value: 40 });
      Object.defineProperty(bodyGrid, 'scrollTop', { configurable: true, value: 20 });

      // Five uniform 20px rows: anchor i spans [i*20, i*20+20).
      const anchors = Array.from(wrapper.element.querySelectorAll('.df-grid.card[data-idx]')) as HTMLElement[];
      anchors.forEach((anchor, i) => {
        Object.defineProperty(anchor, 'offsetTop', { configurable: true, value: i * 20 });
        Object.defineProperty(anchor, 'offsetHeight', { configurable: true, value: 20 });
      });

      bodyGrid.dispatchEvent(new Event('scroll'));
      // updateVisibleRange is throttled 100ms; onMounted already spent the leading edge, so the
      // trailing edge has to be waited out for real (settle()'s microtask flushes don't advance
      // real timers).
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });
      await settle();

      // Viewport [20, 60): only rows 1 ([20,40)) and 2 ([40,60)) are inside it.
      expect(recentlyAdded.setVisibleRange).toHaveBeenCalledWith({ start: 1, end: 3 });
    });

    it('says nothing when the consumer is not tracking recently-added records', async () => {
      const wrapper = mountGrid();
      await settle();

      const bodyGrid = wrapper.element.querySelector('.body-grid') as HTMLElement;
      expect(() => bodyGrid.dispatchEvent(new Event('scroll'))).not.toThrow();
    });
  });

  describe('top-insert scroll compensation', () => {
    // Prepending records above the mounted window grows the scroller's content above the
    // viewport without moving scrollTop, which the browser reports as-is — the rows already on
    // screen would visually slide down by the inserted content's height. See df-grid.vue's watch
    // on topArcFlashTick. Real layout geometry (does the viewport actually stay visually stable)
    // is e2e territory (recently-added-top-insert.spec.ts) — this only checks the arithmetic:
    // scrollTop moves by exactly `pks.length * estimatedRowHeight` when topInsertedPks reports a
    // batch, alongside topArcFlashTick.
    function makeScrollableBodyGrid(wrapper: ReturnType<typeof mountGrid>) {
      const bodyGrid = wrapper.element.querySelector('.body-grid') as HTMLElement;
      let scrollTop = 0;
      Object.defineProperty(bodyGrid, 'scrollTop', {
        configurable: true,
        get: () => scrollTop,
        set: (v: number) => {
          scrollTop = v;
        },
      });
      return bodyGrid;
    }

    it('shifts scrollTop by the estimated height of pks reported above the viewport', async () => {
      const recentlyAdded = makeRecentlyAdded();
      const wrapper = mountGrid({ recentlyAdded, estimatedRowHeight: 40 });
      await settle();
      const bodyGrid = makeScrollableBodyGrid(wrapper);
      bodyGrid.scrollTop = 500;

      recentlyAdded.topInsertedPks.value = [10, 11];
      recentlyAdded.topArcFlashTick.value++;
      await settle();

      expect(bodyGrid.scrollTop).toBe(500 + 2 * 40);
    });

    it('does nothing when topArcFlashTick fires with no top-inserted pks', async () => {
      const recentlyAdded = makeRecentlyAdded();
      const wrapper = mountGrid({ recentlyAdded, estimatedRowHeight: 40 });
      await settle();
      const bodyGrid = makeScrollableBodyGrid(wrapper);
      bodyGrid.scrollTop = 500;

      // e.g. triggerTopArc() — a flash with no associated insert to compensate for.
      recentlyAdded.topArcFlashTick.value++;
      await settle();

      expect(bodyGrid.scrollTop).toBe(500);
    });
  });

  describe('infinite-scroll load event', () => {
    // JSDOM has no layout engine, so a freshly mounted body grid's scrollHeight/clientHeight/
    // scrollTop all default to 0 — which trivially satisfies "near the end" and fires one `load`
    // during onMounted's leading throttle edge, before a test gets a chance to set up scroll
    // metrics. That is arguably correct behaviour for a real browser too (a first page that
    // doesn't fill the viewport should ask for more), so tests compare the count of `load`
    // emissions before/after the scroll under test rather than asserting total absence.
    async function scrollNear(wrapper: ReturnType<typeof mountGrid>, distanceFromEnd: number) {
      const bodyGrid = wrapper.element.querySelector('.body-grid') as HTMLElement;
      Object.defineProperty(bodyGrid, 'scrollHeight', { configurable: true, value: 1000 });
      Object.defineProperty(bodyGrid, 'clientHeight', { configurable: true, value: 400 });
      Object.defineProperty(bodyGrid, 'scrollTop', { configurable: true, value: 1000 - 400 - distanceFromEnd });
      bodyGrid.dispatchEvent(new Event('scroll'));
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });
      await settle();
    }

    it('emits load when scrolling within 200px of the end', async () => {
      const wrapper = mountGrid();
      await settle();
      const before = wrapper.emitted('load')?.length ?? 0;

      await scrollNear(wrapper, 100);

      expect(wrapper.emitted('load')?.length ?? 0).toBeGreaterThan(before);
      expect(wrapper.emitted('load')?.at(-1)).toEqual(['vertical']);
    });

    it('does not emit an additional load while already loading', async () => {
      const wrapper = mountGrid({ loading: true });
      await settle();
      const before = wrapper.emitted('load')?.length ?? 0;

      await scrollNear(wrapper, 100);

      expect(wrapper.emitted('load')?.length ?? 0).toBe(before);
    });
  });

  describe('windowed row placement', () => {
    // See use-row-placement.ts for why this has to hold regardless of dataset size.
    it('keeps --row-base and the spacer grid-row small however deep into a huge dataset the window is', async () => {
      const bigRecords = Array.from({ length: 10_000 }, (_, i) => ({ id: i, name: `Row ${i}` }));
      const wrapper = mountGrid({ records: bigRecords });
      await settle();

      const bodyGrid = wrapper.element.querySelector('.body-grid') as HTMLElement;
      // estimatedRowHeight defaults to 30 and nothing has been measured yet, so recompute()'s own
      // scan uses that uniformly — this scrollTop lands the mounted window around record 5000.
      Object.defineProperty(bodyGrid, 'scrollHeight', { configurable: true, value: 10_000 * 30 });
      Object.defineProperty(bodyGrid, 'clientHeight', { configurable: true, value: 100 });
      Object.defineProperty(bodyGrid, 'scrollTop', { configurable: true, value: 5_000 * 30 });
      bodyGrid.dispatchEvent(new Event('scroll'));
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });
      await settle();

      // A generous bound: comfortably above what any reasonable minRenderedRows buffer needs,
      // comfortably below the ~5,000 a window-position-agnostic (absolute record index) formula
      // would have produced for a window sitting this deep into a 10,000-record dataset.
      const maxSaneRowLine = 1_000;

      const anchors = Array.from(wrapper.element.querySelectorAll('.df-anchored')) as HTMLElement[];
      expect(anchors.length).toBeGreaterThan(0);
      const rowBases = anchors.map((el) => Number(el.style.getPropertyValue('--row-base')));
      expect(Math.max(...rowBases)).toBeLessThan(maxSaneRowLine);

      const spacers = Array.from(wrapper.element.querySelectorAll('.df-grid-row-spacer')) as HTMLElement[];
      expect(spacers.length).toBe(2); // window sits well clear of both ends of the dataset
      spacers.forEach((el) => {
        expect(Number.parseInt(el.style.gridRow, 10)).toBeLessThan(maxSaneRowLine);
      });
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

  describe('summary bar ordering', () => {
    // `.df-summary-bar-empty` (see df-grid.vue's CSS) reorders the summary bar ahead of the body
    // grid via `order: -1`, so it renders where a row would — right below the header — instead of
    // at the bottom (its position without the class, a footer below rows). It's keyed on
    // `!records.length` specifically, not `loading`: an initial load (no records yet) has nowhere
    // else for "Loading…" to anchor to but the top, but loading a further page of an
    // already-populated grid (infinite scroll) belongs at the bottom, where the new rows are
    // about to arrive, not jumping to the top while it's in flight. JSDOM can't verify the
    // resulting geometry, only that the class itself is applied correctly.
    it('gets the empty-state class when there are no records', async () => {
      const wrapper = mountGrid({ records: [] });
      await settle();

      expect(wrapper.find('.df-summary-bar').classes()).toContain('df-summary-bar-empty');
    });

    it('gets the empty-state class for an initial load (no records yet, loading)', async () => {
      const wrapper = mountGrid({ records: [], loading: true });
      await settle();

      expect(wrapper.find('.df-summary-bar').classes()).toContain('df-summary-bar-empty');
    });

    it('does not get the empty-state class while loading a further page of existing records', async () => {
      const wrapper = mountGrid({ loading: true });
      await settle();

      expect(wrapper.find('.df-summary-bar').classes()).not.toContain('df-summary-bar-empty');
    });

    it('does not get the empty-state class for a populated showSummaryBar', async () => {
      const wrapper = mountGrid({ showSummaryBar: true });
      await settle();

      expect(wrapper.find('.df-summary-bar').classes()).not.toContain('df-summary-bar-empty');
    });
  });
});
