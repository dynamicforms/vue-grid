import { vi } from 'vitest';
import { computed, ComputedRef, EmitFn, ref } from 'vue';

import type { RowValue } from './cell-renderers';
import type { ColumnDefinition } from './columns';
import { SortState } from './columns-sorting';
import { GridClickEvent, useGridMouseEvents, useGridMouseEventsPosition } from './df-grid-mouse-events';
import type { GridEmits, GridProps } from './df-grid-types';

// Mock data for testing
const mockRecords: RowValue[] = [
  { id: 1, title: 'Zebra', artist: 'Alpha' },
  { id: 2, title: 'Apple', artist: 'Beta' },
  { id: 3, title: 'Mango', artist: 'Alpha' },
];

const mockColumns: ColumnDefinition[] = [
  { fieldName: 'title', label: 'Title', sortable: true },
  { fieldName: 'artist', label: 'Artist', sortable: true },
  { fieldName: 'id', label: 'ID', sortable: false },
];

describe('df-grid-mouse-events.ts', () => {
  describe('useGridMouseEventsPosition', () => {
    let processPosition: ReturnType<typeof useGridMouseEventsPosition>['processPosition'];

    beforeEach(() => {
      ({ processPosition } = useGridMouseEventsPosition());
    });

    describe('mouse events', () => {
      it('should handle pointerenter with mouse button pressed', () => {
        const mouseEvent = new MouseEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          buttons: 1, // left button pressed
        });

        // Should not throw
        expect(() => processPosition('enter', mouseEvent)).not.toThrow();
      });

      it('should handle pointerleave with mouse button pressed', () => {
        const mouseEvent = new MouseEvent('pointerleave', {
          bubbles: true,
          cancelable: true,
          buttons: 1,
        });

        expect(() => processPosition('leave', mouseEvent)).not.toThrow();
      });

      it('should handle pointerenter without mouse button pressed', () => {
        const mouseEvent = new MouseEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          buttons: 0,
        });

        expect(() => processPosition('enter', mouseEvent)).not.toThrow();
      });

      it('should handle pointerleave without mouse button pressed', () => {
        const mouseEvent = new MouseEvent('pointerleave', {
          bubbles: true,
          cancelable: true,
          buttons: 0,
        });

        expect(() => processPosition('leave', mouseEvent)).not.toThrow();
      });
    });

    describe('touch events', () => {
      it('should handle pointerenter with active touch', () => {
        const touchEvent = new TouchEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          touches: [{ identifier: 1, target: document.createElement('div') } as unknown as Touch],
        });

        expect(() => processPosition('enter', touchEvent)).not.toThrow();
      });

      it('should handle pointerleave with active touch', () => {
        const touchEvent = new TouchEvent('pointerleave', {
          bubbles: true,
          cancelable: true,
          touches: [{ identifier: 1, target: document.createElement('div') } as unknown as Touch],
        });

        expect(() => processPosition('leave', touchEvent)).not.toThrow();
      });

      it('should handle touch events with no active touches', () => {
        const touchEvent = new TouchEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          touches: [],
        });

        expect(() => processPosition('enter', touchEvent)).not.toThrow();
      });
    });
  });

  describe('useGridMouseEvents', () => {
    let mockEmit: ReturnType<typeof vi.fn> & EmitFn<GridEmits>;
    let mockProps: GridProps;
    let mockDisplayedRecords: ComputedRef<RowValue[]>;
    let mockSortState: ComputedRef<SortState>;
    let mockHeaderRef: ReturnType<typeof ref>;
    let mockUColumns: any;

    beforeEach(() => {
      mockEmit = vi.fn() as unknown as ReturnType<typeof vi.fn> & EmitFn<GridEmits>;
      mockProps = {
        records: mockRecords,
        columns: mockColumns,
        keyField: 'id',
      };
      mockDisplayedRecords = computed(() => mockRecords);
      mockSortState = computed(() => []);
      mockHeaderRef = ref({ headerItem: { title: 'Title', artist: 'Artist', id: 'ID' } });
      mockUColumns = {
        columns: computed(() => mockColumns),
        activeColumnsDefinition: computed(() => ({ columns: mockColumns })),
      };
    });

    describe('processMouse for data rows', () => {
      it('should emit click event for data row', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        // Create a mock DOM structure
        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card';
        card.setAttribute('data-idx', '1');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('click', mouseEvent);

        expect(mockEmit).toHaveBeenCalledWith(
          'click',
          expect.objectContaining({
            rowId: 1,
            key: 2, // id value from mockRecords[1]
            rowData: mockRecords[1],
            columnName: 'title',
          } as Partial<GridClickEvent>),
        );

        document.body.removeChild(card);
      });

      it('should handle click on row without valid index', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card';
        card.setAttribute('data-idx', '-1');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('click', mouseEvent);

        expect(mockEmit).toHaveBeenCalledWith(
          'click',
          expect.objectContaining({
            rowId: -1,
            rowData: undefined,
          } as Partial<GridClickEvent>),
        );

        document.body.removeChild(card);
      });
    });

    describe('processMouse for header row', () => {
      it('should emit click event for header', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card header';
        card.setAttribute('data-idx', 'header');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('click', mouseEvent);

        expect(mockEmit).toHaveBeenCalledWith(
          'click',
          expect.objectContaining({
            rowId: 'header',
            key: 'header',
            columnName: 'title',
          } as Partial<GridClickEvent>),
        );

        document.body.removeChild(card);
      });

      it('should trigger sort on header click', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card header';
        card.setAttribute('data-idx', 'header');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('click', mouseEvent);

        // Should emit both click and sort events
        expect(mockEmit).toHaveBeenCalledWith('click', expect.any(Object));
        expect(mockEmit).toHaveBeenCalledWith('update:sortState', expect.any(Array));

        document.body.removeChild(card);
      });

      it('should trigger sort on header longpress', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card header';
        card.setAttribute('data-idx', 'header');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('longpress', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('longpress', mouseEvent);

        expect(mockEmit).toHaveBeenCalledWith('update:sortState', expect.any(Array));

        document.body.removeChild(card);
      });

      it('should not trigger sort on header click after longpress', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card header';
        card.setAttribute('data-idx', 'header');
        card.appendChild(cell);
        document.body.appendChild(card);

        const longpressEvent = new MouseEvent('longpress', { bubbles: true, cancelable: true });
        Object.defineProperty(longpressEvent, 'target', { value: cell, writable: false });

        // Trigger longpress first
        processMouse('longpress', longpressEvent);
        mockEmit.mockClear();

        // Then click - should not trigger another sort
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(clickEvent, 'target', { value: cell, writable: false });

        processMouse('click', clickEvent);

        // Should only emit click, not update:sortState
        expect(mockEmit).toHaveBeenCalledWith('click', expect.any(Object));
        expect(mockEmit).toHaveBeenCalledTimes(1);

        document.body.removeChild(card);
      });
    });

    describe('selection behavior', () => {
      let mockUSelection: any;

      function createDataRow(dataIdx: string, columnClass = 'title') {
        const cell = document.createElement('div');
        cell.className = `df-grid cell ${columnClass}`;
        const card = document.createElement('div');
        card.className = 'df-grid card';
        card.setAttribute('data-idx', dataIdx);
        card.appendChild(cell);
        document.body.appendChild(card);
        return { cell, card };
      }

      beforeEach(() => {
        mockUSelection = {
          selectionMode: { value: null },
          startSelection: vi.fn(),
          toggleKey: vi.fn(),
        };
      });

      it('long-press on data row calls startSelection with row key', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );
        const { cell, card } = createDataRow('1');
        const event = new MouseEvent('longpress', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'target', { value: cell, writable: false });

        processMouse('longpress', event);

        expect(mockUSelection.startSelection).toHaveBeenCalledWith(2); // id of mockRecords[1]
        expect(mockEmit).not.toHaveBeenCalled();
        document.body.removeChild(card);
      });

      it('shift+click when selectionMode is null calls startSelection', () => {
        mockUSelection.selectionMode.value = null;
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );
        const { cell, card } = createDataRow('0');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
        Object.defineProperty(event, 'target', { value: cell, writable: false });

        processMouse('click', event);

        expect(mockUSelection.startSelection).toHaveBeenCalledWith(1); // id of mockRecords[0]
        expect(mockUSelection.toggleKey).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
        document.body.removeChild(card);
      });

      it('shift+click when selectionMode is active calls toggleKey', () => {
        mockUSelection.selectionMode.value = 'selection';
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );
        const { cell, card } = createDataRow('2');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
        Object.defineProperty(event, 'target', { value: cell, writable: false });

        processMouse('click', event);

        expect(mockUSelection.toggleKey).toHaveBeenCalledWith(3); // id of mockRecords[2]
        expect(mockUSelection.startSelection).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
        document.body.removeChild(card);
      });

      it('regular click when selectionMode is active calls toggleKey and does not emit click', () => {
        mockUSelection.selectionMode.value = 'selection';
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );
        const { cell, card } = createDataRow('1');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'target', { value: cell, writable: false });

        processMouse('click', event);

        expect(mockUSelection.toggleKey).toHaveBeenCalledWith(2); // id of mockRecords[1]
        expect(mockEmit).not.toHaveBeenCalled();
        document.body.removeChild(card);
      });

      it('regular click when selectionMode is null emits click normally', () => {
        mockUSelection.selectionMode.value = null;
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );
        const { cell, card } = createDataRow('1');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'target', { value: cell, writable: false });

        processMouse('click', event);

        expect(mockUSelection.toggleKey).not.toHaveBeenCalled();
        expect(mockEmit).toHaveBeenCalledWith('click', expect.objectContaining({ key: 2 }));
        document.body.removeChild(card);
      });

      it('header click emits click even when uSelection is provided', () => {
        mockUSelection.selectionMode.value = 'selection';
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );
        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card header';
        card.setAttribute('data-idx', 'header');
        card.appendChild(cell);
        document.body.appendChild(card);
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'target', { value: cell, writable: false });

        processMouse('click', event);

        expect(mockEmit).toHaveBeenCalledWith('click', expect.objectContaining({ key: 'header' }));
        expect(mockUSelection.toggleKey).not.toHaveBeenCalled();
        document.body.removeChild(card);
      });
    });

    describe('column name extraction', () => {
      it('should extract correct column name from classes', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell artist some-other-class';
        const card = document.createElement('div');
        card.className = 'df-grid card';
        card.setAttribute('data-idx', '0');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('click', mouseEvent);

        expect(mockEmit).toHaveBeenCalledWith(
          'click',
          expect.objectContaining({ columnName: 'artist' } as Partial<GridClickEvent>),
        );

        document.body.removeChild(card);
      });

      it('should filter out generic grid classes', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        const cell = document.createElement('div');
        cell.className = 'df-grid cell df-header-cell title custom-class';
        const card = document.createElement('div');
        card.className = 'df-grid card';
        card.setAttribute('data-idx', 'header');
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });

        processMouse('click', mouseEvent);

        const emittedEvent = mockEmit.mock.calls.find((call) => call[0] === 'click')?.[1];
        expect(emittedEvent).toBeDefined();
        expect(emittedEvent.columnClasses).toEqual(['title', 'custom-class']);
        expect(emittedEvent.columnClasses).not.toContain('df-grid');
        expect(emittedEvent.columnClasses).not.toContain('cell');
        expect(emittedEvent.columnClasses).not.toContain('df-header-cell');

        document.body.removeChild(card);
      });
    });

    // -----------------------------------------------------------------------
    // Rows are addressed by their position in the displayed list (`data-idx`), which is the list
    // after filtering and sorting. Resolving that position against the `records` prop instead
    // hands out a different record - and the same wrong key then drives selection.
    // -----------------------------------------------------------------------
    describe('row identity in display order', () => {
      function clickRow(processMouse: (t: any, e: any) => void, dataIdx: string, type: any = 'click') {
        const cell = document.createElement('div');
        cell.className = 'df-grid cell title';
        const card = document.createElement('div');
        card.className = 'df-grid card';
        card.setAttribute('data-idx', dataIdx);
        card.appendChild(cell);
        document.body.appendChild(card);

        const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(mouseEvent, 'target', { value: cell, writable: false });
        processMouse(type, mouseEvent);

        document.body.removeChild(card);
      }

      it('reports the record shown at that position, not the one at that index in `records`', () => {
        // Sorted by title: Apple (id 2), Mango (id 3), Zebra (id 1).
        mockDisplayedRecords = computed(() => [mockRecords[1], mockRecords[2], mockRecords[0]]);
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        clickRow(processMouse, '0');

        const emitted = mockEmit.mock.calls.find((call) => call[0] === 'click')?.[1] as GridClickEvent;
        expect(emitted.key).toBe(2);
        expect(emitted.rowData).toEqual(mockRecords[1]);
      });

      it('resolves a position that only exists in the filtered list', () => {
        // Filtered down to the two Alpha records: Zebra (id 1), Mango (id 3).
        mockDisplayedRecords = computed(() => [mockRecords[0], mockRecords[2]]);
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
        );

        clickRow(processMouse, '1');

        const emitted = mockEmit.mock.calls.find((call) => call[0] === 'click')?.[1] as GridClickEvent;
        expect(emitted.key).toBe(3);
      });

      it('starts selection on the row the user actually pressed', () => {
        mockDisplayedRecords = computed(() => [mockRecords[2], mockRecords[1], mockRecords[0]]);
        const mockUSelection: any = {
          selectionMode: { value: null },
          startSelection: vi.fn(),
          toggleKey: vi.fn(),
        };
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );

        clickRow(processMouse, '0', 'longpress');

        expect(mockUSelection.startSelection).toHaveBeenCalledWith(3);
      });

      it('toggles the row the user actually clicked while selection is active', () => {
        mockDisplayedRecords = computed(() => [mockRecords[2], mockRecords[1], mockRecords[0]]);
        const mockUSelection: any = {
          selectionMode: { value: 'selection' },
          startSelection: vi.fn(),
          toggleKey: vi.fn(),
        };
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
          mockDisplayedRecords,
          mockSortState,
          mockHeaderRef,
          mockUColumns,
          mockUSelection,
        );

        clickRow(processMouse, '2');

        expect(mockUSelection.toggleKey).toHaveBeenCalledWith(1);
      });
    });
  });
});
