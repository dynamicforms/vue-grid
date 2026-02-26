import { RowValue } from './cell-renderers';
import { type ResponsiveColumnDefinitions } from './columns';
import { FilterState, GridFilterEvent } from './columns-filtering';
import { GridSortEvent, SortState } from './columns-sorting';
import { GridClickEvent } from './df-grid-mouse-events';

export interface GridProps {
  columns: ResponsiveColumnDefinitions;
  activeColumns?: string;
  records: RowValue[];
  keyField: string;
  mainShadowCount?: number;
  secondaryShadowCount?: number;
  sortState?: SortState;
  filterState?: FilterState;
  showFilterRow?: boolean;
  showStatusBar?: boolean;
}

export type RowIndex = number | 'header';

export interface GridEmits {
  click: [data: GridClickEvent];
  dblclick: [data: GridClickEvent];
  sort: [data: GridSortEvent];
  filter: [data: GridFilterEvent];
  'update:activeColumns': [newValue: string];
  'update:filterState': [newValue: FilterState];
  'update:sortState': [newValue: SortState];
}

export type GridEmit = <K extends keyof GridEmits>(
  event: K,
  ...args: GridEmits[K]
) => void;
