# Filtering

Filtering is configured per-column via the `filterable` field on a `ColumnDefinition`. When `showFilterRow` is `true`, an input row is rendered below the column headers. The grid creates the filter state and filters the records itself. Bind `v-model:filterState` to hold that state outside the grid; the records are still filtered locally unless one of the columns in the filter state declares `key: filterExternal`.

## Column filter configuration

The `filterable` field accepts either a boolean or a `FilterConfig` object:

```typescript
type Filterable = boolean | FilterConfig;

interface FilterConfig {
  fieldType?: 'string' | 'number' | 'boolean' | 'date'; // determines input widget; default: 'string'
  choices?: Array<{ id: any; text: string; icon?: string }>; // renders a multi-select instead of free-text input
  key?: string | typeof filterExternal;  // record property to compare against; default: column's fieldName
  placeholder?: string;                  // input placeholder text
}
```

The control rendered in the filter row follows from the resolved config: a column with `choices` gets a clearable multi-select whatever its `fieldType`, `fieldType: 'date'` gets a clearable date input, `fieldType: 'boolean'` gets a checkbox that also accepts the null state and uses `placeholder` as its label, and everything else gets a text input — a numeric one for `fieldType: 'number'`. Where no `placeholder` is given, the select, date and text inputs use `Filter <label>...`. Columns that are not filterable leave their filter cell empty.

Setting `filterable: true` uses the default config (`fieldType: 'string'`).

Filtering is opt-in per column, and `createColumn()` does not set `filterable`: a column without `filterable`, with `filterable: false`, or with a `filterable` object carrying none of `fieldType`, `choices`, `key` or `placeholder` is not filterable — it gets no field in the filter state and no control in the filter row. A field in `filterState` that does not correspond to a filterable column stays in the state and logs a `[df-grid]` console warning.

### `filterExternal`

Setting `key: filterExternal` signals that this column is filtered externally (e.g. server-side). As soon as such a column has a field in the filter state — whether or not that field currently holds a value — the grid stops filtering locally altogether, including the columns that would filter normally, and only emits `update:filterState` and `filter`, so the application can fetch already-filtered data.

```typescript
import { filterExternal } from '@dynamicforms/vue-grid';

createColumn('title', 'Title', 'plain', { filterable: { key: filterExternal } })
```

## Local filtering

A record is kept when it satisfies every active filter. A filter whose value is `null`, `undefined` or an empty string is inactive, and so is a multi-select whose value is an empty array. The comparison depends on `fieldType`:

| `fieldType` | Single value | Multi-select (`choices`) |
|---|---|---|
| `'string'` | case-insensitive substring match; a `null`/`undefined` record value never matches | case-insensitive equality of the whole value against any chosen value |
| `'number'` | `recordValue === Number(filterValue)` | equality against any chosen value, each converted with `Number()` |
| `'boolean'` | strict equality against the filter value | not supported — the record value is compared against the array itself, which never matches |
| `'date'` | strict equality against the raw filter value | strict equality against any chosen value |

The record property compared is `FilterConfig.key` when set, otherwise the column's `fieldName`.

## `FilterState`

```typescript
type FilterState = Group<Record<string, Field<any>>>; // Group and Field from @dynamicforms/vue-forms
```

The group holds one `Field` per filterable column, keyed by the column's `fieldName`; the inputs in the filter row write straight into those fields. `getFilterConfig()` and `defaultColumnFilterConfig` are exported as well, for code that needs to resolve a `Filterable` value the same way the grid does.

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

Emitted as `@filter` on every change of any filter value, immediately after `update:filterState`. The grid neither debounces nor batches these events, and nothing is emitted before the first change:

```typescript
interface GridFilterEvent {
  filterState: FilterState;             // full reactive state object
  filterValues: Record<string, any>;    // plain key→value map for easy use
}
```

Use `filterValues` for server-side filtering — it maps each filterable column's `fieldName` to the current input value. `FilterConfig.key` does not appear here; it only selects the record property used by local filtering.

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

Setting `showStatusBar` to `true` displays a bar below the filter row showing the number of active filters — every filter value that is not `null`, `undefined` or an empty string, so an emptied multi-select still counts. Override the content with the `#statusBar` slot, which receives `filterState` as a slot prop. While selection mode is active the same bar is shown regardless of `showStatusBar` and carries the selection controls instead; see [Selection](./selection).
