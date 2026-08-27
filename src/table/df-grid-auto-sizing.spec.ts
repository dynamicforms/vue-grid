/**
 * @file df-grid-auto-sizing.spec.ts
 *
 * Tests the auto-sizing wiring in df-grid.vue: the grid never lets the browser resolve column
 * widths on the real rows. It renders a hidden shadow grid, reads the pixel track list the
 * browser resolved there, and copies it onto every row through `--grid-template-columns`.
 *
 * What is covered here
 * --------------------
 *  - the measured track list reaches the container, and stale widths are dropped when the
 *    active layout changes;
 *  - a container resize re-measures the shadow and selects the widest layout that still fits;
 *  - the width the body scroller reserves for its vertical scrollbar is measured (not assumed)
 *    and published as `--df-grid-scrollbar-width`, which is what keeps the header — which sits
 *    outside the scroller — aligned with the body columns.
 *
 * What is NOT covered here, and cannot be: whether the resulting layout is geometrically
 * correct. JSDOM has no layout engine, so every width in this file is one the mocks made up.
 * The geometry lives in e2e/auto-sizing-suite.ts, which measures a real browser.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, getCurrentInstance, h, nextTick, onMounted, ref } from 'vue';

import DfGrid from './df-grid.vue';

const { scrollerBox, resizeCallback, measuredColumnWidths } = vi.hoisted(() => ({
  // What the mocked body scroller reports: a border box wider than its content box means the
  // scrollbar takes up space, an equal one means it does not (overlay scrollbars).
  scrollerBox: { offsetWidth: 615, clientWidth: 600 },
  resizeCallback: { fn: null as ResizeObserverCallback | null },
  measuredColumnWidths: { value: '200px 100px' },
}));

vi.mock('@pdanpdan/virtual-scroll', () => ({
  VirtualScroll: defineComponent({
    name: 'MockVirtualScroll',
    props: { items: { type: Array, default: () => [] }, loading: Boolean },
    setup(props, { slots }) {
      onMounted(() => {
        const el = getCurrentInstance()!.proxy!.$el as HTMLElement;
        Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => scrollerBox.offsetWidth });
        Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => scrollerBox.clientWidth });
      });
      return () =>
        h('div', { class: 'virtual-scroll' }, [
          ...(props.items as unknown[]).map((item, i) => h('div', { key: i }, slots.item?.({ item, index: i }))),
        ]);
    },
  }),
}));

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));
vi.mock('./df-grid-header.vue', () => ({ default: { name: 'DfGridHeader', template: '<div/>' } }));
vi.mock('./excessive-scroll.vue', () => ({ default: { name: 'ExcessiveScroll', template: '<div/>' } }));

vi.mock('./helpers', () => ({
  GridCard: { name: 'GridCard', template: '<div class="grid-card"/>' },

  // Stands in for the real shadow grid: reports a track list for the main shadow, and for the
  // per-layout secondary shadows a total width of 100px per column, so that a layout with more
  // columns needs a wider container - which is what drives the layout selection under test.
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
      const payload = () => ({
        totalWidth: props.columns.length * 100,
        columnWidths: measuredColumnWidths.value,
      });
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

describe('DfGrid — column auto-sizing', () => {
  beforeEach(() => {
    scrollerBox.offsetWidth = 615;
    scrollerBox.clientWidth = 600;
    measuredColumnWidths.value = '200px 100px';
    resizeCallback.fn = null;

    const getPropertyValue = (prop: string) =>
      prop === 'grid-template-columns' ? measuredColumnWidths.value : '600px';
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);

    global.ResizeObserver = vi.fn().mockImplementation((cb: ResizeObserverCallback) => {
      resizeCallback.fn = cb;
      return { observe: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('measured track list', () => {
    it('copies the track list the shadow grid measured onto the container', async () => {
      const wrapper = mountGrid();
      await settle();

      expect(containerStyle(wrapper)).toContain('--grid-template-columns: 200px 100px');
    });

    it('picks up a new measurement when the shadow grid re-measures', async () => {
      const wrapper = mountGrid({ activeColumns: 'wide' });
      await settle();

      measuredColumnWidths.value = '150px 150px';
      await resizeContainer(wrapper, 600);

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
});
