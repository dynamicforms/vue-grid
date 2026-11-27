/**
 * @file df-grid-header-filter-attrs.spec.ts
 *
 * Tests the passthrough attrs of the filter inputs in df-grid-header.vue: the accessible name of each input, the
 * hidden controls of a number input, and stable attrs (no filter input re-render) when only the header re-renders.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { ColumnDefinition } from './columns';
import { createFilterState } from './columns-filtering';
import DfGridHeader from './df-grid-header.vue';

const { updates } = vi.hoisted(() => ({ updates: {} as Record<string, number> }));

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i/>' } }));

vi.mock('@dynamicforms/vuetify-inputs', async (importOriginal) => {
  const { defineComponent, h, onUpdated } = await import('vue');
  const filterInputMock = (name: string) =>
    defineComponent({
      name,
      props: {
        control: { type: Object, default: undefined },
        choices: { type: Array, default: undefined },
        placeholder: { type: String, default: undefined },
        clearable: Boolean,
        allowNull: Boolean,
        multiple: Boolean,
        density: { type: String, default: undefined },
        passthroughAttrs: { type: Object, default: undefined },
      },
      setup() {
        onUpdated(() => {
          updates[name] = (updates[name] ?? 0) + 1;
        });
        return () => h('span');
      },
    });
  return {
    ...(await importOriginal<typeof import('@dynamicforms/vuetify-inputs')>()),
    DfInput: filterInputMock('DfInput'),
    DfSelect: filterInputMock('DfSelect'),
    DfCheckbox: filterInputMock('DfCheckbox'),
    DfDateTime: filterInputMock('DfDateTime'),
  };
});

vi.mock('./helpers', () => ({
  GridCard: { name: 'GridCard', props: ['item', 'columns', 'renderers', 'cellAttrs'], template: '<div/>' },
  useHeaderContent: () => ({ setHeaderContent: vi.fn() }),
  headerRowBaseVars: (rowsPerRecord: number) => ({ '--row-base': '0', '--rows-per-record': `${rowsPerRecord}` }),
}));

vi.mock('./cell-renderers', () => ({
  DefaultRenderers: {},
  gridColumnCreate: vi.fn(),
}));

vi.mock('./cell-renderers/internal-exports', () => ({
  columnIdOption: Symbol('columnId'),
  columnNameOption: Symbol('columnName'),
  gridIdOption: Symbol('gridId'),
}));

const columns: ColumnDefinition[] = [
  { fieldName: 'line', label: 'Line', filterable: { fieldType: 'string' } },
  { fieldName: 'seats', label: 'Seats', filterable: { fieldType: 'number' } },
  { fieldName: 'zone', label: 'Zone', filterable: { fieldType: 'number', choices: [{ id: 1, text: 'One' }] } },
  { fieldName: 'day', label: 'Day', filterable: { fieldType: 'date' } },
  { fieldName: 'night', label: 'Night', filterable: { fieldType: 'boolean' } },
];

function mountHeader(props: Record<string, any> = {}) {
  return mount(DfGridHeader, {
    props: {
      columns,
      gridId: Symbol('grid'),
      gridClass: '',
      sortState: [],
      filterState: createFilterState(columns),
      showFilterRow: true,
      ...props,
    },
  });
}

function passthroughOf(wrapper: ReturnType<typeof mountHeader>, name: string) {
  return wrapper.findComponent({ name }).props('passthroughAttrs');
}

describe('DfGridHeader — filter input attrs', () => {
  it('names each filter input after its column and clears aria-labelledby', () => {
    const wrapper = mountHeader();
    expect(passthroughOf(wrapper, 'DfInput')).toEqual({ 'aria-label': 'Filter Line', 'aria-labelledby': undefined });
    expect(passthroughOf(wrapper, 'DfSelect')).toEqual({ 'aria-label': 'Filter Zone', 'aria-labelledby': undefined });
    expect(passthroughOf(wrapper, 'DfDateTime')).toEqual({ 'aria-label': 'Filter Day', 'aria-labelledby': undefined });
    expect(passthroughOf(wrapper, 'DfCheckbox')).toEqual({
      'aria-label': 'Filter Night',
      'aria-labelledby': undefined,
    });
  });

  it('starts the checkbox name with its visible label', () => {
    const labelled = columns.map((column) =>
      column.fieldName === 'night'
        ? { ...column, filterable: { fieldType: 'boolean', placeholder: 'Late only' } }
        : column,
    ) as ColumnDefinition[];
    const wrapper = mountHeader({ columns: labelled, filterState: createFilterState(labelled) });

    expect(passthroughOf(wrapper, 'DfCheckbox')['aria-label']).toBe('Late only, Filter Night');
    expect(passthroughOf(wrapper, 'DfInput')['aria-label']).toBe('Filter Line');
  });

  it('hides the controls of a number input only', () => {
    const inputs = mountHeader().findAllComponents({ name: 'DfInput' });
    expect(inputs.map((input) => input.props('passthroughAttrs').controlVariant)).toEqual([undefined, 'hidden']);
  });

  it('keeps the filter inputs and their attrs when only the header re-renders', async () => {
    const wrapper = mountHeader({ selectionMode: 'selection', selectionKeys: new Set() });
    const before = wrapper.findAllComponents({ name: 'DfInput' }).map((input) => input.props('passthroughAttrs'));
    Object.keys(updates).forEach((key) => delete updates[key]);

    await wrapper.setProps({ selectionKeys: new Set([1]), sortState: [{ columnName: 'line', direction: 'asc' }] });
    await wrapper.setProps({ templateColumns: '1fr 1fr 1fr 1fr 1fr' });

    const after = wrapper.findAllComponents({ name: 'DfInput' }).map((input) => input.props('passthroughAttrs'));
    after.forEach((attrs, index) => expect(attrs).toBe(before[index]));
    expect(updates).toEqual({});
  });
});
