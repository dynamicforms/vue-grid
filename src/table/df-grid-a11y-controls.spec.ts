/**
 * @file df-grid-a11y-controls.spec.ts
 *
 * Accessibility of the grid's controls: `aria-sort` on the header cells, the sort indicator as a keyboard-operable
 * button, the accessible names of the filter inputs, and the status bar with its selection buttons.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, ref } from 'vue';
import { createVuetify } from 'vuetify';
import * as vuetifyComponents from 'vuetify/components';
import * as vuetifyDirectives from 'vuetify/directives';

import { type ColumnDefinition } from './columns';
import { createFilterState } from './columns-filtering';
import { type SortState } from './columns-sorting';
import DfGridHeader from './df-grid-header.vue';
import { useGridMouseEvents } from './df-grid-mouse-events';
import PreContentPost from './helpers/pre-content-post.vue';
import SortingIndicator from './helpers/sorting-indicator.vue';

vi.mock('vue-cached-icon', () => ({ CachedIcon: { name: 'CachedIcon', template: '<i class="stub-icon" />' } }));

const columns: ColumnDefinition[] = [
  { fieldName: 'line', label: 'Line', sortable: true, filterable: { fieldType: 'string' } },
  { fieldName: 'departure', label: 'Departure', sortable: true, filterable: { fieldType: 'date' } },
  { fieldName: 'seats', label: 'Seats', sortable: true, filterable: { fieldType: 'number' } },
  { fieldName: 'late', label: 'Late', sortable: true, filterable: { fieldType: 'boolean' } },
  {
    fieldName: 'operator',
    label: 'Operator',
    sortable: true,
    filterable: { choices: [{ id: 'a', text: 'A' }] },
  },
  { fieldName: 'id', label: 'ID', sortable: false },
];

const global = { components: { PreContentPost, SortingIndicator } };

function mountHeader(props: Record<string, unknown> = {}) {
  return mount(DfGridHeader, {
    props: { columns, gridId: Symbol('grid'), gridClass: '', sortState: [], ...props },
    global,
  });
}

const headerCell = (wrapper: { find: (s: string) => any }, fieldName: string) =>
  wrapper.find(`.df-grid.card.header .df-grid.cell.${fieldName}`);

/**
 * The header inside an element that sorts on click the way df-grid does: the click handler of the grid container,
 * with the sort state kept from `update:sortState`.
 */
function mountSortingGrid(initialSort: SortState = []) {
  const sortState = ref<SortState>(initialSort);
  const sortEvents: SortState[] = [];
  const Harness = defineComponent({
    setup() {
      const headerRef = ref();
      const emit = ((event: string, ...args: any[]) => {
        if (event === 'update:sortState') {
          sortState.value = args[0];
          sortEvents.push(args[0]);
        }
      }) as any;
      const uColumns = {
        columns: computed(() => columns),
        activeColumnsDefinition: computed(() => ({ columns })),
      } as any;
      const sorted = computed(() => sortState.value);
      const { processMouse } = useGridMouseEvents(
        emit,
        { records: [], columns, keyField: 'id' } as any,
        computed(() => []),
        sorted,
        headerRef,
        uColumns,
      );
      return () =>
        h('div', { onClick: (e: MouseEvent) => processMouse('click', e) }, [
          h(DfGridHeader, {
            ref: headerRef,
            'data-section': 'header',
            columns,
            gridId: Symbol('grid'),
            gridClass: '',
            sortState: sortState.value,
          }),
        ]);
    },
  });
  return { wrapper: mount(Harness, { global }), sortState, sortEvents };
}

const sortButton = (wrapper: { find: (s: string) => any }, fieldName: string) =>
  headerCell(wrapper, fieldName).find('.df-grid-sorting-indicator-wrapper');

describe('aria-sort', () => {
  it('marks sortable unsorted columns "none" and leaves non-sortable columns without it', () => {
    const wrapper = mountHeader();

    expect(headerCell(wrapper, 'line').attributes('aria-sort')).toBe('none');
    expect(headerCell(wrapper, 'id').attributes('aria-sort')).toBeUndefined();
  });

  it('gives the sort column its direction', () => {
    const asc = mountHeader({ sortState: [{ columnName: 'line', direction: 'asc' }] });
    const desc = mountHeader({ sortState: [{ columnName: 'line', direction: 'desc' }] });

    expect(headerCell(asc, 'line').attributes('aria-sort')).toBe('ascending');
    expect(headerCell(desc, 'line').attributes('aria-sort')).toBe('descending');
  });

  it('marks only the primary column of a multi-column sort', () => {
    const wrapper = mountHeader({
      sortState: [
        { columnName: 'seats', direction: 'desc' },
        { columnName: 'line', direction: 'asc' },
      ],
    });

    expect(headerCell(wrapper, 'seats').attributes('aria-sort')).toBe('descending');
    expect(headerCell(wrapper, 'line').attributes('aria-sort')).toBeUndefined();
    expect(headerCell(wrapper, 'departure').attributes('aria-sort')).toBe('none');
  });
});

describe('header name', () => {
  it('is the column text alone, without the sort button name', () => {
    const wrapper = mountHeader();

    expect(headerCell(wrapper, 'departure').attributes('aria-label')).toBe('Departure');
    expect(headerCell(wrapper, 'id').attributes('aria-label')).toBe('ID');
  });
});

describe('header cell name', () => {
  it('is the column text alone, without the sort button name', () => {
    const wrapper = mountHeader({ sortState: [{ columnName: 'line', direction: 'asc' }] });

    const cell = headerCell(wrapper, 'line');
    expect(cell.attributes('role')).toBe('columnheader');
    expect(cell.attributes('aria-label')).toBe('Line');
    expect(headerCell(wrapper, 'id').attributes('aria-label')).toBe('ID');
  });
});

describe('aria-sort with sort entries the grid does not apply', () => {
  it('marks the first applied entry as the primary sort column', () => {
    const wrapper = mountHeader({
      sortState: [
        { columnName: 'missing', direction: 'asc' },
        { columnName: 'seats', direction: 'asc' },
      ],
    });

    expect(headerCell(wrapper, 'seats').attributes('aria-sort')).toBe('ascending');
  });

  it('skips an entry on a non-sortable column', () => {
    const wrapper = mountHeader({
      sortState: [
        { columnName: 'id', direction: 'asc' },
        { columnName: 'line', direction: 'desc' },
        { columnName: 'seats', direction: 'asc' },
      ],
    });

    expect(headerCell(wrapper, 'line').attributes('aria-sort')).toBe('descending');
    expect(headerCell(wrapper, 'seats').attributes('aria-sort')).toBeUndefined();
  });
});

describe('sort button', () => {
  it('is a focusable button named after its column', () => {
    const button = sortButton(mountHeader(), 'departure');

    expect(button.attributes('role')).toBe('button');
    expect(button.attributes('tabindex')).toBe('0');
    expect(button.attributes('aria-label')).toBe('Sort by Departure');
  });

  it('is not rendered for a non-sortable column', () => {
    expect(sortButton(mountHeader(), 'id').exists()).toBe(false);
  });

  it('sorts by its column on Enter, as a click on the header cell does', async () => {
    const { wrapper, sortState } = mountSortingGrid();

    await sortButton(wrapper, 'line').trigger('keydown', { key: 'Enter' });
    expect(sortState.value).toEqual([{ columnName: 'line', direction: 'asc' }]);

    await sortButton(wrapper, 'line').trigger('keydown', { key: 'Enter' });
    expect(sortState.value).toEqual([{ columnName: 'line', direction: 'desc' }]);
  });

  it('sorts on Space and keeps the page from scrolling', async () => {
    const { wrapper, sortState } = mountSortingGrid();
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

    sortButton(wrapper, 'seats').element.dispatchEvent(event);
    await flushPromises();

    expect(event.defaultPrevented).toBe(true);
    expect(sortState.value).toEqual([{ columnName: 'seats', direction: 'asc' }]);
  });

  it('adds its column to the sort on Shift+Enter and Shift+Space, as Shift+click does', async () => {
    const { wrapper, sortState } = mountSortingGrid([{ columnName: 'line', direction: 'asc' }]);

    await sortButton(wrapper, 'seats').trigger('keydown', { key: 'Enter', shiftKey: true });
    expect(sortState.value).toEqual([
      { columnName: 'line', direction: 'asc' },
      { columnName: 'seats', direction: 'asc' },
    ]);

    await sortButton(wrapper, 'departure').trigger('keydown', { key: ' ', shiftKey: true });
    expect(sortState.value).toEqual([
      { columnName: 'line', direction: 'asc' },
      { columnName: 'seats', direction: 'asc' },
      { columnName: 'departure', direction: 'asc' },
    ]);
  });

  it('replaces a multi-column sort on Enter', async () => {
    const { wrapper, sortState } = mountSortingGrid([
      { columnName: 'line', direction: 'asc' },
      { columnName: 'seats', direction: 'asc' },
    ]);

    await sortButton(wrapper, 'departure').trigger('keydown', { key: 'Enter' });

    expect(sortState.value).toEqual([{ columnName: 'departure', direction: 'asc' }]);
  });

  it('ignores other keys and auto-repeat', async () => {
    const { wrapper, sortEvents } = mountSortingGrid();

    await sortButton(wrapper, 'line').trigger('keydown', { key: 'a' });
    await sortButton(wrapper, 'line').trigger('keydown', { key: 'Enter', repeat: true });

    expect(sortEvents).toEqual([]);
  });
});

describe('filter inputs', () => {
  it('name each filter input after its column', async () => {
    const wrapper = mount(DfGridHeader, {
      props: {
        columns,
        gridId: Symbol('grid'),
        gridClass: '',
        sortState: [],
        showFilterRow: true,
        filterState: createFilterState(columns),
      },
      global: {
        ...global,
        plugins: [createVuetify({ components: vuetifyComponents, directives: vuetifyDirectives })],
      },
    });
    await flushPromises();

    const input = (fieldName: string, selector = 'input') =>
      wrapper.find(`.filter-cell.${fieldName}`).find(selector).attributes();

    for (const [fieldName, label] of [
      ['line', 'Line'],
      ['departure', 'Departure'],
      ['seats', 'Seats'],
      ['operator', 'Operator'],
    ]) {
      const attrs = input(fieldName, 'input:not([type="hidden"])');
      expect(attrs['aria-label'], fieldName).toBe(`Filter ${label}`);
      expect(attrs['aria-labelledby'], fieldName).toBeUndefined();
    }
    expect(input('late', 'input[type="checkbox"]')['aria-label']).toBe('Filter Late');
  });
});

describe('status bar', () => {
  it('is a polite live region', () => {
    const bar = mountHeader({ showStatusBar: true }).find('.df-status-bar');

    expect(bar.attributes('role')).toBe('status');
    expect(bar.attributes('aria-live')).toBe('polite');
  });

  it('announces only the changed text, not the whole bar', () => {
    const bar = mountHeader({ selectionMode: 'selection', selectionKeys: new Set([1]) }).find('.df-status-bar');

    expect(bar.attributes('aria-atomic')).toBe('false');
  });

  describe('selection buttons', () => {
    const mountSelection = () => mountHeader({ selectionMode: 'selection', selectionKeys: new Set([1]) });
    const icons = (wrapper: ReturnType<typeof mountHeader>) => wrapper.findAll('.selection-icon');

    it('are focusable buttons with a name', () => {
      const [cancel, invert] = icons(mountSelection());

      expect(cancel.attributes()).toMatchObject({
        role: 'button',
        tabindex: '0',
        'aria-label': 'Cancel selection mode',
      });
      expect(invert.attributes()).toMatchObject({ role: 'button', tabindex: '0', 'aria-label': 'Invert selection' });
    });

    it('activate on Enter and Space', async () => {
      const wrapper = mountSelection();
      const [cancel, invert] = icons(wrapper);

      await cancel.trigger('keydown', { key: 'Enter' });
      await invert.trigger('keydown', { key: ' ' });
      await invert.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('cancel-selection')).toHaveLength(1);
      expect(wrapper.emitted('invert-selection')).toHaveLength(2);
    });

    it('keep Space from scrolling the page and ignore other keys', async () => {
      const wrapper = mountSelection();
      const [cancel] = icons(wrapper);
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

      cancel.element.dispatchEvent(event);
      await cancel.trigger('keydown', { key: 'x' });

      expect(event.defaultPrevented).toBe(true);
      expect(wrapper.emitted('cancel-selection')).toHaveLength(1);
    });
  });
});
