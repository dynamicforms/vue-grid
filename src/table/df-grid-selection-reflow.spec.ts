/**
 * @file df-grid-selection-reflow.spec.ts
 *
 * Confirms the header's `--grid-template-columns` custom property updates correctly when
 * selection mode toggles (`syncHeaderColumns` in df-grid.vue), and that no `.virtual-scroll-item`
 * element exists anywhere in the grid: rows are direct items of the shared body grid, in normal
 * document flow, not descendants of a virtual-scroll library's own positioning wrapper — nothing
 * in this codebase can promote a row to its own GPU-composited layer carrying a stale
 * `--grid-template-columns` value.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { ref } from 'vue';

import DfGrid from './df-grid.vue';
import type { SelectionMode } from './selection';

// ===========================================================================
// Module mocks
// ===========================================================================

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

// Stub useExcessiveScroll — the excessive-scroll feature is not under test here.
vi.mock('./use-excessive-scroll', () => ({ useExcessiveScroll: () => ({ amount: ref(0) }) }));

// ===========================================================================
// Fixtures
// ===========================================================================

const records = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gamma' },
];

// Flat column list (no responsive layouts) → no secondary shadows.
const columns = [{ fieldName: 'name', label: 'Name' }];

// ===========================================================================
// Helpers
// ===========================================================================

function mountGrid(selectionMode: SelectionMode = null) {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id', selectionMode },
    global: {
      // v-longpress is registered by the plugin at app level; stub it for tests.
      directives: { longpress: { mounted: () => {}, unmounted: () => {} } },
    },
  });
}

// ===========================================================================
// Tests
// ===========================================================================

describe('DfGrid — selection-column reflow', () => {
  let computedStyleSpy: MockInstance<typeof window.getComputedStyle>;

  beforeEach(() => {
    // df-grid.vue's syncHeaderColumns reads window.getComputedStyle on the body grid element
    // to get the natively-resolved grid-template-columns.
    computedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === 'grid-template-columns') return '30px 200px';
        if (prop === 'width') return '600px';
        return '';
      },
    } as CSSStyleDeclaration);

    // vitest 4 requires a real function here since the mock is invoked with `new`

    globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => {
    computedStyleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('container has the correct --grid-template-columns after selection mode activates', async () => {
    const wrapper = mountGrid(null);
    await wrapper.setProps({ selectionMode: 'selection' });
    await flushPromises();

    const style = (wrapper.element as HTMLElement).getAttribute('style') ?? '';
    expect(style).toContain('--grid-template-columns');
    expect(style).toContain('30px 200px');
  });

  it('container has the correct --grid-template-columns after selection mode deactivates', async () => {
    const wrapper = mountGrid('selection');
    await wrapper.setProps({ selectionMode: null });
    await flushPromises();

    const style = (wrapper.element as HTMLElement).getAttribute('style') ?? '';
    expect(style).toContain('--grid-template-columns');
    expect(style).toContain('30px 200px');
  });

  it('renders no .virtual-scroll-item elements (compositing-boundary bug has no precondition)', async () => {
    const wrapper = mountGrid(null);
    await wrapper.setProps({ selectionMode: 'selection' });
    await flushPromises();

    expect(wrapper.findAll('.virtual-scroll-item')).toHaveLength(0);
  });
});
