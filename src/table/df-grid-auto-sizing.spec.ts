/**
 * @file df-grid-auto-sizing.spec.ts
 *
 * Tests the column-width wiring in df-grid.vue. Real rows are direct items of one shared
 * `display:grid`, so the browser resolves their column widths natively — there is nothing to
 * copy onto them. What still needs copying is the header's widths, since the header is a
 * structurally separate box that can't itself be a native item of the body grid:
 * `syncHeaderColumns` reads the body grid's own resolved `grid-template-columns` and publishes
 * it via `--grid-template-columns`, which the header consumes.
 *
 * What is covered here
 * --------------------
 *  - the body's resolved track list reaches the header via the container's CSS variable, and
 *    stale widths are dropped when the active layout changes;
 *  - the exposed `reMeasure()` forces the same re-sync without needing a resize, and its
 *    returned promise resolves only once the new widths have actually landed;
 *  - a container resize re-measures the (still-real) secondary shadow grids and selects the
 *    widest responsive layout that still fits — this mechanism is unchanged by the single-grid
 *    migration, only the primary/per-row measurement was removed;
 *  - a shadow measurement that lands after the container's own initial resize (the shadow grids
 *    resolve their track list asynchronously, and can do so after the first `ResizeObserver`
 *    callback has already run against an empty measurement set) still re-selects the layout that
 *    now fits, without waiting for a further resize;
 *  - each layout's reported width is adjusted by per-field savings computed from a second,
 *    min-content shadow pass (see shadow-metrics.spec.ts for the underlying math) before the
 *    picker ever sees it, so a field whose typical content wraps comfortably doesn't force a
 *    layout to look wider than it needs to be;
 *  - the width the body scroller reserves for its vertical scrollbar is measured (not assumed)
 *    and published as `--df-grid-scrollbar-width`, which is what keeps the header — which sits
 *    outside the scroller — aligned with the body columns.
 *
 * What is NOT covered here, and cannot be: whether the resulting layout is geometrically
 * correct. JSDOM has no layout engine, so every width in this file is one the mocks made up.
 * The geometry lives in the e2e suite, which measures a real browser.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import DfGrid from './df-grid.vue';

const { scrollerBox, resizeCallback, measuredColumnWidths, fieldMetricsOverride, measuredRowGap } = vi.hoisted(() => ({
  // What the mocked body scroller reports: a border box wider than its content box means the
  // scrollbar takes up space, an equal one means it does not (overlay scrollbars).
  scrollerBox: { offsetWidth: 615, clientWidth: 600 },
  resizeCallback: { fn: null as ResizeObserverCallback | null },
  measuredColumnWidths: { value: '200px 100px' },
  // What getComputedStyle(bodyGrid).rowGap reports — the reserved-block gap compensation reads
  // this directly (not via getPropertyValue), unlike every other measurement in this file.
  measuredRowGap: { value: '0px' },
  // Lets one test drive the mocked shadow grids' per-field measurements, to check that a
  // layout's field-level savings actually reach the width-based layout picker. Left null the
  // rest of the time, in which case both passes report empty field metrics and the picker sees
  // exactly the widths it always has.
  fieldMetricsOverride: {
    current: null as null | {
      fieldMaxWidths: Record<string, number>;
      fieldCompactMetrics: Record<string, { minContentWidth: number; medianLines: number }>;
    },
  },
}));

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

    // Stands in for the secondary (per-layout) shadow grids. Each layout now gets two of these —
    // one measuring at max-content (unwrapped), one at min-content (fully wrapped) — so a layout
    // with more columns needs a wider container at either pass, which is what drives the
    // layout-selection tests below. No longer used for the body's own column widths — those come
    // from `window.getComputedStyle` on the body grid element directly (mocked below).
    ShadowGrid: defineComponent({
      name: 'ShadowGrid',
      props: {
        records: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
        renderers: { type: Object, default: () => ({}) },
        count: { type: Number, default: 0 },
        offset: { type: Number, default: 0 },
        keyField: { type: String, default: '' },
        sizeTo: { type: String, default: 'max-content' },
      },
      emits: ['onmeasure'],
      setup(props, { expose, emit }) {
        const payload = () => {
          const compact = props.sizeTo === 'min-content';
          const totalWidth = props.columns.length * (compact ? 20 : 100);
          const columnWidths = '';
          return compact
            ? { totalWidth, columnWidths, fieldCompactMetrics: fieldMetricsOverride.current?.fieldCompactMetrics ?? {} }
            : { totalWidth, columnWidths, fieldMaxWidths: fieldMetricsOverride.current?.fieldMaxWidths ?? {} };
        };
        expose({ reMeasure: () => emit('onmeasure', payload()) });
        return () => {
          nextTick(() => emit('onmeasure', payload()));
          return h('div', { class: 'shadow-grid' });
        };
      },
    }),

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

const column = (fieldName: string) => ({ fieldName, label: fieldName });

// Two layouts: `wide` needs 400px (4 columns), `narrow` needs 200px (2 columns).
const responsiveColumns = [
  { name: 'wide', cssClass: 'wide', columns: ['name', 'artist', 'album', 'year'].map(column) },
  { name: 'narrow', cssClass: 'narrow', columns: ['name', 'artist'].map(column) },
];

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

/** Fire the container ResizeObserver the way the browser would after a width change. */
async function resizeContainer(wrapper: ReturnType<typeof mountGrid>, width: number) {
  resizeCallback.fn!([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);
  // The measurement handler is throttled at 100ms and its leading edge was spent during
  // mount, so the trailing edge has to be waited out for the new widths to land.
  await new Promise((resolve) => {
    setTimeout(resolve, 120);
  });
  await settle();
}

const containerStyle = (wrapper: ReturnType<typeof mountGrid>) => wrapper.attributes('style') ?? '';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// The body grid's element is a plain div, not a mocked component instance — there's no
// `onMounted` hook to hang a per-element `offsetWidth`/`clientWidth` override on. Patch the
// prototype instead, conditioned on the `.body-grid` class, so the scrollbar-measurement code
// (`el.offsetWidth - el.clientWidth`) sees the mocked scroller box for that one element and 0
// for everything else.
let offsetWidthDescriptor: PropertyDescriptor | undefined;
let clientWidthDescriptor: PropertyDescriptor | undefined;

describe('DfGrid — column auto-sizing', () => {
  beforeEach(() => {
    scrollerBox.offsetWidth = 615;
    scrollerBox.clientWidth = 600;
    measuredColumnWidths.value = '200px 100px';
    resizeCallback.fn = null;
    fieldMetricsOverride.current = null;

    measuredRowGap.value = '0px';
    const getPropertyValue = (prop: string) =>
      prop === 'grid-template-columns' ? measuredColumnWidths.value : '600px';
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () => ({ getPropertyValue, rowGap: measuredRowGap.value }) as unknown as CSSStyleDeclaration,
    );

    offsetWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('body-grid') ? scrollerBox.offsetWidth : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('body-grid') ? scrollerBox.clientWidth : 0;
      },
    });

    // vitest 4 requires a real function here since the mock is invoked with `new`

    // df-grid.vue now creates two ResizeObservers on mount (the container's, then a shared one
    // for row-anchor height measurement) — capture only the first (the container's), which is
    // the one `resizeContainer()` below needs to drive.
    globalThis.ResizeObserver = vi.fn().mockImplementation(function (cb: ResizeObserverCallback) {
      if (!resizeCallback.fn) resizeCallback.fn = cb;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (offsetWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidthDescriptor);
    if (clientWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
  });

  describe('measured track list', () => {
    it("copies the body grid's natively-resolved track list onto the header", async () => {
      const wrapper = mountGrid();
      await settle();

      expect(containerStyle(wrapper)).toContain('--grid-template-columns: 200px 100px');
    });

    it('picks up a new measurement when the body grid re-settles', async () => {
      const wrapper = mountGrid({ activeColumns: 'wide' });
      await settle();

      measuredColumnWidths.value = '150px 150px';
      await resizeContainer(wrapper, 600);

      expect(containerStyle(wrapper)).toContain('--grid-template-columns: 150px 150px');
    });

    it('exposes reMeasure() to force a re-measurement without a container resize', async () => {
      const wrapper = mountGrid({ activeColumns: 'wide' });
      await settle();

      measuredColumnWidths.value = '150px 150px';
      // Resolves only once the new widths have actually landed — no arbitrary wait needed for
      // the measurement handler's throttle window, unlike a plain resize (see resizeContainer).
      await (wrapper.vm as any).reMeasure();
      await settle();

      expect(containerStyle(wrapper)).toContain('--grid-template-columns: 150px 150px');
    });

    it('drops the copied widths when the active layout changes', async () => {
      const wrapper = mountGrid({ activeColumns: 'wide' });
      await settle();
      expect(containerStyle(wrapper)).toContain('--grid-template-columns');

      await wrapper.setProps({ activeColumns: 'narrow' });
      await nextTick();

      // Widths measured for the four-column layout must not survive onto the two-column one;
      // the next measurement round provides the new ones.
      expect(containerStyle(wrapper)).not.toContain('--grid-template-columns');
    });
  });

  describe('layout selection on resize', () => {
    it('asks for the narrower layout when the wider one no longer fits', async () => {
      const wrapper = mountGrid();
      await settle();

      await resizeContainer(wrapper, 300); // fits `narrow` (200px), not `wide` (400px)

      expect(wrapper.emitted('update:activeColumns')?.at(-1)).toEqual(['narrow']);
    });

    it('asks for the widest layout that fits', async () => {
      const wrapper = mountGrid({ activeColumns: 'narrow' });
      await settle();

      await resizeContainer(wrapper, 500); // both fit

      expect(wrapper.emitted('update:activeColumns')?.at(-1)).toEqual(['wide']);
    });

    it('stays put when the current layout is already the widest that fits', async () => {
      const wrapper = mountGrid({ activeColumns: 'narrow' });
      await settle();

      await resizeContainer(wrapper, 300);

      expect(wrapper.emitted('update:activeColumns')).toBeUndefined();
    });

    it('re-selects once shadow measurements land after an early resize, without a later resize', async () => {
      const wrapper = mountGrid({ activeColumns: 'narrow' });
      // Fire the container resize before the shadow grids' own queued measurement (still pending
      // on a microtask) has resolved — mirrors the container's real ResizeObserver firing its
      // first callback before the shadow grids finish resolving their track list.
      resizeCallback.fn!([{ contentRect: { width: 500 } } as ResizeObserverEntry], {} as ResizeObserver);
      expect(wrapper.emitted('update:activeColumns')).toBeUndefined();

      await settle();

      expect(wrapper.emitted('update:activeColumns')?.at(-1)).toEqual(['wide']);
    });

    it("picks a layout the field-savings-adjusted width fits, that the raw max-content width wouldn't", async () => {
      // 'wide' raw max-content total is 400 (4 columns * 100). A field reporting a large
      // min-content/median-lines saving should let it fit into a container that couldn't have
      // held the unadjusted 400.
      fieldMetricsOverride.current = {
        fieldMaxWidths: { name: 100 },
        fieldCompactMetrics: { name: { minContentWidth: 20, medianLines: 1 } },
      };
      const wrapper = mountGrid({ activeColumns: 'narrow' });
      await settle();

      await resizeContainer(wrapper, 350); // narrower than wide's raw 400, wider than its adjusted total

      expect(wrapper.emitted('update:activeColumns')?.at(-1)).toEqual(['wide']);
    });
  });

  describe('scrollbar reservation', () => {
    it('publishes the width the body scroller actually reserves', async () => {
      const wrapper = mountGrid();
      await settle();

      expect(containerStyle(wrapper)).toContain('--df-grid-scrollbar-width: 15px');
    });

    it('publishes zero when the scroller reserves nothing (overlay scrollbars)', async () => {
      scrollerBox.clientWidth = scrollerBox.offsetWidth;
      const wrapper = mountGrid();
      await settle();

      expect(containerStyle(wrapper)).toContain('--df-grid-scrollbar-width: 0px');
    });

    it('follows the scroller when the scrollbar appears', async () => {
      scrollerBox.clientWidth = scrollerBox.offsetWidth;
      const wrapper = mountGrid();
      await settle();
      expect(containerStyle(wrapper)).toContain('--df-grid-scrollbar-width: 0px');

      scrollerBox.clientWidth = scrollerBox.offsetWidth - 15;
      await resizeContainer(wrapper, 600);

      expect(containerStyle(wrapper)).toContain('--df-grid-scrollbar-width: 15px');
    });
  });

  describe('reserved-block gap compensation', () => {
    const bodyGridStyle = (wrapper: ReturnType<typeof mountGrid>) =>
      wrapper.find('.body-grid').attributes('style') ?? '';

    it('shifts the scrollport up by rowsPerRecord × row-gap and grows it by the same amount', async () => {
      measuredRowGap.value = '10px';
      const wrapper = mountGrid();
      await settle();

      // Default rowsPerRecord is 1 — one gap between the reserved row and the first real one.
      expect(bodyGridStyle(wrapper)).toContain('margin-top: -10px');
      expect(bodyGridStyle(wrapper)).toContain('height: calc(100% + 10px)');
    });

    it('scales with rowsPerRecord for a multi-row-per-record layout', async () => {
      measuredRowGap.value = '10px';
      const wrapper = mountGrid({
        columns: [{ ...responsiveColumns[0], rows: 3 }],
        activeColumns: 'wide',
      });
      await settle();

      expect(bodyGridStyle(wrapper)).toContain('margin-top: -30px');
      expect(bodyGridStyle(wrapper)).toContain('height: calc(100% + 30px)');
    });

    it('applies no compensation when the consumer sets no gap', async () => {
      measuredRowGap.value = '0px';
      const wrapper = mountGrid();
      await settle();

      expect(bodyGridStyle(wrapper)).not.toContain('margin-top');
    });

    it('re-measures when the active layout (and so rowsPerRecord) changes', async () => {
      measuredRowGap.value = '10px';
      const wrapper = mountGrid({
        columns: [
          { ...responsiveColumns[0], rows: 3 },
          { ...responsiveColumns[1], rows: 1 },
        ],
        activeColumns: 'wide',
      });
      await settle();
      expect(bodyGridStyle(wrapper)).toContain('margin-top: -30px');

      await wrapper.setProps({ activeColumns: 'narrow' });
      await settle();

      expect(bodyGridStyle(wrapper)).toContain('margin-top: -10px');
    });
  });
});
