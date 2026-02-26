import { cloneDeep, get } from 'lodash-es';
import { CompareFn, orderBy } from 'natural-orderby';
import { computed, ComputedRef, EmitFn, ref, Ref, unref, watch } from 'vue';

import { RendererOptionsMap, RowValue } from './cell-renderers';
import { type ColumnDefinition, type useColumns } from './columns';
import type { GridEmits, GridProps } from './df-grid-types';
import type { MaybeRef } from './type-utils';

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
  if (sort === false || sort == null) return {};
  if (sort.direction || sort.key || sort.compare || sort.nulls || sort.locale) {
    return {
      direction: sort.direction ?? defaultColumnSortConfig.direction,
      nulls: sort.nulls ?? defaultColumnSortConfig.nulls,
      key: sort.key,
      locale: sort.locale,
      compare: sort.compare,
    };
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
export type PositionEvents = 'leave' | 'enter';

/**
 * validateSortState checks if the sortState is valid against the column definitions.
 * It logs warnings for invalid entries and returns a cleaned sortState.
 */
function validateSortState(
  sortState: SortState,
  columns: ComputedRef<ColumnDefinition<keyof RendererOptionsMap>[]>,
): SortState {
  const validatedState: SortState = [];

  for (const sortCol of sortState) {
    const colDef = columns.value.find((c) => c.fieldName === sortCol.columnName);

    if (!colDef) {
      console.warn(`[df-grid] sortState references non-existent column: ${sortCol.columnName}`);
    } else {
      const sortConfig = getSortConfig(colDef.sortable);

      if (!sortConfig.direction) {
        console.warn(`[df-grid] sortState references unsortable column: ${sortCol.columnName}`);
      } else if (sortConfig.direction !== 'both' && sortConfig.direction !== sortCol.direction) {
        console.warn(
          `[df-grid] sortState specifies direction "${sortCol.direction}" for column "${sortCol.columnName}" ` +
          `but column only allows "${sortConfig.direction}"`,
        );
      } else {
        validatedState.push(sortCol);
      }
    }
  }

  return validatedState;
}

/**
 * applySorting performs the actual sorting of records based on sortState and column configurations.
 * Returns the sorted records array.
 */
function applySorting(
  records: MaybeRef<RowValue[]>,
  sortState: SortState,
  columns: ComputedRef<ColumnDefinition<keyof RendererOptionsMap>[]>,
): RowValue[] {
  const recordsArray = unref(records);
  if (sortState.length === 0) return recordsArray;

  // Check if any column uses external sorting
  const hasExternalSort = sortState.some((sortCol) => {
    const colDef = columns.value.find((c) => c.fieldName === sortCol.columnName);
    if (!colDef) return false;
    const sortConfig = getSortConfig(colDef.sortable);
    return sortConfig.key === sortExternal;
  });

  // If any column uses external sorting, don't sort locally - backend handles it
  if (hasExternalSort) return recordsArray;

  // Build orderBy configuration for natural-orderby
  const identifiers: ((row: RowValue) => any)[] = [];
  const orders: ('asc' | 'desc')[] = [];
  const compareFns: (CompareFn | undefined)[] = [];

  for (const sortCol of sortState) {
    const colDef = columns.value.find((c) => c.fieldName === sortCol.columnName);
    if (colDef) {
      const sortConfig = getSortConfig(colDef.sortable);

      // Determine the keys to sort by
      const keys = sortConfig.key === sortExternal ? [sortCol.columnName] : (sortConfig.key ?? [sortCol.columnName]);

      // For each key in this sort column, add an identifier function
      for (const key of keys) {
        identifiers.push((row: RowValue) => {
          const value = get(row, key);
          // Handle nulls according to config
          if (value == null) {
            // Return a special value for null handling
            return sortConfig.nulls === 'first' ? '\u0000' : '\uFFFF';
          }
          return value;
        });

        orders.push(sortCol.direction);
        compareFns.push(sortConfig.compare);
      }
    }
  }

  // Clone the array to avoid mutating the original
  const sorted = [...recordsArray];

  // Use natural-orderby's orderBy function
  return orderBy(sorted, identifiers, orders);
}

export function useSorting(
  props: GridProps,
  emit: EmitFn<GridEmits>,
  uColumns: ReturnType<typeof useColumns>,
  inputRecords: MaybeRef<RowValue[]>,
) {
  const internalSortState = ref<SortState>(props.sortState ?? []);

  const sortState = computed(() => props.sortState ?? internalSortState.value);

  // Validated sort state
  const validatedSortState = computed(() => validateSortState(sortState.value, uColumns.columns));

  // Sorted records
  const sortedRecords = computed(() => applySorting(inputRecords, validatedSortState.value, uColumns.columns));

  // Watch for external prop changes
  watch(() => props.sortState, (newVal) => { internalSortState.value = newVal ?? []; });

  // Wrap emit to intercept update:sortState and update internal state
  const emitWrapper = ((event: any, ...args: any[]) => {
    if (event === 'update:sortState') {
      // Update internal state - it will be used when sort config is not provided as prop to table
      internalSortState.value = args[0];
    }
    // @ts-expect-error
    return emit(event, ...args);
  }) as EmitFn<GridEmits>;

  return { sortState, emitWrapper, sortedRecords };
}

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
  sortState: SortState,
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
  const previousSort = sortState;
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
    stopProcessing = true; // shift+click/longpress always stops further processing
    if (sortColumnState == null) {
      // if this segment wasn't sorted yet, we add it to sorting order
      if (columnSortConfig.direction != null) {
        sortColumnState = {
          columnName: sortColumnClicked,
          direction: columnSortConfig.direction === 'desc' ? 'desc' : 'asc',
        };
        suggestedSort.push(sortColumnState);
      }
    } else {
      // column is already in sort order, so cycle its direction or remove it
      const keepInSort = cycleSort(columnSortConfig, sortColumnState);
      if (!keepInSort) {
        const index = suggestedSort.findIndex((c) => c.columnName === sortColumnClicked);
        if (index !== -1) suggestedSort.splice(index, 1);
      }
    }
  }
  if (stopProcessing || (event instanceof MouseEvent && (event.ctrlKey || event.altKey))) {
    // we currently don't support ctrl and alt modifiers, so we do nothing
    // stopProcessing means we've already handled everything above (shift+click or longpress adding new column)
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
      // eslint-disable-next-line no-lonely-if
      if (columnSortConfig.direction !== 'both' || sortColumnState.direction === 'desc') {
        // clicking on the column makes the column unsorted right now
        sortColumnState = undefined;
      } else {
        // only one possibility remains: the column is sortable in both directions and it's currently asc, so we move
        // it to desc. This is because we don't store unsorted state and the cycle is unsorted -> asc -> desc
        sortColumnState.direction = 'desc';
      }
    }
    // For normal click (not shift), replace entire sort with just this column
    suggestedSort.length = 0;
    if (sortColumnState != null) suggestedSort.push(sortColumnState);
  }

  emit('sort', { sortActionClicked, sortColumnClicked, previousSort, suggestedSort });
  emit('update:sortState', suggestedSort);
}
