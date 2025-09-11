import { RowValue } from './cell-renderers';
import { type ResponsiveColumnDefinitions } from './columns';
import { GridClickEvent } from './df-grid-mouse-events';

export interface GridProps {
  columns: ResponsiveColumnDefinitions;
  activeColumns?: string;
  records: RowValue[];
  keyField: string;
  mainShadowCount?: number;
  secondaryShadowCount?: number;
}

export type RowIndex = number | 'header';

export interface GridEmits {
  (e: 'click', data: GridClickEvent): void;
  (e: 'dblclick', data: GridClickEvent) : void;
  (e: 'update:activeColumns', newValue: string): void;
}
