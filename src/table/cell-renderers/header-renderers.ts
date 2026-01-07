import { RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import type { ColumnSortState } from '../columns-sorting';

import type { CellOptions, CellOptionsInternal } from './interfaces';

export interface HeaderOptions extends CellOptions {
  sortState: ColumnSortState;
  icon?: string;
}

export const header = (
  value: string,
  rowValue: any,
  options: CellOptionsInternal<HeaderOptions>,
): RenderableValue => new RenderableValue({
  componentName: 'df-header-cell',
  componentProps: { ...options, value },
} as SimpleComponentDef);
