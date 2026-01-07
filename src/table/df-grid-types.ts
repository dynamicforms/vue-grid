import { RowValue } from './cell-renderers';
import { type ResponsiveColumnDefinitions } from './columns';
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
}

export type RowIndex = number | 'header';

export interface GridEmits {
  click: [data: GridClickEvent];
  dblclick: [data: GridClickEvent];
  sort: [data: GridSortEvent];
  'update:activeColumns': [newValue: string];
  'update:sortState': [newValue: SortState];
}
