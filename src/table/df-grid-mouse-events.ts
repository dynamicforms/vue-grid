import { ComputedRef, EmitFn, Ref, ref } from 'vue';

import { type RowValue } from './cell-renderers';
import { type useColumns } from './columns';
import { PositionEvents, processSortEvent, SortEvents, SortState } from './columns-sorting';
import type { RowIndex, GridProps, GridEmits } from './df-grid-types';

const longPress = ref(false);
const longPressClicked = ref(false);

export interface GridClickEvent {
  rowId: RowIndex; // 'header' or 0-based index of this row
  key: any; // 'header' or whatever is in the 'keyField' column of clicked row
  rowData: RowValue | undefined; // row data as provided in the 'records' prop or composed header data
  // additional classes set for this column. generic grid classes stripped out, but column.fieldName plus
  // column.cssClasses remain
  columnClasses: string[];
  event: MouseEvent | TouchEvent; // mouse click event verbatim
  columnName?: string; // column name
}

export function useGridMouseEvents(
  emit: EmitFn<GridEmits>,
  props: GridProps,
  sortState: ComputedRef<SortState>,
  headerRef: Ref,
  uColumns: ReturnType<typeof useColumns>,
) {
  function processMouse(eType: SortEvents, event: TouchEvent | MouseEvent) {
    const target = event.target as HTMLElement;

    const column = target.closest('.df-grid.cell');
    const row = target?.closest('.df-grid.card');
    const columnClasses = [...(column?.classList ?? [])]
      .filter((c: any) => !['df-grid', 'cell', 'df-header-cell'].includes(c));
    const dataIdx = row?.getAttribute('data-idx') ?? '-1';
    let rowData: RowValue | undefined;
    let rowId: RowIndex;
    let key: any;
    if (dataIdx === 'header') {
      rowId = dataIdx;
      rowData = headerRef.value?.headerItem;
      key = 'header';
    } else {
      rowId = Number.parseInt(dataIdx, 10);
      rowData = rowId === -1 ? undefined : props.records[rowId];
      key = rowData?.[props.keyField];
    }
    const columnNames = new Set(uColumns.activeColumnsDefinition.value.columns.map((c) => c.fieldName));
    const columnName = columnClasses.find((c: any) => columnNames.has(c));

    if (key === 'header') {
      const doSort = (eType === 'click' && !longPress.value) || eType === 'longpress';
      if (doSort) {
        processSortEvent(emit, sortState.value, headerRef, uColumns, rowData, columnClasses, eType, event, columnName);
      }
      longPress.value = eType === 'longpress';
      longPressClicked.value = eType === 'longpress';
    }

    if (eType === 'click') {
      const p: GridClickEvent = { rowId, key, rowData, columnClasses, event, columnName };
      emit(eType as 'click', p); // typecast needed to unconfuse TS about what event we're calling
    }
  }

  return { processMouse };
}

export function useGridMouseEventsPosition() {
  function processPosition(eType: PositionEvents, event: TouchEvent | MouseEvent) {
    let buttonOn = false;
    // eslint-disable-next-line no-bitwise
    if (event instanceof MouseEvent) buttonOn = (event.buttons & 1) === 1;
    else if (event instanceof TouchEvent) buttonOn = event.touches.length > 0;
    if (buttonOn) {
      if (eType === 'enter' && longPressClicked.value) longPress.value = true;
      else if (eType === 'leave') longPress.value = false;
    }
  }

  return { processPosition };
}
