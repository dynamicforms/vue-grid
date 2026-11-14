/**
 * @file df-grid-row-classes.spec.ts
 *
 * Tests the classes df-grid.vue sets on each row anchor:
 *
 *  - **zebra** — `even` / `odd` by index, with and without a custom `rowClass`.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import DfGrid from './df-grid.vue';

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));
vi.mock('./df-grid-header.vue', () => ({ default: { name: 'DfGridHeader', template: '<div/>' } }));
vi.mock('./excessive-scroll.vue', () => ({ default: { name: 'ExcessiveScroll', template: '<div/>' } }));
vi.mock('./incoming-arc.vue', () => ({ default: { name: 'IncomingArc', template: '<div/>' } }));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();
  return {
    rowBaseVars: actual.rowBaseVars,
    headerRowBaseVars: actual.headerRowBaseVars,
    GridCard: { name: 'GridCard', props: ['item', 'columns', 'renderers', 'noWrapperItem'], template: '<div/>' },
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

const records = Array.from({ length: 4 }, (_, i) => ({ id: i, name: `Row ${i}` }));
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

/** The row-anchor element of the record with `pk`. */
function anchor(wrapper: ReturnType<typeof mountGrid>, pk: number) {
  return wrapper.find(`.df-anchored > .df-grid.card[data-pk="${pk}"]`);
}

describe('DfGrid — row classes', () => {
  beforeEach(() => {
    const getPropertyValue = (prop: string) => (prop === 'width' ? '400px' : '100px');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);
    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('zebra', () => {
    it('sets even / odd by index without rowClass', async () => {
      const wrapper = mountGrid();
      await settle();
      expect(anchor(wrapper, 0).classes()).toContain('even');
      expect(anchor(wrapper, 1).classes()).toContain('odd');
      expect(anchor(wrapper, 2).classes()).toContain('even');
      expect(anchor(wrapper, 1).classes()).not.toContain('even');
    });

    it('keeps even / odd next to the classes of a custom rowClass', async () => {
      const wrapper = mountGrid({ rowClass: (item: any) => (item.id === 1 ? 'custom' : []) });
      await settle();
      expect(anchor(wrapper, 0).classes()).toContain('even');
      expect(anchor(wrapper, 0).classes()).not.toContain('custom');
      expect(anchor(wrapper, 1).classes()).toEqual(expect.arrayContaining(['odd', 'custom']));
    });
  });
});
