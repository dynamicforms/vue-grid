import { Field, Group } from '@dynamicforms/vue-forms';
import { computed, ComputedRef, EmitFn, ref, unref, watch } from 'vue';

import { RendererOptionsMap, RowValue } from './cell-renderers';
import { type ColumnDefinition, type useColumns } from './columns';
import type { GridEmits, GridProps } from './df-grid-types';
import type { MaybeRef } from './type-utils';

export const filterExternal = Symbol('filter external');

/**
 * FilterFieldType specifies the data type and UI control for filtering a column
 */
export type FilterFieldType = 'string' | 'number' | 'boolean' | 'date';

/**
 * FilterConfig specifies how a particular column should be filtered.
 */
export interface FilterConfig {
  // Field type determines which input component to use
  fieldType?: FilterFieldType;
  // For 'choices' type - array of available options
  choices?: Array<{ value: any; label: string; icon?: string }>;
  // Specify filterExternal if you want the backend to handle filtering
  // In such case, it's expected that in response to "update:filterState" event,
  // the code issues a BE call that will return filtered data
  key?: string | typeof filterExternal;
  // Optional placeholder text for the filter input
  placeholder?: string;
}

export type Filterable = boolean | FilterConfig;

/**
 * defaultColumnFilterConfig specifies the default FilterConfig for each column
 * when such a config is not provided by the programmer.
 */
export const defaultColumnFilterConfig: FilterConfig = { fieldType: 'string' } as const;

/**
 * getFilterConfig converts boolean or FilterConfig into a full FilterConfig object
 */
export function getFilterConfig(filter?: Filterable): FilterConfig {
  if (filter === true) return defaultColumnFilterConfig;
  if (filter === false || filter == null) return {};
  if (filter.fieldType || filter.choices || filter.key || filter.placeholder) {
    return {
      fieldType: filter.fieldType ?? defaultColumnFilterConfig.fieldType,
      choices: filter.choices,
      key: filter.key,
      placeholder: filter.placeholder,
    };
  }
  return {};
}

/**
 * FilterState is a FormGroup containing Field instances for each filterable column.
 * The field names correspond to column fieldNames.
 */
export type FilterState = Group<Record<string, Field<any>>>;

/**
 * validateFilterState checks if the filterState fields correspond to filterable columns.
 * It logs warnings for invalid entries.
 */
function validateFilterState(
  filterState: FilterState | undefined,
  columns: ComputedRef<ColumnDefinition<keyof RendererOptionsMap>[]>,
): void {
  if (!filterState) return;

  const filterableColumnNames = new Set(
    columns.value
      .filter((col) => {
        const config = getFilterConfig((col as any).filterable);
        return config.fieldType != null || config.choices != null;
      })
      .map((col) => col.fieldName),
  );

  // Check for fields in filterState that don't correspond to filterable columns
  Object.keys(filterState.fields).forEach((fieldName) => {
    if (!filterableColumnNames.has(fieldName)) {
      console.warn(`[df-grid] filterState contains field for non-filterable column: ${fieldName}`);
    }
  });
}

export interface GridFilterEvent {
  filterState: FilterState;
  filterValues: Record<string, any>;
}

/**
 * applyFiltering performs the actual filtering of records based on filterState.
 * Returns the filtered records array.
 */
function applyFiltering(
  records: MaybeRef<RowValue[]>,
  filterState: FilterState | undefined,
  columns: ComputedRef<ColumnDefinition<keyof RendererOptionsMap>[]>,
): RowValue[] {
  const recordsArray = unref(records);
  if (!filterState) return recordsArray;

  const filterValues = filterState.value;
  if (!filterValues) return recordsArray;

  // Check if any column uses external filtering
  const hasExternalFilter = Object.keys(filterValues).some((fieldName) => {
    const colDef = columns.value.find((c) => c.fieldName === fieldName);
    if (!colDef) return false;
    const filterConfig = getFilterConfig((colDef as any).filterable);
    return filterConfig.key === filterExternal;
  });

  // If any column uses external filtering, don't filter locally - backend handles it
  if (hasExternalFilter) return recordsArray;

  // Apply local filtering
  return recordsArray.filter((record) => Object.entries(filterValues).every(([fieldName, filterValue]) => {
    // Record must match all active filters

    // Skip empty/null filter values
    if (filterValue == null || filterValue === '' || filterValue === undefined) {
      return true;
    }

    const colDef = columns.value.find((c) => c.fieldName === fieldName);
    if (!colDef) return true;

    const filterConfig = getFilterConfig((colDef as any).filterable);
    const recordValue = record[filterConfig.key as string ?? fieldName];

    // Handle different field types
    switch (filterConfig.fieldType) {
    case 'boolean':
      // For boolean: only filter if explicitly set to true or false
      return recordValue === filterValue;

    case 'number':
      // For number: exact match (could be extended to ranges later)
      return recordValue === Number(filterValue);

    case 'date':
      // For date: simple equality (could be extended to ranges later)
      return recordValue === filterValue;

    case 'string':
    default:
      // For string: case-insensitive substring match
      if (recordValue == null) return false;
      return String(recordValue).toLowerCase().includes(String(filterValue).toLowerCase());
    }
  }));
}

/**
 * createFilterState creates a FormGroup with Field instances for each filterable column
 */
export function createFilterState(
  columns: ColumnDefinition<keyof RendererOptionsMap>[],
  initialValues?: Record<string, any>,
): FilterState {
  const fields: Record<string, Field<any>> = {};

  columns.forEach((column) => {
    const filterConfig = getFilterConfig((column as any).filterable);

    // Only create field if column is filterable
    if (filterConfig.fieldType != null || filterConfig.choices != null) {
      const initialValue = initialValues?.[column.fieldName] ?? null;
      fields[column.fieldName] = Field.create({ value: initialValue });
    }
  });

  return new Group(fields);
}

export interface ColumnFilterState {
  config: FilterConfig;
  filterable: boolean;
}

export type ColumnDefinitionWithFilterState<T extends keyof RendererOptionsMap = 'plain'> =
  ColumnDefinition<T> & { filterState: ColumnFilterState };

export function useFiltering(
  props: GridProps,
  emit: EmitFn<GridEmits>,
  uColumns: ReturnType<typeof useColumns>,
  inputRecords: MaybeRef<RowValue[]>,
) {
  // Create internal filter state from columns
  const internalFilterState = ref<FilterState | undefined>(
    props.filterState ?? createFilterState(uColumns.columns.value),
  );

  const filterState = computed<FilterState | undefined>(
    () => (props.filterState ?? internalFilterState.value) as FilterState | undefined,
  );

  // Validate filter state
  watch(
    [() => filterState.value, () => uColumns.columns.value],
    ([newFilterState, newColumns]) => {
      if (newFilterState) {
        validateFilterState(newFilterState, computed(() => newColumns));
      }
    },
    { immediate: true },
  );

  // Apply filtering
  const filteredRecords = computed(() => applyFiltering(inputRecords, filterState.value, uColumns.columns));

  // Watch for external prop changes
  watch(
    () => props.filterState,
    (newVal) => {
      internalFilterState.value = newVal ?? createFilterState(uColumns.columns.value);
    },
  );

  // Watch for filter value changes and emit event
  watch(
    () => filterState.value?.value,
    (newValue) => {
      if (newValue) {
        emit('update:filterState', filterState.value as FilterState);
        emit('filter', { filterState: filterState.value, filterValues: newValue } as GridFilterEvent);
      }
    },
    { deep: true },
  );

  // Wrap emit to intercept update:filterState
  const emitWrapper = ((event: any, ...args: any[]) => {
    if (event === 'update:filterState') {
      // Update internal state
      internalFilterState.value = args[0];
    }
    // @ts-expect-error - emit wrapper extends the emit signature
    return emit(event, ...args);
  }) as typeof emit;

  return { filterState, emitWrapper, filteredRecords };
}
