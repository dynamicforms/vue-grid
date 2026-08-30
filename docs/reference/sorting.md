# Sorting

Sorting is configured per-column via the `sortable` field on a `ColumnDefinition`. The grid keeps the sort state internally and reorders the records itself. Bind `v-model:sortState` to hold that state outside the grid; the records are still sorted locally unless a column in the sort order declares `key: sortExternal`.

## Column sort configuration

The `sortable` field accepts either a boolean or a `SortConfig` object:

```typescript
type Sortable = boolean | SortConfig;

interface SortConfig {
  direction?: 'both' | 'asc' | 'desc'; // which directions are allowed; default: 'both'
  key?: string[] | typeof sortExternal; // field path(s) to sort by; default: column's fieldName
  nulls?: 'first' | 'last';            // null/undefined placement in an ascending sort; default: 'last'
  locale?: string;                      // BCP 47 language tag; not applied by local sorting
  compare?: (a: any, b: any) => number; // custom comparator; used instead of the asc/desc direction for this column
}
```

`nulls` is applied by substituting a sentinel value for `null` and `undefined` before the comparison, so its effect follows the sort direction: `nulls: 'last'` puts nulls at the end of an ascending sort and at the start of a descending one.

Setting `sortable: true` is equivalent to using the default `SortConfig` (`direction: 'both'`, `nulls: 'last'`).

Columns built with `createColumn()` are sortable unless `otherOptions` says otherwise — the helper sets `sortable: true`. A `ColumnDefinition` written as a plain object is sortable only when it carries `sortable`, and an object containing none of `direction`, `key`, `compare`, `nulls` or `locale` (`sortable: {}`) counts as unsortable.

### `sortExternal`

Importing and setting `key: sortExternal` signals that this column's sort is handled externally (e.g. server-side). Whenever such a column is part of the current sort state, the grid leaves the record order untouched — including any other columns in the same multi-column sort — and only emits `sort` and `update:sortState`, so the application can fetch already-ordered data.

```typescript
import { sortExternal } from '@dynamicforms/vue-grid';

createColumn('title', 'Title', 'plain', { sortable: { key: sortExternal } })
```

### Resolving a `Sortable` value

`getSortConfig(sortable)` resolves a `Sortable` value the way the grid does, returning the completed `SortConfig` — or an empty object when the column is not sortable — and `defaultColumnSortConfig` holds the defaults it fills in (`direction: 'both'`, `nulls: 'last'`).

```typescript
import { defaultColumnSortConfig, getSortConfig } from '@dynamicforms/vue-grid';
```

## `SortState`

The current sort state is an ordered array of sort segments — supporting multi-column sort:

```typescript
interface SortStateColumn {
  columnName: string;
  direction: 'asc' | 'desc';
}

type SortState = SortStateColumn[];
```

### Validation

Before sorting, the grid checks every segment of the sort state against the active column definitions. A segment is skipped — and a `[df-grid]` warning is logged to the console — when it names a column that is not in the active column set, a column that is not sortable, or a direction the column's `direction` setting does not allow. The remaining segments are applied in order.

### Initialising sort state

Bind `v-model:sortState` to pre-sort the grid:

```vue
<df-grid
  v-model:sortState="sortState"
  :columns="columns"
  :records="records"
  key-field="id"
/>
```

```typescript
const sortState = ref<SortState>([
  { columnName: 'year', direction: 'desc' },
]);
```

While the `sortState` prop holds a value it takes precedence over the grid's internal state, so a one-way `:sortState` binding pins the order: header clicks still emit `sort` and `update:sortState`, but the rows are reordered only once the bound value is written back.

## `GridSortEvent`

Emitted as `@sort` when the user clicks or long-presses a column header, immediately followed by `update:sortState` carrying the same `suggestedSort`:

```typescript
interface GridSortEvent {
  sortActionClicked?: 'asc' | 'desc' | 'sort-index'; // which sort control was interacted with
  sortColumnClicked: string;                           // fieldName of the clicked column
  previousSort: SortState;                             // sort state before this interaction
  suggestedSort: SortState;                            // sort state the grid would apply internally
}
```

It fires for any header cell whose column can be identified, including columns that are not sortable — such an entry is dropped, with a console warning, when the grid validates the sort state. The click that ends a header long-press emits `click` but no second `sort` event, and a double click never sorts.

Use `suggestedSort` as a starting point when implementing server-side sorting. You may modify it before storing it back into `sortState`.

### User interaction model

| Interaction | Effect |
|-------------|--------|
| Single click on header | Cycles the clicked column unsorted → asc → desc → unsorted (a column limited to `asc` or `desc` alternates between that direction and unsorted) and replaces the whole sort order with just that column |
| Shift+click or long-press on header | Multi-column sort: appends the column to the end of the current order when it is not yet sorted (a column with no sort configuration is not added), cycles it asc → desc when it is already sorted and `direction` is `'both'`, and removes it from the order otherwise. The other segments keep their positions |
| Ctrl+click or Alt+click on header | Leaves the sort order unchanged; `sort` and `update:sortState` are still emitted |

`sortActionClicked` reports which part of the sorting indicator was hit (`'asc'`, `'desc'` or `'sort-index'`), but the grid does not act on it — clicking the numbered badge cycles the column exactly like a click anywhere else in the header cell. The numbered badge is rendered only while more than one column is sorted.
