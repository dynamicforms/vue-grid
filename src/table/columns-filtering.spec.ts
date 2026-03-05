import { Field, Group } from '@dynamicforms/vue-forms';
import { vi } from 'vitest';
import { computed, EmitFn, reactive } from 'vue';

import type { RowValue } from './cell-renderers';
import type { ColumnDefinition } from './columns';
import {
  createFilterState,
  filterExternal,
  type FilterState,
  getFilterConfig,
  useFiltering,
} from './columns-filtering';
import type { GridSortEvent } from './columns-sorting';
import type { GridEmits, GridProps } from './df-grid-types';

// Mock data for testing
const mockRecords: RowValue[] = [
  { id: 1, title: 'Zebra', artist: 'Alpha', year: 2020, active: true },
  { id: 2, title: 'Apple', artist: 'Beta', year: 2019, active: false },
  { id: 3, title: 'Mango', artist: 'Alpha', year: 2021, active: true },
  { id: 4, title: 'Banana', artist: null, year: 2018, active: false },
  { id: 5, title: 'Cherry', artist: 'Gamma', year: null, active: true },
];

const mockColumns: ColumnDefinition[] = [
  { fieldName: 'title', label: 'Title', sortable: true, filterable: true },
  { fieldName: 'artist', label: 'Artist', sortable: true, filterable: { fieldType: 'string' } },
  { fieldName: 'year', label: 'Year', sortable: true, filterable: { fieldType: 'number' } },
  { fieldName: 'active', label: 'Active', sortable: true, filterable: { fieldType: 'boolean' } },
  { fieldName: 'id', label: 'ID', sortable: true, filterable: false },
  { fieldName: 'external', label: 'External', sortable: true, filterable: { key: filterExternal } },
];

const mockColumnsInternalOnly = mockColumns.filter(
  (column) => getFilterConfig(column.filterable).key !== filterExternal,
);

describe('columns-filtering.ts', () => {
  describe('getFilterConfig', () => {
    it('should return default config for true', () => {
      const config = getFilterConfig(true);
      expect(config.fieldType).toBe('string');
    });

    it('should return empty config for false', () => {
      const config = getFilterConfig(false);
      expect(config).toEqual({});
    });

    it('should return empty config for undefined', () => {
      const config = getFilterConfig(undefined);
      expect(config).toEqual({});
    });

    it('should merge provided config with defaults', () => {
      const config = getFilterConfig({ fieldType: 'number' });
      expect(config.fieldType).toBe('number');
    });

    it('should preserve all custom config properties', () => {
      const config = getFilterConfig({
        fieldType: 'string',
        placeholder: 'Search...',
        key: 'customKey',
        choices: [{ id: 1, text: 'Option 1' }],
      });
      expect(config.fieldType).toBe('string');
      expect(config.placeholder).toBe('Search...');
      expect(config.key).toBe('customKey');
      expect(config.choices).toEqual([{ id: 1, text: 'Option 1' }]);
    });

    it('should handle external filter symbol', () => {
      const config = getFilterConfig({ key: filterExternal });
      expect(config.key).toBe(filterExternal);
      expect(config.fieldType).toBe('string'); // default
    });
  });

  describe('createFilterState', () => {
    it('should create FilterState with fields for filterable columns', () => {
      const filterState = createFilterState(mockColumns);

      expect(filterState.fields.title).toBeInstanceOf(Field);
      expect(filterState.fields.artist).toBeInstanceOf(Field);
      expect(filterState.fields.year).toBeInstanceOf(Field);
      expect(filterState.fields.active).toBeInstanceOf(Field);
      expect(filterState.fields.id).toBeUndefined(); // not filterable
    });

    it('should initialize fields with initial values', () => {
      const initialValues = { title: 'Apple', year: 2020 };
      const filterState = createFilterState(mockColumns, initialValues);

      expect(filterState.fields.title.value).toBe('Apple');
      expect(filterState.fields.year.value).toBe(2020);
      expect(filterState.fields.artist.value).toBeUndefined();
    });

    it('should create Group instance', () => {
      const filterState = createFilterState(mockColumns);
      expect(filterState).toBeInstanceOf(Group);
    });
  });

  describe('useFiltering hook', () => {
    let mockProps: GridProps;
    let mockEmit: EmitFn<GridEmits>;
    let mockUColumns: any;

    beforeEach(() => {
      mockProps = {
        records: mockRecords,
        columns: mockColumns,
        keyField: 'id',
      };
      mockEmit = vi.fn() as unknown as EmitFn<GridEmits>;
      mockUColumns = {
        columns: computed(() => mockColumns),
        activeColumnsDefinition: computed(() => ({ columns: mockColumns })),
      };
    });

    describe('with external filterState prop', () => {
      it('should use external filterState when provided', async () => {
        const externalFilterState = createFilterState(mockColumnsInternalOnly, { title: 'Apple' });
        mockProps.filterState = externalFilterState;
        const inputRecords = computed(() => mockRecords);

        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        expect(filterState.value).toBe(externalFilterState);
        expect(filteredRecords.value.length).toBe(1);
        expect(filteredRecords.value[0].title).toBe('Apple');
      });

      it('should react to external filterState changes', async () => {
        const externalFilterState = createFilterState(mockColumnsInternalOnly, { title: 'Apple' });
        const mockPropsReactive = reactive({
          records: mockRecords,
          columns: mockColumnsInternalOnly,
          keyField: 'id',
          filterState: externalFilterState,
        });
        const inputRecords = computed(() => mockRecords);

        const { filteredRecords } = useFiltering(
          mockPropsReactive as GridProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        expect(filteredRecords.value.length).toBe(1);
        expect(filteredRecords.value[0].title).toBe('Apple');

        // Change filter value
        externalFilterState.fields.title.value = 'Zebra';

        expect(filteredRecords.value.length).toBe(1);
        expect(filteredRecords.value[0].title).toBe('Zebra');
      });
    });

    describe('without external filterState prop (internal state)', () => {
      it('should create internal filterState when not provided', () => {
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        expect(filterState.value).toBeDefined();
        expect(filterState.value?.fields.title).toBeInstanceOf(Field);
        expect(filteredRecords.value).toEqual(mockRecords); // no filters applied
      });

      it('should update internal state via emitWrapper', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { emitWrapper, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        const newFilterState = createFilterState(mockColumnsInternalOnly, { title: 'Mango' });
        emitWrapper('update:filterState', newFilterState);

        // Internal state should be updated
        expect(filteredRecords.value.length).toBe(1);
        expect(filteredRecords.value[0].title).toBe('Mango');
      });
    });

    describe('filteredRecords computation', () => {
      it('should filter records by string field (case-insensitive substring)', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.title.value = 'an'; // matches "Banana", "Mango"

        expect(filteredRecords.value.length).toBe(2);
        expect(filteredRecords.value.map((r) => r.title)).toContain('Banana');
        expect(filteredRecords.value.map((r) => r.title)).toContain('Mango');
      });

      it('should filter records by number field (exact match)', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.year.value = 2020;

        expect(filteredRecords.value.length).toBe(1);
        expect(filteredRecords.value[0].year).toBe(2020);
      });

      it('should filter records by boolean field', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.active.value = true;

        expect(filteredRecords.value.length).toBe(3);
        expect(filteredRecords.value.every((r) => r.active === true)).toBe(true);
      });

      it('should handle multiple filters (AND logic)', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.artist.value = 'Alpha';
        filterState.value!.fields.active.value = true;

        expect(filteredRecords.value.length).toBe(2);
        expect(filteredRecords.value.every((r) => r.artist === 'Alpha' && r.active === true)).toBe(
          true,
        );
      });

      it('should ignore empty/null filter values', () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.title.value = '';
        filterState.value!.fields.year.value = null;

        expect(filteredRecords.value).toEqual(mockRecords); // no filtering
      });

      it('should handle external filter columns', async () => {
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        // External filter should not filter locally
        filterState.value!.fields.external.value = 'some value';

        expect(filteredRecords.value).toEqual(mockRecords); // unchanged
      });

      it('should not mutate original records', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const originalIds = mockRecords.map((r) => r.id);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.title.value = 'Apple';

        // filteredRecords changed
        expect(filteredRecords.value.length).toBe(1);
        // original unchanged
        expect(mockRecords.map((r) => r.id)).toEqual(originalIds);
      });

      it('should handle records with null values in filter field', async () => {
        mockProps.columns = mockColumnsInternalOnly;
        mockUColumns.columns = computed(() => mockColumnsInternalOnly);
        mockUColumns.activeColumnsDefinition = computed(() => ({ columns: mockColumnsInternalOnly }));
        const inputRecords = computed(() => mockRecords);
        const { filterState, filteredRecords } = useFiltering(
          mockProps,
          mockEmit,
          mockUColumns,
          inputRecords,
        );

        filterState.value!.fields.artist.value = 'Alpha';

        // Should exclude record with null artist
        expect(filteredRecords.value.length).toBe(2);
        expect(filteredRecords.value.every((r) => r.artist !== null)).toBe(true);
      });
    });

    describe('emitWrapper passthrough', () => {
      it('should pass through non-filterState events', () => {
        const inputRecords = computed(() => mockRecords);
        const { emitWrapper } = useFiltering(mockProps, mockEmit, mockUColumns, inputRecords);

        const eventData = {
          rowId: 1,
          columnName: 'title',
          key: 'header',
          rowData: undefined,
          columnClasses: [],
          event: {} as MouseEvent,
        };
        emitWrapper('click', eventData);

        expect(mockEmit).toHaveBeenCalledWith('click', eventData);
      });

      it('should handle multiple event types', () => {
        const inputRecords = computed(() => mockRecords);
        const { emitWrapper } = useFiltering(mockProps, mockEmit, mockUColumns, inputRecords);

        const eventDataDblClick = {
          rowId: 2,
          key: 'header',
          rowData: undefined,
          columnClasses: [],
          event: {} as MouseEvent,
        };
        const eventDataSort = {
          sortColumnClicked: 'title',
          previousSort: [{ columnName: 'title', direction: 'asc' }],
          suggestedSort: [{ columnName: 'title', direction: 'desc' }],
        } satisfies GridSortEvent;

        emitWrapper('dblclick', eventDataDblClick);
        emitWrapper('sort', eventDataSort);

        expect(mockEmit).toHaveBeenCalledWith('dblclick', eventDataDblClick);
        expect(mockEmit).toHaveBeenCalledWith('sort', eventDataSort);
      });
    });

    describe('validation warnings', () => {
      it('should warn about non-filterable columns in filterState', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        });
        const filterStateWithInvalid = new Group({
          id: Field.create({ value: 123 }), // id is not filterable
          title: Field.create({ value: 'test' }),
        }) as FilterState;
        mockProps.filterState = filterStateWithInvalid;
        const inputRecords = computed(() => mockRecords);

        useFiltering(mockProps, mockEmit, mockUColumns, inputRecords);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('non-filterable column: id'),
        );

        consoleSpy.mockRestore();
      });
    });
  });
});
