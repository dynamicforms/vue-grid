import { cloneDeep, isEqual } from 'lodash-es';
import { computed, ComputedRef, EmitFn, Ref, watch } from 'vue';

import type { RowValue } from './cell-renderers';
import type { FilterState } from './columns-filtering';
import type { SortState } from './columns-sorting';
import type { GridEmits } from './df-grid-types';

/**
 * GridViewState describes the records the grid displays: the sort and filter state applied to them and how many there
 * are.
 */
export interface GridViewState {
  /**
   * Sort state in effect: `sortState` without the segments validation skips (a column not in the active set, an
   * unsortable column, a direction the column does not allow).
   */
  sortState: SortState;
  /** `{ fieldName: value }` map of the filter values, the same map `GridFilterEvent.filterValues` carries. */
  filterValues: Record<string, any>;
  /** Number of records displayed: `records` after local filtering. Equals `loadedCount` when filtering is external. */
  shownCount: number;
  /** Number of records in the `records` prop. */
  loadedCount: number;
  /** `false` when a filterable column is marked with `filterExternal`: the grid then filters nothing itself. */
  filteringLocal: boolean;
  /** `false` when `sortState` sorts by a column marked with `sortExternal`: the grid then reorders nothing itself. */
  sortingLocal: boolean;
}

/**
 * What changed since the previous `view-change` event. `'initial'` marks the event emitted when the grid is created.
 */
export type GridViewChangeReason = 'initial' | 'filter' | 'sort' | 'records' | 'columns';

export interface GridViewChangeEvent extends GridViewState {
  /** Every change since the previous event; more than one when they happened in the same tick. */
  reasons: GridViewChangeReason[];
}

interface ViewSources {
  records: Ref<RowValue[]>;
  filteredRecords: ComputedRef<RowValue[]>;
  filterState: ComputedRef<FilterState>;
  filteringLocal: ComputedRef<boolean>;
  sortState: ComputedRef<SortState>;
  sortingLocal: ComputedRef<boolean>;
  columns: ComputedRef<unknown>;
}

/**
 * useViewChange tracks the grid's GridViewState and emits `view-change` once when called and then whenever the state
 * changes or `records` is replaced. Changes made in the same tick produce one event.
 */
export function useViewChange(emit: EmitFn<GridEmits>, sources: ViewSources) {
  const view = computed<GridViewState>(() => {
    const loadedCount = sources.records.value.length;
    return {
      sortState: sources.sortState.value,
      filterValues: sources.filterState.value.value,
      shownCount: sources.filteringLocal.value ? sources.filteredRecords.value.length : loadedCount,
      loadedCount,
      filteringLocal: sources.filteringLocal.value,
      sortingLocal: sources.sortingLocal.value,
    };
  });

  let previous: { view: GridViewState; records: RowValue[]; columns: unknown } | undefined;

  watch(
    [view, sources.records, sources.columns],
    ([current, records, columns]) => {
      const reasons: GridViewChangeReason[] = [];
      if (!previous) {
        reasons.push('initial');
      } else {
        const prev = previous.view;
        if (!isEqual(current.filterValues, prev.filterValues)) reasons.push('filter');
        if (!isEqual(current.sortState, prev.sortState)) reasons.push('sort');
        if (records !== previous.records || current.loadedCount !== prev.loadedCount) reasons.push('records');
        const countsOrModesChanged =
          current.shownCount !== prev.shownCount ||
          current.filteringLocal !== prev.filteringLocal ||
          current.sortingLocal !== prev.sortingLocal;
        if (columns !== previous.columns && countsOrModesChanged) reasons.push('columns');
        // A record edited in place can change which records pass the filter
        if (reasons.length === 0 && current.shownCount !== prev.shownCount) reasons.push('records');
      }
      previous = { view: cloneDeep(current), records, columns };
      if (reasons.length) emit('view-change', { ...cloneDeep(current), reasons });
    },
    { immediate: true },
  );

  return { view };
}
