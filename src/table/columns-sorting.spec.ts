import { computed, nextTick, ref } from 'vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { ColumnDefinition } from './columns';
import {
  getSortConfig,
  processSortEvent,
  sortExternal,
  type SortConfig,
  type SortState,
  type SortStateColumn,
  useSorting,
} from './columns-sorting';
import type { GridEmits, GridProps } from './df-grid-types';
import type { RowValue } from './cell-renderers';

// Mock data for testing
const mockRecords: RowValue[] = [
  { id: 1, title: 'Zebra', artist: 'Alpha', year: 2020 },
  { id: 2, title: 'Apple', artist: 'Beta', year: 2019 },
  { id: 3, title: 'Mango', artist: 'Alpha', year: 2021 },
  { id: 4, title: 'Banana', artist: null, year: 2018 },
  { id: 5, title: 'Cherry', artist: 'Gamma', year: null },
];

const mockColumns: ColumnDefinition[] = [
  { fieldName: 'title', label: 'Title', sortable: true },
  { fieldName: 'artist', label: 'Artist', sortable: true },
  { fieldName: 'year', label: 'Year', sortable: { direction: 'both', nulls: 'first' } },
  { fieldName: 'id', label: 'ID', sortable: { direction: 'asc' } },
  { fieldName: 'unsortable', label: 'Unsortable', sortable: false },
  { fieldName: 'external', label: 'External', sortable: { key: sortExternal } },
];

describe('columns-sorting.ts', () => {
  describe('getSortConfig', () => {
    it('should return default config for true', () => {
      const config = getSortConfig(true);
      expect(config.direction).toBe('both');
      expect(config.nulls).toBe('last');
    });

    it('should return empty config for false', () => {
      const config = getSortConfig(false);
      expect(config).toEqual({});
    });

    it('should merge provided config with defaults', () => {
      const config = getSortConfig({ direction: 'asc' });
      expect(config.direction).toBe('asc');
      expect(config.nulls).toBe('last');
    });

    it('should preserve all custom config properties', () => {
      const customCompare = (a: any, b: any) => a - b;
      const config = getSortConfig({
        direction: 'desc',
        nulls: 'first',
        locale: 'sl-SI',
        compare: customCompare,
        key: ['lastName', 'firstName'],
      });
      expect(config.direction).toBe('desc');
      expect(config.nulls).toBe('first');
      expect(config.locale).toBe('sl-SI');
      expect(config.compare).toBe(customCompare);
      expect(config.key).toEqual(['lastName', 'firstName']);
    });
  });


  describe('processSortEvent', () => {
    let mockEmit: ReturnType<typeof vi.fn>;
    let mockHeaderRef: any;
    let mockUColumns: any;
    let mockEvent: MouseEvent;

    beforeEach(() => {
      mockEmit = vi.fn();
      mockHeaderRef = ref(null);
      mockUColumns = {
        columns: computed(() => mockColumns),
        activeColumnsDefinition: computed(() => ({ columns: mockColumns })),
      };
      mockEvent = {
        target: document.createElement('div'),
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
      } as unknown as MouseEvent;
    });

    describe('normal click behavior', () => {
      it('should set single column sort on first click', () => {
        const sortState: SortState = [];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['title'],
          'click',
          mockEvent,
          'title',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'asc' },
        ]);
      });

      it('should cycle asc to desc on second click', () => {
        const sortState: SortState = [{ columnName: 'title', direction: 'asc' }];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['title'],
          'click',
          mockEvent,
          'title',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'desc' },
        ]);
      });

      it('should remove sort on third click', () => {
        const sortState: SortState = [{ columnName: 'title', direction: 'desc' }];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['title'],
          'click',
          mockEvent,
          'title',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', []);
      });

      it('should replace existing multi-column sort with single column', () => {
        const sortState: SortState = [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'desc' },
        ];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['year'],
          'click',
          mockEvent,
          'year',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'year', direction: 'asc' },
        ]);
      });
    });

    describe('shift+click behavior', () => {
      beforeEach(() => {
        mockEvent.shiftKey = true;
      });

      it('should add new column to existing sort', () => {
        const sortState: SortState = [{ columnName: 'title', direction: 'asc' }];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'click',
          mockEvent,
          'artist',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'asc' },
        ]);
      });

      it('should cycle existing column in multi-sort', () => {
        const sortState: SortState = [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'asc' },
        ];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'click',
          mockEvent,
          'artist',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'desc' },
        ]);
      });

      it('should remove column from multi-sort on third click', () => {
        const sortState: SortState = [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'desc' },
        ];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'click',
          mockEvent,
          'artist',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'asc' },
        ]);
      });

      it('should not clear other columns when adding new one', () => {
        const sortState: SortState = [
          { columnName: 'title', direction: 'desc' },
          { columnName: 'artist', direction: 'asc' },
        ];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['year'],
          'click',
          mockEvent,
          'year',
        );

        const emittedState = mockEmit.mock.calls[1][1];
        expect(emittedState).toHaveLength(3);
        expect(emittedState[0].columnName).toBe('title');
        expect(emittedState[1].columnName).toBe('artist');
        expect(emittedState[2].columnName).toBe('year');
      });
    });

    describe('longpress behavior', () => {
      it('should behave like shift+click for new column', () => {
        const sortState: SortState = [{ columnName: 'title', direction: 'asc' }];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'longpress',
          mockEvent,
          'artist',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'asc' },
        ]);
      });

      it('should cycle existing column like shift+click', () => {
        const sortState: SortState = [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'asc' },
        ];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'longpress',
          mockEvent,
          'artist',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'desc' },
        ]);
      });
    });

    describe('ctrl/alt modifier keys', () => {
      it('should do nothing on ctrl+click', () => {
        mockEvent.ctrlKey = true;
        const sortState: SortState = [{ columnName: 'title', direction: 'asc' }];
        const sortStateCopy = [...sortState];

        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'click',
          mockEvent,
          'artist',
        );

        // Should emit but with unchanged state
        expect(mockEmit).toHaveBeenCalledWith('update:sortState', sortStateCopy);
      });

      it('should do nothing on alt+click', () => {
        mockEvent.altKey = true;
        const sortState: SortState = [{ columnName: 'title', direction: 'asc' }];
        const sortStateCopy = [...sortState];

        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['artist'],
          'click',
          mockEvent,
          'artist',
        );

        // Should emit but with unchanged state
        expect(mockEmit).toHaveBeenCalledWith('update:sortState', sortStateCopy);
      });
    });

    describe('edge cases', () => {
      it('should do nothing if column name is undefined', () => {
        const sortState: SortState = [{ columnName: 'title', direction: 'asc' }];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['unknown-class'],
          'click',
          mockEvent,
          undefined,
        );

        expect(mockEmit).not.toHaveBeenCalled();
      });

      it('should emit sort event with correct metadata', () => {
        const sortState: SortState = [];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['title'],
          'click',
          mockEvent,
          'title',
        );

        expect(mockEmit).toHaveBeenCalledWith('sort', {
          sortActionClicked: undefined,
          sortColumnClicked: 'title',
          previousSort: [],
          suggestedSort: [{ columnName: 'title', direction: 'asc' }],
        });
      });
    });

    describe('direction constraints', () => {
      it('should respect asc-only columns', () => {
        const sortState: SortState = [];
        processSortEvent(
          mockEmit,
          sortState,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['id'],
          'click',
          mockEvent,
          'id',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', [
          { columnName: 'id', direction: 'asc' },
        ]);

        // Second click should remove it (no desc allowed)
        const sortState2: SortState = [{ columnName: 'id', direction: 'asc' }];
        processSortEvent(
          mockEmit,
          sortState2,
          mockHeaderRef,
          mockUColumns,
          undefined,
          ['id'],
          'click',
          mockEvent,
          'id',
        );

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', []);
      });
    });
  });

  describe('useSorting hook', () => {
    let mockProps: GridProps;
    let mockEmit: ReturnType<typeof vi.fn>;
    let mockUColumns: any;

    beforeEach(() => {
      mockProps = {
        records: mockRecords,
        columns: mockColumns,
        keyField: 'id',
      };
      mockEmit = vi.fn();
      mockUColumns = {
        columns: computed(() => mockColumns),
        activeColumnsDefinition: computed(() => ({ columns: mockColumns })),
      };
    });

    describe('with external sortState prop', () => {
      it('should use external sortState when provided', () => {
        const externalSortState = ref<SortState>([{ columnName: 'title', direction: 'asc' }]);
        mockProps.sortState = externalSortState.value;

        const { sortState, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        expect(sortState.value).toEqual(externalSortState.value);
        expect(sortedRecords.value[0].title).toBe('Apple');
      });

      it('should react to external sortState changes', async () => {
        const externalSortState = ref<SortState>([{ columnName: 'title', direction: 'asc' }]);
        mockProps.sortState = externalSortState.value;

        const { sortState, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        expect(sortedRecords.value[0].title).toBe('Apple');

        // Change external state
        externalSortState.value = [{ columnName: 'title', direction: 'desc' }];
        mockProps.sortState = externalSortState.value;
        await nextTick();

        expect(sortedRecords.value[0].title).toBe('Zebra');
      });

      it('should emit update:sortState and update internal state', () => {
        const externalSortState = ref<SortState>([]);
        mockProps.sortState = externalSortState.value;

        const { emitWrapper } = useSorting(mockProps, mockEmit, mockUColumns);

        const newState: SortState = [{ columnName: 'title', direction: 'asc' }];
        emitWrapper('update:sortState', newState);

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', newState);
      });
    });

    describe('without external sortState prop (internal state)', () => {
      it('should use internal sortState when not provided', () => {
        const { sortState, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        expect(sortState.value).toEqual([]);
        expect(sortedRecords.value).toBe(mockRecords); // unsorted
      });

      it('should update internal state on emit', () => {
        const { sortState, emitWrapper, sortedRecords } = useSorting(
          mockProps,
          mockEmit,
          mockUColumns,
        );

        const newState: SortState = [{ columnName: 'title', direction: 'asc' }];
        emitWrapper('update:sortState', newState);

        expect(sortState.value).toEqual(newState);
        expect(sortedRecords.value[0].title).toBe('Apple');
      });

      it('should maintain internal state across multiple updates', () => {
        const { emitWrapper, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        emitWrapper('update:sortState', [{ columnName: 'title', direction: 'asc' }]);
        expect(sortedRecords.value[0].title).toBe('Apple');

        emitWrapper('update:sortState', [
          { columnName: 'title', direction: 'asc' },
          { columnName: 'artist', direction: 'desc' },
        ]);
        expect(sortedRecords.value[0].title).toBe('Apple');
        expect(sortedRecords.value[0].artist).toBe('Beta');
      });
    });

    describe('sortedRecords computation', () => {
      it('should return sorted records based on sortState', () => {
        const { emitWrapper, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        emitWrapper('update:sortState', [{ columnName: 'title', direction: 'desc' }]);

        expect(sortedRecords.value[0].title).toBe('Zebra');
        expect(sortedRecords.value[4].title).toBe('Apple');
      });

      it('should validate sortState before sorting', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { emitWrapper, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        // Try to sort by unsortable column
        emitWrapper('update:sortState', [{ columnName: 'unsortable', direction: 'asc' }]);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('unsortable column'),
        );
        expect(sortedRecords.value).toBe(mockRecords); // should remain unsorted

        consoleSpy.mockRestore();
      });

      it('should handle external sort columns', () => {
        const { emitWrapper, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        // External sort should not sort locally
        emitWrapper('update:sortState', [{ columnName: 'external', direction: 'asc' }]);

        expect(sortedRecords.value).toBe(mockRecords); // unchanged
      });

      it('should not mutate original records', () => {
        const originalIds = mockRecords.map((r) => r.id);
        const { emitWrapper, sortedRecords } = useSorting(mockProps, mockEmit, mockUColumns);

        emitWrapper('update:sortState', [{ columnName: 'title', direction: 'asc' }]);

        // sortedRecords changed
        expect(sortedRecords.value[0].id).not.toBe(originalIds[0]);

        // but original records unchanged
        expect(mockRecords.map((r) => r.id)).toEqual(originalIds);
      });
    });

    describe('emitWrapper passthrough', () => {
      it('should pass through non-sortState events', () => {
        const { emitWrapper } = useSorting(mockProps, mockEmit, mockUColumns);

        emitWrapper('click', { rowId: 1 } as any);

        expect(mockEmit).toHaveBeenCalledWith('click', { rowId: 1 });
      });

      it('should handle multiple event types', () => {
        const { emitWrapper } = useSorting(mockProps, mockEmit, mockUColumns);

        emitWrapper('click', { rowId: 1 } as any);
        emitWrapper('dblclick', { rowId: 2 } as any);
        emitWrapper('sort', {} as any);

        expect(mockEmit).toHaveBeenCalledTimes(3);
      });
    });
  });
});
