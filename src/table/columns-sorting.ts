import { cloneDeep } from 'lodash-es';
import { CompareFn } from 'natural-orderby';
import { EmitFn, Ref } from 'vue';

import { RendererOptionsMap, RowValue } from './cell-renderers';
import { type ColumnDefinition, type useColumns } from './columns';
import type { GridEmits, GridProps } from './df-grid-types';

export const sortExternal = Symbol('sort external');

/**
 * SortConfig specifies how a particular column should be sorted. Several properties are supported to provide as much
 * flexibility as possible. This is all supported by natural-orderby library and the properties here mirror the
 * properties used by the natural-orderby library.
 */
export interface SortConfig {
  // Allowed sorting directions
  direction?: 'both' | 'asc' | 'desc';
  // props used for sorting this column (e.g. full name is sorted by ['lastName', 'firstName']). Specify sortExternal
  // if you want the backend to sort the column. in such a case, it is expected that in response to "update:sortOrder"
  // event, the code issues a BE call that will return sorted data. df-grid does nothing with such a column
  // in terms of sorting.
  key?: string[] | typeof sortExternal;
  // specifies whether nulls should be sorted first or last
  nulls?: 'first' | 'last';
  // custom BCP 47 language tag - if unspecified, default browser locale will be used. e.g. sl-SI
  locale?: string;
  // custom comparison function
  compare?: CompareFn;
}
export type Sortable = boolean | SortConfig;

/**
 * defaultColumnSortConfig specifies the default SortConfig for each column when such a config is not provided by
 * the programmer. By default, everything is sortable in both directions.
 */
export const defaultColumnSortConfig = {
  direction: 'both' as SortConfig['direction'],
  nulls: 'last',
} as SortConfig;

/**
 * SortStateColumn specifies sort state as desired by the programmer. This will be the external interface to the grid,
 * specifying how the table should be sorted. It will also take into account the SortConfig settings on how a
 * particular column should be sorted, when such a column is specified to actually be sorted.
 *
 * The table will check for discrepancies and report invalid settings such as column sorted that has SortConfig
 * that says it's unsortable. In such a case, the SortStateColumn setting in question will simply be ignored and
 * a warning will be printed into the console
 */
export interface SortStateColumn {
  columnName: string;
  direction: 'asc' | 'desc';
}

/**
 * SortState is the actual array - parameter into the df-table specifying current sort order. table "update:sortOrder"
 * event will also carry proposed new value for this array when a sorting event happens in the table
 * (sorting indicator click).
 */
export type SortState = SortStateColumn[];

export function getSortConfig(sort?: Sortable): SortConfig {
  if (sort === true) return defaultColumnSortConfig;
  else if (sort === false || sort == null) return {};
  else if (sort.direction || sort.key || sort.compare || sort.nulls || sort.locale) return {
    direction: sort.direction ?? defaultColumnSortConfig.direction,
    nulls: sort.nulls ?? defaultColumnSortConfig.nulls,
    key: sort.key,
    locale: sort.locale,
    compare: sort.compare,
  }
  return {};
}

export interface ColumnSortState {
  direction?: 'asc' | 'desc';
  index?: number;
  sortable?: boolean;
}

export type ColumnDefinitionWithSortState<T extends keyof RendererOptionsMap = 'plain'> =
  ColumnDefinition<T> & { sortState: ColumnSortState };

export interface GridSortEvent {
  sortActionClicked?: 'asc' | 'desc' | 'sort-index';
  sortColumnClicked: string;
  previousSort: SortState;
  suggestedSort: SortState;

}
type SortActionClicked = GridSortEvent['sortActionClicked'];

export type SortEvents = 'click' | 'dblclick' | 'longpress';

function cycleSort(sortConfig: SortConfig, sortColumnState: SortStateColumn): boolean {
  // This function is called only when column already has sort state (is sorted)
  // Cycle logic: asc -> desc (if both allowed), otherwise -> unsorted
  if (sortConfig.direction === 'both' && sortColumnState.direction === 'asc') {
    sortColumnState.direction = 'desc';
    return true; // keep in sort
  }
  // All other cases: remove from sort (back to unsorted)
  return false;
}

export function processSortEvent(
  emit: EmitFn<GridEmits>,
  props: GridProps,
  headerRef: Ref,
  uColumns: ReturnType<typeof useColumns>,
  rowData: RowValue | undefined,
  columnClasses: string[],
  eType: SortEvents,
  event: MouseEvent | TouchEvent,
  sortColumnClicked?: string,
) {
  if (sortColumnClicked == null) return; // We can't sort if we can't identify the column clicked
  const target = event.target as HTMLElement;
  const previousSort = props.sortState ?? [];
  const suggestedSort = cloneDeep(previousSort);
  const sortActionClicked = ((
    target.getAttribute('data-sort') || target.closest('[data-sort]')?.getAttribute('data-sort')
  ) ?? undefined) as SortActionClicked;
  const columnSortConfig = getSortConfig(
    uColumns.columns.value.find((c) => c.fieldName === sortColumnClicked)?.sortable,
  );
  let sortColumnState = suggestedSort.find((c) => c.columnName === sortColumnClicked);
  let stopProcessing = false;
  if (eType === 'longpress' || (event instanceof MouseEvent && event.shiftKey)) {
    // long press or shift + click will add this column to the sort order if it's not already in the order.
    if (sortColumnState == null) {
      // if this segment wasn't sorted yet, we add it to sorting order and its processing is complete; as opposed to
      // the column already being in the sort configuration in which case its sort direction needs to change
      stopProcessing = true;
      if (columnSortConfig.direction != null) {
        sortColumnState = {
          columnName: sortColumnClicked,
          direction: columnSortConfig.direction === 'desc' ? 'desc' : 'asc',
        };
        suggestedSort.push(sortColumnState);
      }
    } else {
      const keepInSort = cycleSort(columnSortConfig, sortColumnState);
      if (!keepInSort) {
        const index = suggestedSort.findIndex((c) => c.columnName === sortColumnClicked);
        if (index !== -1) suggestedSort.splice(index, 1);
      }
    }
  }
  if (stopProcessing || (event instanceof MouseEvent && (event.ctrlKey || event.altKey))) {
    // we currently don't support ctrl and alt modifiers, so we do nothing
  } else {
    // this is "normal" click on the column where we either do exactly as the user clicked (not supported beyond
    // identifying what the user clicked) or we cycle the sort order in the column;
    if (sortColumnState == null) {
      // column was unsorted, so we set sort order to it
      sortColumnState = {
        columnName: sortColumnClicked,
        direction: columnSortConfig.direction === 'desc' ? 'desc' : 'asc',
      };
    } else {
      // here we cycle the existing sort order on this column
      if (columnSortConfig.direction !== 'both' || sortColumnState.direction === 'desc') {
        // clicking on the column makes the column unsorted right now
        sortColumnState = undefined;
      } else {
        // only one possibility remains: the column is sortable in both directions and it's currently asc, so we move
        // it to desc. This is because we don't store unsorted state and the cycle is unsorted -> asc -> desc
        sortColumnState.direction = 'desc';
      }
    }
    suggestedSort.length = 0;
    if (sortColumnState != null) suggestedSort.push(sortColumnState);
  }

  emit('sort', { sortActionClicked, sortColumnClicked, previousSort, suggestedSort });
  emit('update:sortState', suggestedSort);
}
