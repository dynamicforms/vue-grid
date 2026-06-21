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

## Loading & no-data states

Pass `:loading="true"` while a fetch is in progress — the grid automatically shows a spinner in the summary bar. When `records` is empty and `loading` is `false`, the same bar shows a "No data" indicator instead. Both states can be customised via the `#loading` and `#no-data` slots; the entire bar can be replaced via `#summary-bar`.

```vue
<df-grid :columns="columns" :records="records" :loading="loading" key-field="id" />
```

## Pagination

For large datasets, load records one page at a time and append each page to `records` as the user scrolls. The grid emits `@load` when the user scrolls within `loadDistance` px (default 200) of the end **and** `loading` is `false`. Set `:loading="true"` for the duration of the fetch — this suppresses duplicate `@load` events until the page arrives.

```typescript
function loadNextPage() {
  if (loading.value || records.value.length >= total.value) return;
  loading.value = true;
  fetchPage(records.value.length).then(page => {
    records.value = [...records.value, ...page];
    loading.value = false;
  });
}
```

```vue
<df-grid :records="records" :loading="loading" @load="loadNextPage" key-field="id" />
```

The demo below starts empty. Click **Load data** to fetch the first page from the server; subsequent pages arrive automatically as you scroll to the bottom. **Clear** resets to the empty state. Sort and filter changes always restart from page one.

<table-server/>

<script setup>
import TableServer from '../components/table-server.vue';
</script>
