# Server-side Sorting & Filtering

In large applications you typically want the backend to handle sorting and filtering — the grid only manages UI state and fires events.

Two sentinel values signal external handling:
- `sortExternal` on a column's `sortable.key` — the grid shows the sort indicator but does **not** reorder `records`
- `filterExternal` on a column's `filterable.key` — the grid shows the filter input but does **not** apply a local predicate

The grid emits `@sort` and `@filter` events regardless; your handlers call the backend and update `records`.

```typescript
import { sortExternal, filterExternal } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('title', 'Title', 'plain', {
    sortable:   { key: sortExternal },
    filterable: { key: filterExternal },
  }),
];
```

```vue
<df-grid
  v-model:sortState="sortState"
  :columns="columns"
  :records="records"
  key-field="id"
  :show-filter-row="true"
  @sort="onSort"
  @filter="onFilter"
/>
```

```typescript
// @sort — use suggestedSort as the new external sort state, then fetch
function onSort({ suggestedSort }: GridSortEvent) {
  sortState.value = suggestedSort;
  fetchData(suggestedSort, currentFilters.value);
}

// @filter — filterValues is a plain key→value map, ready to forward to an API
function onFilter({ filterValues }: GridFilterEvent) {
  currentFilters.value = filterValues;
  fetchData(sortState.value, filterValues);
}
```

The demo below simulates a 300 ms network round-trip. Try sorting and filtering columns.

<table-server/>

<script setup>
import TableServer from '../components/table-server.vue';
</script>
