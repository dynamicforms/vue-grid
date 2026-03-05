import { vi } from 'vitest';
import { computed, EmitFn } from 'vue';

import type { RowValue } from './cell-renderers';
import type { ColumnDefinition, useColumns } from './columns';
import { filterExternal, useFiltering } from './columns-filtering';
import { SortConfig, sortExternal, useSorting } from './columns-sorting';
import type { GridEmits, GridProps } from './df-grid-types';

// Mock data for testing
const mockRecords: RowValue[] = [
  { id: 1, title: 'Zebra', artist: 'Alpha', year: 2020, active: true, genre: 'Rock' },
  { id: 2, title: 'Apple', artist: 'Beta', year: 2019, active: false, genre: 'Pop' },
  { id: 3, title: 'Mango', artist: 'Alpha', year: 2021, active: true, genre: 'Jazz' },
  { id: 4, title: 'Banana', artist: null, year: 2018, active: false, genre: 'Rock' },
  { id: 5, title: 'Cherry', artist: 'Gamma', year: null, active: true, genre: 'Pop' },
  { id: 6, title: 'Apple Pie', artist: 'Beta', year: 2020, active: true, genre: 'Rock' },
  { id: 7, title: 'Zebra Crossing', artist: 'Alpha', year: 2019, active: false, genre: 'Jazz' },
];

const mockColumns: ColumnDefinition[] = [
  { fieldName: 'title', label: 'Title', sortable: true, filterable: true },
  { fieldName: 'artist', label: 'Artist', sortable: true, filterable: { fieldType: 'string' } },
  { fieldName: 'year', label: 'Year', sortable: true, filterable: { fieldType: 'number' } },
  { fieldName: 'active', label: 'Active', sortable: true, filterable: { fieldType: 'boolean' } },
  { fieldName: 'genre', label: 'Genre', sortable: true, filterable: true },
  { fieldName: 'id', label: 'ID', sortable: false, filterable: false },
];

describe('Filtering + Sorting Integration', () => {
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

  describe('filter then sort', () => {
    it('should apply filtering first, then sorting', () => {
      const inputRecords = computed(() => mockRecords);

      // Setup filtering
      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      // Setup sorting on filtered records
      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Apply filter: artist = 'Alpha'
      filterState.value!.fields.artist.value = 'Alpha';

      // Filtered records should have 3 items (Zebra, Mango, Zebra Crossing)
      expect(filteredRecords.value.length).toBe(3);
      expect(filteredRecords.value.map((r) => r.title)).toEqual([
        'Zebra',
        'Mango',
        'Zebra Crossing',
      ]);

      // Apply sort: title ascending
      sortEmit('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

      // Should be sorted: Mango, Zebra, Zebra Crossing
      expect(sortedRecords.value.length).toBe(3);
      expect(sortedRecords.value.map((r) => r.title)).toEqual(['Mango', 'Zebra', 'Zebra Crossing']);
    });

    it('should update sorted results when filter changes', () => {
      const inputRecords = computed(() => mockRecords);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Apply sort first: title ascending
      sortEmit('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

      // All records sorted
      expect(sortedRecords.value[0].title).toBe('Apple');
      expect(sortedRecords.value.length).toBe(7);

      // Now apply filter: genre = 'Rock'
      filterState.value!.fields.genre.value = 'Rock';

      // Should have 3 Rock records, sorted by title
      expect(sortedRecords.value.length).toBe(3);
      expect(sortedRecords.value.map((r) => r.title)).toEqual(['Apple Pie', 'Banana', 'Zebra']);
    });

    it('should handle multi-column sort with filters', () => {
      const inputRecords = computed(() => mockRecords);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Filter: active = true
      filterState.value!.fields.active.value = true;

      // Should have 4 active records
      expect(filteredRecords.value.length).toBe(4);

      // Apply multi-column sort: artist asc, year desc
      sortEmit('update:sortState', [
        { columnName: 'artist', direction: 'asc' },
        { columnName: 'year', direction: 'desc' },
      ]);

      // Expected order:
      // Alpha: Mango (2021), Zebra (2020)
      // Beta: Apple Pie (2020)
      // Gamma: Cherry (null year)
      expect(sortedRecords.value.length).toBe(4);
      expect(sortedRecords.value[0].title).toBe('Mango'); // Alpha, 2021
      expect(sortedRecords.value[1].title).toBe('Zebra'); // Alpha, 2020
      expect(sortedRecords.value[2].title).toBe('Apple Pie'); // Beta, 2020
      expect(sortedRecords.value[3].title).toBe('Cherry'); // Gamma, null
    });
  });

  describe('sort then filter', () => {
    it('should apply sorting first, then filtering (filter takes precedence)', () => {
      const inputRecords = computed(() => mockRecords);

      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        sortedRecords,
      );

      // Sort first: title ascending
      sortEmit('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

      // All records sorted
      expect(sortedRecords.value[0].title).toBe('Apple');

      // Filter: year = 2020
      filterState.value!.fields.year.value = 2020;

      // Should have 2 records with year 2020
      expect(filteredRecords.value.length).toBe(2);
      expect(filteredRecords.value.map((r) => r.title)).toContain('Zebra');
      expect(filteredRecords.value.map((r) => r.title)).toContain('Apple Pie');
    });
  });

  describe('multiple filters and sorts', () => {
    it('should handle multiple filters with multiple sorts', () => {
      const inputRecords = computed(() => mockRecords);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Apply multiple filters
      filterState.value!.fields.active.value = true;
      filterState.value!.fields.genre.value = 'Rock';

      // Should have 2 records: Zebra and Apple Pie (both active and Rock)
      expect(filteredRecords.value.length).toBe(2);

      // Apply sort: year desc
      sortEmit('update:sortState', [{ columnName: 'year', direction: 'desc' }]);

      // Should be sorted: Zebra (2020), Apple Pie (2020) - stable sort keeps original order
      expect(sortedRecords.value.length).toBe(2);
      expect(sortedRecords.value[0].year).toBe(2020);
      expect(sortedRecords.value[1].year).toBe(2020);
    });

    it('should clear filters and maintain sort', () => {
      const inputRecords = computed(() => mockRecords);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Filter and sort
      filterState.value!.fields.artist.value = 'Beta';
      sortEmit('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

      expect(sortedRecords.value.length).toBe(2);
      expect(sortedRecords.value[0].title).toBe('Apple');

      // Clear filter
      filterState.value!.fields.artist.value = '';

      // Should have all records, sorted
      expect(sortedRecords.value.length).toBe(7);
      expect(sortedRecords.value[0].title).toBe('Apple');
    });

    it('should clear sort and maintain filter', () => {
      const inputRecords = computed(() => mockRecords);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Filter and sort
      filterState.value!.fields.artist.value = 'Alpha';
      sortEmit('update:sortState', [{ columnName: 'title', direction: 'desc' }]);

      expect(sortedRecords.value.length).toBe(3);
      expect(sortedRecords.value[0].title).toBe('Zebra Crossing');

      // Clear sort
      sortEmit('update:sortState', []);

      // Should still be filtered, but not sorted (original order)
      expect(sortedRecords.value.length).toBe(3);
      expect(sortedRecords.value.map((r) => r.title)).toEqual([
        'Zebra',
        'Mango',
        'Zebra Crossing',
      ]);
    });
  });

  describe('external filter and sort handling', () => {
    it('should not filter locally when external filter is present', () => {
      const columnsWithExternal = [
        ...mockColumns,
        { fieldName: 'external', label: 'External', sortable: true, filterable: { key: filterExternal } },
      ];

      const mockPropsLocal = {
        ...mockProps,
        columns: columnsWithExternal,
      };

      const mockUColumnsLocal = {
        columns: computed(() => columnsWithExternal),
        activeColumnsDefinition: computed(() => ({ columns: columnsWithExternal })),
      };

      const inputRecords = computed(() => mockRecords);
      const { filterState, filteredRecords } = useFiltering(
        mockPropsLocal as GridProps,
        mockEmit,
        mockUColumnsLocal as ReturnType<typeof useColumns>,
        inputRecords,
      );

      // Set external filter value
      filterState.value!.fields.external.value = 'some value';

      // Should not filter locally - all records present
      expect(filteredRecords.value.length).toBe(mockRecords.length);
    });

    it('should not sort locally when external sort is present', () => {
      const columnsWithExternal = [
        ...mockColumns,
        { fieldName: 'external', label: 'External', sortable: { key: sortExternal }, filterable: false },
      ];

      const mockPropsLocal = {
        ...mockProps,
        columns: columnsWithExternal,
      };

      const mockUColumnsLocal = {
        columns: computed(() => columnsWithExternal),
        activeColumnsDefinition: computed(() => ({ columns: columnsWithExternal })),
      };

      const inputRecords = computed(() => mockRecords);
      const { sortedRecords, emitWrapper } = useSorting(
        mockPropsLocal as GridProps,
        mockEmit,
        mockUColumnsLocal as ReturnType<typeof useColumns>,
        inputRecords,
      );

      // Set external sort
      emitWrapper('update:sortState', [{ columnName: 'external', direction: 'asc' }]);

      // Should not sort locally - records in original order
      expect(sortedRecords.value).toEqual(mockRecords);
    });
  });

  describe('edge cases', () => {
    it('should handle empty records array', () => {
      const emptyRecords = computed(() => [] as RowValue[]);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        emptyRecords,
      );

      const { sortedRecords, emitWrapper } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      filterState.value!.fields.artist.value = 'Alpha';
      emitWrapper('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

      expect(filteredRecords.value).toEqual([]);
      expect(sortedRecords.value).toEqual([]);
    });

    it('should handle filters that result in empty array', () => {
      const inputRecords = computed(() => mockRecords);

      const { filterState, filteredRecords } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords, emitWrapper } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filteredRecords,
      );

      // Apply filter that matches nothing
      filterState.value!.fields.artist.value = 'NonExistent';

      expect(filteredRecords.value).toEqual([]);

      // Sort should still work on empty array
      emitWrapper('update:sortState', [{ columnName: 'title', direction: 'asc' }]);
      expect(sortedRecords.value).toEqual([]);
    });

    it('should handle complex filter + sort chains', () => {
      const inputRecords = computed(() => mockRecords);

      // Chain: records -> filter1 -> sort1 -> filter2
      const { filterState: filter1State, filteredRecords: filtered1 } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        inputRecords,
      );

      const { sortedRecords: sorted1, emitWrapper: sortEmit } = useSorting(
        mockProps,
        mockEmit,
        mockUColumns,
        filtered1,
      );

      const { filterState: filter2State, filteredRecords: filtered2 } = useFiltering(
        mockProps,
        mockEmit,
        mockUColumns,
        sorted1,
      );

      // Apply first filter: active = true
      filter1State.value!.fields.active.value = true;
      expect(filtered1.value.length).toBe(4);

      // Apply sort: title asc
      sortEmit('update:sortState', [{ columnName: 'title', direction: 'asc' }]);
      expect(sorted1.value[0].title).toBe('Apple Pie');

      // Apply second filter: genre = 'Rock'
      filter2State.value!.fields.genre.value = 'Rock';

      // Final result: active=true, genre=Rock, sorted by title
      expect(filtered2.value.length).toBe(2);
      expect(filtered2.value.map((r) => r.title)).toEqual(['Apple Pie', 'Zebra']);
    });
  });

  describe('performance considerations', () => {
    it('should re-sort when filter changes (expected behavior)', () => {
      const sortSpy = vi.fn((a, b) => (a.localeCompare(b)));

      const columnsWithCustomSort = [
        {
          fieldName: 'title',
          label: 'Title',
          sortable: { compare: sortSpy } as SortConfig,
          filterable: true,
        },
        ...mockColumns.slice(1),
      ];

      const mockPropsLocal = {
        ...mockProps,
        columns: columnsWithCustomSort,
      };

      const mockUColumnsLocal = {
        columns: computed(() => columnsWithCustomSort),
        activeColumnsDefinition: computed(() => ({ columns: columnsWithCustomSort })),
      };

      const inputRecords = computed(() => mockRecords);
      const { filterState, filteredRecords } = useFiltering(
        mockPropsLocal,
        mockEmit,
        mockUColumnsLocal as ReturnType<typeof useColumns>,
        inputRecords,
      );

      const { sortedRecords, emitWrapper } = useSorting(
        mockPropsLocal,
        mockEmit,
        mockUColumnsLocal as ReturnType<typeof useColumns>,
        filteredRecords,
      );

      // Apply sort
      emitWrapper('update:sortState', [{ columnName: 'title', direction: 'asc' }]);
      const sortCallCount = sortSpy.mock.calls.length;

      // Access sortedRecords to ensure computation
      expect(sortedRecords.value.length).toBe(7);

      // Change filter - should trigger new sort on filtered subset
      filterState.value!.fields.artist.value = 'Alpha';

      // Access sortedRecords again
      expect(sortedRecords.value.length).toBe(3);

      // Sort should have been called again for the filtered records (this is expected)
      expect(sortSpy.mock.calls.length).toBeGreaterThan(sortCallCount);
    });

    it('should not re-sort when no filter or sort state changes', () => {
      const sortSpy = vi.fn((a, b) => a.localeCompare(b));

      const columnsWithCustomSort = [
        {
          fieldName: 'title',
          label: 'Title',
          sortable: { compare: sortSpy },
          filterable: true,
        },
        ...mockColumns.slice(1),
      ];

      const mockPropsLocal = {
        ...mockProps,
        columns: columnsWithCustomSort,
      };

      const mockUColumnsLocal = {
        columns: computed(() => columnsWithCustomSort),
        activeColumnsDefinition: computed(() => ({ columns: columnsWithCustomSort })),
      };

      const inputRecords = computed(() => mockRecords);
      const { filteredRecords } = useFiltering(
        mockPropsLocal,
        mockEmit,
        mockUColumnsLocal as ReturnType<typeof useColumns>,
        inputRecords,
      );

      const { sortedRecords, emitWrapper } = useSorting(
        mockPropsLocal,
        mockEmit,
        mockUColumnsLocal as ReturnType<typeof useColumns>,
        filteredRecords,
      );

      // Apply sort
      emitWrapper('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

      // Access sortedRecords to ensure computation
      expect(sortedRecords.value.length).toBe(7);

      const sortCallCount = sortSpy.mock.calls.length;

      // Access sortedRecords again without changing anything
      const result1 = sortedRecords.value.length;
      const result2 = sortedRecords.value.length;
      expect(result1).toBe(7);
      expect(result2).toBe(7);

      // Sort should NOT have been called again (computed should cache)
      expect(sortSpy.mock.calls.length).toBe(sortCallCount);
    });
  });
});
