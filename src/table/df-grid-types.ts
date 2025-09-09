import { RendererOptionsMap, RowValue } from './cell-renderers';
import { ColumnDefinition } from './columns';

export interface GridProps {
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  records: RowValue[];
  keyField: string;
  mainShadowCount?: number;
}

export type RowIndex = number | 'header';
