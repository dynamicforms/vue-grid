# Sorting

Sorting is configured per-column via the `sortable` field on a `ColumnDefinition`. The grid manages sort state internally by default; pass `v-model:sortState` for external control.

## Column sort configuration

The `sortable` field accepts either a boolean or a `SortConfig` object:

```typescript
type Sortable = boolean | SortConfig;

interface SortConfig {
  direction?: 'both' | 'asc' | 'desc'; // which directions are allowed; default: 'both'
  key?: string[] | typeof sortExternal; // field path(s) to sort by; default: column's fieldName
  nulls?: 'first' | 'last';            // null/undefined placement; default: 'last'
  locale?: string;                      // locale for string comparison
  compare?: (a: any, b: any) => number; // custom comparator
}
```

Setting `sortable: true` is equivalent to using the default `SortConfig` (`direction: 'both'`, `nulls: 'last'`).

### `sortExternal`

Importing and setting `key: sortExternal` signals that this column's sort should be handled externally (e.g. server-side). The grid will still emit `sort` events but will not sort the records array itself for that column.

```typescript
import { sortExternal } from '@dynamicforms/vue-grid';

createColumn('title', 'Title', 'plain', { sortable: { key: sortExternal } })
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

### Initialising sort state

Pass an initial `sortState` prop (or `v-model:sortState`) to pre-sort the grid:

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

## `GridSortEvent`

Emitted as `@sort` whenever the user clicks a sortable column header:

```typescript
interface GridSortEvent {
  sortActionClicked?: 'asc' | 'desc' | 'sort-index'; // which sort control was interacted with
  sortColumnClicked: string;                           // fieldName of the clicked column
  previousSort: SortState;                             // sort state before this interaction
  suggestedSort: SortState;                            // sort state the grid would apply internally
}
```

Use `suggestedSort` as a starting point when implementing server-side sorting. You may modify it before storing it back into `sortState`.

### User interaction model

| Interaction | Effect |
|-------------|--------|
| Single click on header | Toggles asc → desc → unsorted (or as limited by `direction`) |
| Long-press on header | Adds column to multi-sort sequence |
| Click on sort index badge | Removes this column from the sort sequence |
