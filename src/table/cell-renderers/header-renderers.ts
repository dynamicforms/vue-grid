import {
  type RenderContentNonCallable,
  RenderableValue,
  renderContentText,
  SimpleComponentDef,
} from '@dynamicforms/vuetify-inputs';

import type { ColumnSortState } from '../columns-sorting';
import { useGridMouseEventsPosition } from '../df-grid-mouse-events';

import type { CellOptions, CellOptionsInternal } from './interfaces';

export interface HeaderOptions extends CellOptions {
  sortState: ColumnSortState;
  icon?: string;
}

/** Header option key: the column's place in the sort the grid applies, for `aria-sort`; `sortState` when absent. */
export const ariaSortStateOption = Symbol('ariaSortState');

const { processPosition } = useGridMouseEventsPosition();

/**
 * The `aria-sort` of a header cell: the direction on the primary sort column, `none` on an unsorted sortable column,
 * none at all on a non-sortable column and on the further columns of a multi-column sort.
 */
export function headerAriaSort(sortState: ColumnSortState): 'ascending' | 'descending' | 'none' | undefined {
  if (!sortState.sortable) return undefined;
  if (sortState.index == null || sortState.direction == null) return 'none';
  // a single-column sort has index 0, a multi-column sort numbers its columns from 1
  if (sortState.index > 1) return undefined;
  return sortState.direction === 'asc' ? 'ascending' : 'descending';
}

export const header = (
  value: RenderContentNonCallable,
  rowValue: any,
  options: CellOptionsInternal<HeaderOptions> & { [ariaSortStateOption]?: ColumnSortState },
): RenderableValue => {
  const preRv = options.icon
    ? new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: { name: options.icon, class: 'df-header-icon' },
      } as SimpleComponentDef)
    : null;

  const columnText = value == null ? '' : renderContentText(value);
  const postRv = new RenderableValue({
    componentName: 'SortingIndicator',
    componentProps: { ...options.sortState, columnText },
  } as SimpleComponentDef);

  const result = new RenderableValue({
    componentName: 'PreContentPost',
    componentProps: {
      pre: preRv,
      content: new RenderableValue(value),
      post: postRv,
      contentClass: 'content',
      // the header's name is the column text alone, without the sort button's name
      'aria-label': columnText || undefined,
      'aria-sort': headerAriaSort(options[ariaSortStateOption] ?? options.sortState),
      onPointerleave: (e: PointerEvent) => processPosition('leave', e),
      onPointerenter: (e: PointerEvent) => processPosition('enter', e),
    },
  } as SimpleComponentDef);
  result.classes = ['has-pre-post'];
  return result;
};
