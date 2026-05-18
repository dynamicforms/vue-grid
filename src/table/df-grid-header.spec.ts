import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import type { ColumnDefinition } from './columns';
import { createFilterState, type FilterState } from './columns-filtering';
import type { SortState } from './columns-sorting';
import DfGridHeader from './df-grid-header.vue';

// Mock dependencies
vi.mock('@dynamicforms/vuetify-inputs', () => ({
  DfInput: { name: 'DfInput', template: '<input />' },
  DfSelect: { name: 'DfSelect', template: '<select />' },
  DfCheckbox: { name: 'DfCheckbox', template: '<input type="checkbox" />' },
  DfDateTime: { name: 'DfDateTime', template: '<input type="date" />' },
}));

vi.mock('./helpers', () => ({
  GridCard: { name: 'GridCard', template: '<div class="grid-card"><slot /></div>' },
  useHeaderContent: () => ({ setHeaderContent: vi.fn() }),
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

const mockColumns: ColumnDefinition[] = [
  {
    fieldName: 'title',
    label: 'Title',
    sortable: true,
    filterable: true,
  },
  {
    fieldName: 'artist',
    label: 'Artist',
    sortable: true,
    filterable: { fieldType: 'string' },
  },
  {
    fieldName: 'year',
    label: 'Year',
    sortable: true,
    filterable: { fieldType: 'number' },
  },
  {
    fieldName: 'active',
    label: 'Active',
    sortable: true,
    filterable: { fieldType: 'boolean' },
  },
  {
    fieldName: 'date',
    label: 'Date',
    sortable: true,
    filterable: { fieldType: 'date' },
  },
  {
    fieldName: 'genre',
    label: 'Genre',
    sortable: true,
    filterable: {
      choices: [
        { id: 'rock', text: 'Rock' },
        { id: 'pop', text: 'Pop' },
      ],
    },
  },
  {
    fieldName: 'id',
    label: 'ID',
    sortable: false,
    filterable: false,
  },
];

describe('DfGridHeader.vue', () => {
  let gridId: symbol;
  let sortState: SortState;
  let filterState: FilterState;

  beforeEach(() => {
    gridId = Symbol('test-grid');
    sortState = [];
    filterState = createFilterState(mockColumns);
  });

  describe('basic rendering', () => {
    it('should render header row', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: false,
        },
      });

      expect(wrapper.find('.df-grid.header-container').exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'GridCard' }).exists()).toBe(true);
    });

    it('should not render filter row by default', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: false,
        },
      });

      expect(wrapper.find('.filter-row').exists()).toBe(false);
    });

    it('should not render status bar by default', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: false,
        },
      });

      expect(wrapper.find('.df-status-bar').exists()).toBe(false);
    });
  });

  describe('filter row rendering', () => {
    it('should render filter row when showFilterRow is true', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      expect(wrapper.find('.filter-row').exists()).toBe(true);
    });

    it('should render filter cells for all columns', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const filterCells = wrapper.findAll('.filter-cell');
      expect(filterCells.length).toBe(mockColumns.length);
    });

    it('should render DfInput for string filter', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const titleCell = wrapper.find('.filter-cell.title');
      expect(titleCell.exists()).toBe(true);
      expect(titleCell.findComponent({ name: 'DfInput' }).exists()).toBe(true);
    });

    it('should render DfInput with number type for number filter', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const yearCell = wrapper.find('.filter-cell.year');
      expect(yearCell.exists()).toBe(true);
      expect(yearCell.findComponent({ name: 'DfInput' }).exists()).toBe(true);
    });

    it('should render DfCheckbox for boolean filter', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const activeCell = wrapper.find('.filter-cell.active');
      expect(activeCell.exists()).toBe(true);
      expect(activeCell.findComponent({ name: 'DfCheckbox' }).exists()).toBe(true);
    });

    it('should render DfDateTime for date filter', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const dateCell = wrapper.find('.filter-cell.date');
      expect(dateCell.exists()).toBe(true);
      expect(dateCell.findComponent({ name: 'DfDateTime' }).exists()).toBe(true);
    });

    it('should render DfSelect for choices filter', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const genreCell = wrapper.find('.filter-cell.genre');
      expect(genreCell.exists()).toBe(true);
      expect(genreCell.findComponent({ name: 'DfSelect' }).exists()).toBe(true);
    });

    it('should not render filter input for non-filterable columns', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const idCell = wrapper.find('.filter-cell.id');
      expect(idCell.exists()).toBe(true);
      // Should be empty (no input components)
      expect(idCell.findComponent({ name: 'DfInput' }).exists()).toBe(false);
      expect(idCell.findComponent({ name: 'DfSelect' }).exists()).toBe(false);
      expect(idCell.findComponent({ name: 'DfCheckbox' }).exists()).toBe(false);
      expect(idCell.findComponent({ name: 'DfDateTime' }).exists()).toBe(false);
    });
  });

  describe('status bar rendering', () => {
    it('should render status bar when showStatusBar is true', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: true,
          filterState,
        },
      });

      expect(wrapper.find('.df-status-bar').exists()).toBe(true);
    });

    it('should display active filter count as 0 when no filters applied', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: true,
          filterState,
        },
      });

      const statusBar = wrapper.find('.df-status-bar');
      expect(statusBar.text()).toContain('Active filters: 0');
    });

    it('should display active filter count correctly', async () => {
      filterState.fields.title.value = 'test';
      filterState.fields.year.value = 2020;

      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: true,
          filterState,
        },
      });

      await nextTick();

      const statusBar = wrapper.find('.df-status-bar');
      expect(statusBar.text()).toContain('Active filters: 2');
    });

    it('should ignore null and empty string filters in count', async () => {
      filterState.fields.title.value = '';
      filterState.fields.artist.value = null;
      filterState.fields.year.value = 2020;

      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: true,
          filterState,
        },
      });

      await nextTick();

      const statusBar = wrapper.find('.df-status-bar');
      expect(statusBar.text()).toContain('Active filters: 1');
    });

    it('should support custom status bar slot', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: true,
          filterState,
        },
        slots: { statusBar: '<div class="custom-status">Custom Status</div>' },
      });

      expect(wrapper.find('.custom-status').exists()).toBe(true);
      expect(wrapper.find('.custom-status').text()).toBe('Custom Status');
    });
  });

  describe('selection mode status bar', () => {
    it('should show status bar when selectionMode is set even without showStatusBar', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: false,
          selectionMode: 'selection',
          selectionKeys: new Set([1, 2]),
        },
      });

      expect(wrapper.find('.df-status-bar').exists()).toBe(true);
      expect(wrapper.find('.df-status-bar').classes()).toContain('selection-bar');
    });

    it('should display item count and "selected" label in selection mode', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          selectionMode: 'selection',
          selectionKeys: new Set([1, 2, 3]),
        },
      });

      expect(wrapper.find('.selection-count').text()).toContain('3 items selected');
    });

    it('should display item count and "excluded" label in exclusion mode', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          selectionMode: 'exclusion',
          selectionKeys: new Set([5]),
        },
      });

      expect(wrapper.find('.selection-count').text()).toContain('1 items excluded');
    });

    it('should emit cancel-selection when X button clicked', async () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          selectionMode: 'selection',
          selectionKeys: new Set(),
        },
      });

      await wrapper.find('[title="Cancel selection mode"]').trigger('click');
      expect(wrapper.emitted('cancel-selection')).toBeTruthy();
    });

    it('should emit invert-selection when Invert button clicked', async () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          selectionMode: 'selection',
          selectionKeys: new Set(),
        },
      });

      await wrapper.find('[title="Invert selection"]').trigger('click');
      expect(wrapper.emitted('invert-selection')).toBeTruthy();
    });

    it('should show filter status bar (not selection UI) when selectionMode is null', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showStatusBar: true,
          filterState,
          selectionMode: null,
        },
      });

      expect(wrapper.find('.selection-cancel-btn').exists()).toBe(false);
      expect(wrapper.find('.status-section').exists()).toBe(true);
    });

    it('should render groupActions slot in selection mode', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          selectionMode: 'selection',
          selectionKeys: new Set(),
        },
        slots: { groupActions: '<button type="button" class="delete-btn">Delete</button>' },
      });

      expect(wrapper.find('.selection-group-actions .delete-btn').exists()).toBe(true);
    });
  });

  describe('sorting integration', () => {
    it('should render sorting indicators for sorted columns', () => {
      const sortedState: SortState = [{ columnName: 'title', direction: 'asc' }];

      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState: sortedState,
          showFilterRow: false,
        },
      });

      // HeaderOptions should include sortState
      const headerOptions = (wrapper.vm as any).headerOptions;
      const titleHeader = headerOptions.find((h: any) => h.fieldName === 'title');
      expect(titleHeader.sortState.direction).toBe('asc');
      expect(titleHeader.sortState.index).toBe(0);
    });

    it('should render multi-column sort with indices', () => {
      const sortedState: SortState = [
        { columnName: 'title', direction: 'asc' },
        { columnName: 'artist', direction: 'desc' },
      ];

      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState: sortedState,
          showFilterRow: false,
        },
      });

      const headerOptions = (wrapper.vm as any).headerOptions;
      const titleHeader = headerOptions.find((h: any) => h.fieldName === 'title');
      const artistHeader = headerOptions.find((h: any) => h.fieldName === 'artist');

      expect(titleHeader.sortState.index).toBe(1); // 1-based for multi-sort
      expect(artistHeader.sortState.index).toBe(2);
    });
  });

  describe('getFilterableConfig', () => {
    it('should return config for filterable columns', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const getFilterableConfig = (wrapper.vm as any).getFilterableConfig;
      const titleColumn = mockColumns[0];
      const config = getFilterableConfig(titleColumn);

      expect(config).not.toBeNull();
      expect(config.fieldType).toBe('string');
    });

    it('should return null for non-filterable columns', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const getFilterableConfig = (wrapper.vm as any).getFilterableConfig;
      const idColumn = mockColumns[6]; // ID column is not filterable
      const config = getFilterableConfig(idColumn);

      expect(config).toBeNull();
    });

    it('should return config with choices when present', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      const getFilterableConfig = (wrapper.vm as any).getFilterableConfig;
      const genreColumn = mockColumns[5];
      const config = getFilterableConfig(genreColumn);

      expect(config).not.toBeNull();
      expect(config.choices).toBeDefined();
      expect(config.choices?.length).toBe(2);
    });
  });

  describe('headerItem computed', () => {
    it('should create header item from column labels', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'test-class',
          sortState,
        },
      });

      const headerItem = (wrapper.vm as any).headerItem;

      expect(headerItem.title).toBe('Title');
      expect(headerItem.artist).toBe('Artist');
      expect(headerItem.year).toBe('Year');
    });
  });

  describe('CSS classes', () => {
    it('should apply gridClass to header and filter rows', () => {
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: mockColumns,
          gridId,
          gridClass: 'custom-grid-class',
          sortState,
          showFilterRow: true,
          filterState,
        },
      });

      expect(wrapper.findComponent({ name: 'GridCard' }).classes()).toContain('custom-grid-class');
      expect(wrapper.find('.filter-row').classes()).toContain('custom-grid-class');
    });

    it('should apply column-specific classes to filter cells', () => {
      const columnsWithCss = [
        { fieldName: 'title', label: 'Title', sortable: true, filterable: true, cssClass: 'text-left' },
      ];

      const filterStateLocal = createFilterState(columnsWithCss);

      const wrapper = mount(DfGridHeader, {
        props: {
          columns: columnsWithCss,
          gridId,
          gridClass: 'test-class',
          sortState,
          showFilterRow: true,
          filterState: filterStateLocal,
        },
      });

      const titleCell = wrapper.find('.filter-cell.title');
      expect(titleCell.classes()).toContain('text-left');
    });
  });
});
