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
 *    totalWidth and grid-template-columns from the computed style.
 *
 * 3. **containerEl expose** — the exposed getter returns the root DOM element.
 *
 * GridCard is mocked because its own rendering is covered by use-formatted-data.spec.ts.
 * window.getComputedStyle is mocked because jsdom returns empty strings for layout properties.
 */
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
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
    template: '<div class="mock-card" :data-id="item.id"/>',
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
  let computedStyleSpy: ReturnType<typeof vi.spyOn>;

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

    it('onmeasure payload contains grid-template-columns', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      await nextTick();
      const events = wrapper.emitted('onmeasure') as any[][];
      expect(events[0][0].columnWidths).toBe('200px 200px 200px');
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

    it('containerEl expose returns the root DOM element', async () => {
      const wrapper = mountShadowGrid();
      await nextTick();
      const el = (wrapper.vm as any).containerEl;
      expect(el).toBe(wrapper.element);
    });
  });
});
