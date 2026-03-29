import { vi } from 'vitest';
import { computed, ComputedRef, ref } from 'vue';

import type { RowValue } from './cell-renderers';
import type { ColumnDefinition } from './columns';
import { SortState } from './columns-sorting';
import { GridClickEvent, useGridMouseEvents, useGridMouseEventsPosition } from './df-grid-mouse-events';
import type { GridProps } from './df-grid-types';

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
    let mockEmit: ReturnType<typeof vi.fn>;
    let mockProps: GridProps;
    let mockSortState: ComputedRef<SortState>;
    let mockHeaderRef: ReturnType<typeof ref>;
    let mockUColumns: any;

    beforeEach(() => {
      mockEmit = vi.fn();
      mockProps = {
        records: mockRecords,
        columns: mockColumns,
        keyField: 'id',
      };
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

    describe('column name extraction', () => {
      it('should extract correct column name from classes', () => {
        const { processMouse } = useGridMouseEvents(
          mockEmit,
          mockProps,
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
  });
});
