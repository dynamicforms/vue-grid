/**
 * @file df-grid-height-warning.spec.ts
 *
 * A container with no ancestor-supplied height collapses `.df-grid.body-grid` to a real,
 * persistent 0 (see the comment next to the check in df-grid.vue) rather than failing loudly —
 * virtual scrolling then has nothing to size rows against. Covers the console warning that flags
 * this as soon as the body scroller's own ResizeObserver entry reports it.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import DfGrid from './df-grid.vue';

const { resizeCallbacks, observedTargets } = vi.hoisted(() => ({
  resizeCallbacks: [] as ResizeObserverCallback[],
  observedTargets: [] as HTMLElement[][],
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

const records = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const columns = [{ fieldName: 'name', label: 'Name' }];

function mountGrid() {
  return mount(DfGrid, {
    props: { columns, records, keyField: 'id' },
    global: { directives: { longpress: { mounted: () => {}, unmounted: () => {} } } },
  });
}

async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
    await flushPromises();
  }
}

describe('DfGrid — zero-height warning', () => {
  beforeEach(() => {
    resizeCallbacks.length = 0;
    observedTargets.length = 0;

    const getPropertyValue = (prop: string) => (prop === 'width' ? '400px' : '100px');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue } as CSSStyleDeclaration);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // vitest 4 requires a real function here since the mock is invoked with `new`. The container
    // observer (the one under test) is constructed first, before the per-row one.
    globalThis.ResizeObserver = vi.fn().mockImplementation(function (cb: ResizeObserverCallback) {
      const targets: HTMLElement[] = [];
      resizeCallbacks.push(cb);
      observedTargets.push(targets);
      return { observe: vi.fn((el: HTMLElement) => targets.push(el)), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  function fireBodyGridResize(height: number) {
    const bodyGridEl = observedTargets[0][1];
    resizeCallbacks[0](
      [{ target: bodyGridEl, contentRect: { height } }] as unknown as ResizeObserverEntry[],
      {} as ResizeObserver,
    );
  }

  it('warns when the body scroller resolves to zero height', async () => {
    const wrapper = mountGrid();
    await settle();

    fireBodyGridResize(0);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[df-grid]'));
    wrapper.unmount();
  });

  it('says nothing once the body scroller has a real height', async () => {
    const wrapper = mountGrid();
    await settle();

    fireBodyGridResize(300);

    expect(console.warn).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('does not repeat the warning on further zero-height entries', async () => {
    const wrapper = mountGrid();
    await settle();

    fireBodyGridResize(0);
    fireBodyGridResize(0);

    expect(console.warn).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('warns again if the height recovers and then collapses again', async () => {
    const wrapper = mountGrid();
    await settle();

    fireBodyGridResize(0);
    fireBodyGridResize(300);
    fireBodyGridResize(0);

    expect(console.warn).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
