# Filtering

Filtering is configured per-column via the `filterable` field on a `ColumnDefinition`. When `showFilterRow` is `true`, an input row is rendered below the column headers. The grid filters records internally by default; pass `v-model:filterState` for external control.

## Column filter configuration

The `filterable` field accepts either a boolean or a `FilterConfig` object:

```typescript
type Filterable = boolean | FilterConfig;

interface FilterConfig {
  fieldType?: 'string' | 'number' | 'boolean' | 'date'; // determines input widget; default: 'string'
  choices?: Array<{ value: any; label: string; icon?: string }>; // renders a select instead of free-text input
  key?: string | typeof filterExternal;  // property path to filter on; default: column's fieldName
  placeholder?: string;                  // input placeholder text
}
```

Setting `filterable: true` uses the default config (`fieldType: 'string'`).

### `filterExternal`

Setting `key: filterExternal` signals that this column should be filtered externally (e.g. server-side). The grid will emit `filter` events but will not apply a local predicate for that column.

```typescript
import { filterExternal } from '@dynamicforms/vue-grid';

createColumn('title', 'Title', 'plain', { filterable: { key: filterExternal } })
```

## `FilterState`

Filter state is a reactive form-state object created by `createFilterState()`. You normally let the grid manage it, but can initialise with pre-set values:

```typescript
function createFilterState(
  columns: ColumnDefinition[],
  initialValues?: Record<string, any>,
): FilterState
```

```typescript
import { createFilterState } from '@dynamicforms/vue-grid';

const filterState = ref(createFilterState(columns, { title: 'Beatles' }));
```

```vue
<df-grid
  v-model:filterState="filterState"
  :columns="columns"
  :records="records"
  key-field="id"
  :show-filter-row="true"
/>
```

## `GridFilterEvent`

Emitted as `@filter` whenever any filter value changes:

```typescript
interface GridFilterEvent {
  filterState: FilterState;             // full reactive state object
  filterValues: Record<string, any>;    // plain key→value map for easy use
}
```

Use `filterValues` for server-side filtering — it maps each column's `fieldName` (or `FilterConfig.key`) to the current input value.

### Example: server-side filtering

```typescript
async function onFilter({ filterValues }: GridFilterEvent) {
  records.value = await api.fetchRecords({ filters: filterValues });
}
```

```vue
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
  :show-filter-row="true"
  @filter="onFilter"
/>
```

## Status bar

Setting `showStatusBar` to `true` displays a bar below the filter row that shows the number of currently active filters. Override its content with the `#statusBar` slot.
