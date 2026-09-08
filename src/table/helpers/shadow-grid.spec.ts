/**
 * @file shadow-grid.spec.ts
 *
 * Tests for the `ShadowGrid` component (shadow-grid.vue).
 *
 * What this file tests
 * --------------------
 * 1. **idxAndItem generator** — pagination logic: renders `count` records starting at `offset`,
 *    clamps at end of records, and yields nothing when offset is out of bounds.
 *
 * 2. **onmeasure event** — emitted after initial render and on `reMeasure()`, carrying
 *    totalWidth and grid-template-columns from the computed style. When the computed style
 *    still reads back "none" (the grid CSS rule not applied to the element yet), the emit is
 *    withheld and retried on the next animation frame instead of handing listeners a value they
 *    cannot use.
 *
 * 3. **containerEl expose** — the exposed getter returns the measured grid element (a `.df-grid
 *    .shadow-grid` child of the component's root, not the root itself — the root only exists to
 *    position and clip the grid, which sizes itself to its own natural content width).
 *
 * 4. **caller-supplied class routing** — a `class` passed on the `<shadow-grid>` tag (the
 *    caller's layout class, e.g. `three-row`) lands on the measured grid rather than the
 *    positioning wrapper, since only the former carries the `body-grid` class that layout-specific
 *    CSS selectors key off. Other attrs (e.g. `style`) still fall through to the wrapper.
 *
 * GridCard is mocked because its own rendering is covered by use-formatted-data.spec.ts.
 * window.getComputedStyle is mocked because jsdom returns empty strings for layout properties.
 */
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { defineComponent, nextTick } from 'vue';

import type { RendererOptionsMap, RenderersMap, RowValue } from '../cell-renderers';
import type { ColumnDefinition } from '../columns';

import ShadowGrid from './shadow-grid.vue';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./grid-card.vue', () => ({
  default: defineComponent({
    name: 'GridCard',
    props: {
      item: { type: Object, default: () => ({}) },
      columns: { type: Array, default: () => [] },
      renderers: { type: Object, default: () => ({}) },
      addRowResetItem: { type: Boolean, default: false },
      noWrapperItem: { type: Boolean, default: false },
    },
    // Field cells (matching the real GridCard's own `.df-grid.cell.<fieldName>` output — see
    // use-formatted-data.ts) are rendered alongside the plain `.mock-card` marker the rest of
    // this file's tests already key off, so both can coexist undisturbed.
    template: `
      <div class="mock-card" :data-id="item.id">
        <div
          v-for="col in columns"
          :key="col.fieldName"
          :class="['df-grid', 'cell', col.fieldName]"
          :data-id="item.id"
        />
      </div>
    `,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockRecords: RowValue[] = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Item ${i}` }));
const mockColumns: ColumnDefinition<keyof RendererOptionsMap>[] = [];
const mockRenderers: RenderersMap = {} as RenderersMap;

type ShadowGridOverrides = { records?: RowValue[]; count?: number; offset?: number; selectionActive?: boolean };

function mountShadowGrid(overrides: ShadowGridOverrides = {}) {
  return mount(ShadowGrid, {
    props: {
      records: mockRecords,
      columns: mockColumns,
      renderers: mockRenderers,
      count: 5,
      offset: 0,
      keyField: 'id',
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShadowGrid', () => {
  let computedStyleSpy: MockInstance<typeof window.getComputedStyle>;

  beforeEach(() => {
    const mockStyle = { getPropertyValue: (prop: string) => (prop === 'width' ? '600px' : '200px 200px 200px') };
    computedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockStyle as CSSStyleDeclaration);
  });

  afterEach(() => {
    computedStyleSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  describe('idxAndItem pagination', () => {
    it('renders `count` items starting at offset 0', async () => {
      const wrapper = mountShadowGrid({ count: 3, offset: 0 });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(3);
    });

    it('renders items starting at the given offset', async () => {
      const wrapper = mountShadowGrid({ count: 3, offset: 4 });
      await nextTick();
      const cards = wrapper.findAll('.mock-card');
      expect(cards).toHaveLength(3);
      // records[4], [5], [6] → ids 4, 5, 6
      expect(cards[0].attributes('data-id')).toBe('4');
      expect(cards[2].attributes('data-id')).toBe('6');
    });

    it('clamps to end of records when count exceeds remaining items', async () => {
      const wrapper = mountShadowGrid({ count: 5, offset: 8 }); // only 2 records left (8, 9)
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(2);
    });

    it('renders nothing when offset is beyond the records array', async () => {
      const wrapper = mountShadowGrid({ count: 3, offset: 100 });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(0);
    });

    it('renders all records when count equals records.length and offset is 0', async () => {
      const wrapper = mountShadowGrid({ count: 10, offset: 0 });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(10);
    });

    it('renders nothing when records array is empty', async () => {
      const wrapper = mountShadowGrid({ records: [], count: 5, offset: 0 });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(0);
    });

    it('renders correctly when selectionActive is true', async () => {
      const wrapper = mountShadowGrid({ count: 2, offset: 0, selectionActive: true });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(2);
    });

    it('re-renders correctly when selectionActive changes', async () => {
      const wrapper = mountShadowGrid({ count: 2, offset: 0, selectionActive: false });
      await nextTick();
      await wrapper.setProps({ selectionActive: true });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(2);
    });

    it('v-memo cache hit: re-render with same item keys keeps existing vnodes', async () => {
      // First render with 2 items — this primes the v-memo cache for items 0 and 1
      const wrapper = mountShadowGrid({ count: 2, offset: 0 });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(2);

      // Expand to 3 items — items 0 and 1 have unchanged memo keys so v-memo returns cached vnodes
      await wrapper.setProps({ count: 3 });
      await nextTick();
      expect(wrapper.findAll('.mock-card')).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  describe('onmeasure event', () => {
    it('emits onmeasure after the initial render', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      await nextTick(); // checkShadowGridColumns is called inside nextTick
      expect(wrapper.emitted('onmeasure')).toBeTruthy();
    });

    it('onmeasure payload contains totalWidth from getComputedStyle', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      await nextTick();
      const events = wrapper.emitted('onmeasure') as any[][];
      expect(events).toBeTruthy();
      expect(events[0][0].totalWidth).toBe(600);
    });

    it('falls back to scrollWidth when it exceeds the computed style width', async () => {
      const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 733 });
      try {
        const wrapper = mountShadowGrid();
        await nextTick();
        await nextTick();
        const events = wrapper.emitted('onmeasure') as any[][];
        expect(events[0][0].totalWidth).toBe(733);
      } finally {
        if (scrollWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidthDescriptor);
      }
    });

    it('onmeasure payload contains grid-template-columns', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      await nextTick();
      const events = wrapper.emitted('onmeasure') as any[][];
      expect(events[0][0].columnWidths).toBe('200px 200px 200px');
    });
  });

  // -------------------------------------------------------------------------
  describe('onmeasure retry when grid-template-columns reads back as "none"', () => {
    let pendingFrame: FrameRequestCallback | null;

    beforeEach(() => {
      pendingFrame = null;
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        pendingFrame = cb;
        return 1;
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('withholds onmeasure and retries on the next frame instead of emitting "none"', async () => {
      let calls = 0;
      computedStyleSpy.mockImplementation(() => {
        calls += 1;
        const columns = calls === 1 ? 'none' : '200px 200px 200px';
        return { getPropertyValue: (prop: string) => (prop === 'width' ? '600px' : columns) } as CSSStyleDeclaration;
      });

      const wrapper = mountShadowGrid();
      await nextTick();
      await nextTick();

      expect(wrapper.emitted('onmeasure')).toBeFalsy();
      expect(pendingFrame).not.toBeNull();

      pendingFrame!(0);

      const events = wrapper.emitted('onmeasure') as any[][];
      expect(events).toBeTruthy();
      expect(events[0][0].columnWidths).toBe('200px 200px 200px');
    });
  });

  // -------------------------------------------------------------------------
  describe('per-field metrics', () => {
    const fieldColumns = [{ fieldName: 'genres' }, { fieldName: 'title' }] as ColumnDefinition<
      keyof RendererOptionsMap
    >[];
    // scrollHeight per record id: id 0 -> 1 line, id 1 -> 2 lines, id 2 -> 5 lines (at the mocked
    // 20px line-height below) — median across the three is 2.
    const scrollHeightByRowId: Record<number, number> = { 0: 20, 1: 40, 2: 100 };

    let getBoundingClientRectSpy: MockInstance<typeof Element.prototype.getBoundingClientRect>;
    let scrollHeightDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      // Overrides the outer describe's blanket getComputedStyle mock: the outer grid still needs
      // its width/grid-template-columns reading, but a field cell needs its own line-height so
      // computeLineHeightPx doesn't pick up the outer grid's unrelated mocked values.
      computedStyleSpy.mockImplementation((el: Element) => {
        if ((el as HTMLElement).classList?.contains('cell')) {
          return {
            getPropertyValue: (prop: string) => (prop === 'line-height' ? '20px' : '16px'),
          } as CSSStyleDeclaration;
        }
        return {
          getPropertyValue: (prop: string) => (prop === 'width' ? '600px' : '200px 200px 200px'),
        } as CSSStyleDeclaration;
      });
      getBoundingClientRectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
      ) {
        const width = this.classList.contains('genres') ? 260 : this.classList.contains('title') ? 120 : 0;
        return { width, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });
      scrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get(this: HTMLElement) {
          return scrollHeightByRowId[Number(this.dataset.id)] ?? 20;
        },
      });
    });

    afterEach(() => {
      getBoundingClientRectSpy.mockRestore();
      if (scrollHeightDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeightDescriptor);
    });

    it('reports each field\'s natural width by default (sizeTo="max-content")', async () => {
      const wrapper = mountShadowGrid({ columns: fieldColumns, count: 3, offset: 0 } as any);
      await nextTick();
      await nextTick();
      const events = wrapper.emitted('onmeasure') as any[][];
      expect(events[0][0].fieldMaxWidths).toEqual({ genres: 260, title: 120 });
      expect(events[0][0].fieldCompactMetrics).toBeUndefined();
    });

    it('reports each field\'s min-content width and median line count when sizeTo="min-content"', async () => {
      const wrapper = mount(ShadowGrid, {
        props: {
          records: mockRecords,
          columns: fieldColumns,
          renderers: mockRenderers,
          count: 3,
          offset: 0,
          keyField: 'id',
          sizeTo: 'min-content',
        },
      });
      await nextTick();
      await nextTick();
      const events = wrapper.emitted('onmeasure') as any[][];
      expect(events[0][0].fieldCompactMetrics).toEqual({
        genres: { minContentWidth: 260, medianLines: 2 },
        title: { minContentWidth: 120, medianLines: 2 },
      });
      expect(events[0][0].fieldMaxWidths).toBeUndefined();
    });

    it('applies the min-content sizing via inline style', async () => {
      const wrapper = mount(ShadowGrid, {
        props: {
          records: mockRecords,
          columns: fieldColumns,
          renderers: mockRenderers,
          count: 3,
          offset: 0,
          keyField: 'id',
          sizeTo: 'min-content',
        },
      });
      await nextTick();
      expect(wrapper.element.querySelector('.df-grid.shadow-grid')!.getAttribute('style')).toContain(
        'width: min-content',
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('reMeasure() and containerEl expose', () => {
    it('calling reMeasure() emits onmeasure again', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      await nextTick();
      const countBefore = (wrapper.emitted('onmeasure') ?? []).length;

      (wrapper.vm as any).reMeasure();

      const countAfter = (wrapper.emitted('onmeasure') ?? []).length;
      expect(countAfter).toBeGreaterThan(countBefore);
    });

    it('containerEl expose returns the measured grid element', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      const el = (wrapper.vm as any).containerEl;
      expect(el).toBe(wrapper.element.querySelector('.df-grid.shadow-grid'));
      expect(el).not.toBe(wrapper.element); // the root only positions/clips; this is its child
    });
  });

  // -------------------------------------------------------------------------
  describe('caller-supplied class', () => {
    it('lands on the measured grid, not the positioning wrapper', async () => {
      const wrapper = mount(ShadowGrid, {
        props: {
          records: mockRecords,
          columns: mockColumns,
          renderers: mockRenderers,
          count: 5,
          offset: 0,
          keyField: 'id',
        },
        attrs: { class: 'three-row' },
      });
      await nextTick();
      expect(wrapper.element.classList.contains('three-row')).toBe(false);
      expect(wrapper.element.querySelector('.df-grid.shadow-grid')!.classList.contains('three-row')).toBe(true);
    });

    it('other attrs (e.g. style) still land on the wrapper', async () => {
      const wrapper = mount(ShadowGrid, {
        props: {
          records: mockRecords,
          columns: mockColumns,
          renderers: mockRenderers,
          count: 5,
          offset: 0,
          keyField: 'id',
        },
        attrs: { style: 'right: auto' },
      });
      await nextTick();
      expect(wrapper.element.getAttribute('style')).toContain('right: auto');
    });
  });
});
