import { RowValue } from './cell-renderers';
import type { RowIndex, GridProps } from './df-grid-types';

export interface GridClickEvent {
  rowId: RowIndex;
  key: any;
  rowData: RowValue | undefined;
  columnClasses: string[];
  event: MouseEvent;
}

export interface GridEmits {
  (e: 'click', data: GridClickEvent): void;
  (e: 'dblclick', data: GridClickEvent) : void;
}

export function useGridMouseEvents(emit: GridEmits, props: GridProps) {
  function processMouse(eType: 'click' | 'dblclick', event: MouseEvent) {
    const target = event.target as HTMLElement;

    const column = target.closest('.df-grid.cell');
    const row = target?.closest('.df-grid.card');
    const columnClasses = [...(column?.classList ?? [])].filter((c: any) => !['df-grid', 'cell'].includes(c));
    const dataIdx = row?.getAttribute('data-idx') ?? '-1';
    let rowData: RowValue | undefined;
    let rowId: RowIndex;
    if (dataIdx === 'header') {
      rowId = dataIdx;
      rowData = headerRef.value?.headerItem;
    } else {
      rowId = Number.parseInt(dataIdx, 10);
      rowData = rowId === -1 ? undefined : props.records[rowId];
    }
    emit(eType as any, { rowId, key: rowData?.[props.keyField], rowData, columnClasses, event });
  }

  return { processMouse };
}
