<template>
  <div style="display: flex; flex-direction: column; height: 40em">
    <df-grid
      v-model:sortState="sortState"
      :columns="columns"
      :records="records"
      :loading="loading"
      class="grid-class"
      key-field="id"
      :show-filter-row="true"
      selection-mode="non-select"
      @sort="onSort"
      @filter="onFilter"
      @load="loadNextPage"
    >
      <template #toolbar-start>
        <span style="font-weight: bold; padding: 4px 8px">Music Library</span>
      </template>
      <template #toolbar-end>
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 8px">
          <span v-if="total > 0" style="opacity: 0.7; font-size: 0.9em">
            {{ records.length }} / {{ total }}
          </span>
          <v-btn size="small" variant="tonal" :loading="loading && !records.length" @click="initialLoad">
            {{ records.length ? 'Reload' : 'Load data' }}
          </v-btn>
          <v-btn v-if="records.length" size="small" variant="text" :disabled="loading" @click="clear">
            Clear
          </v-btn>
        </div>
      </template>
    </df-grid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createColumn, filterExternal, sortExternal } from '../../src';
import type { GridFilterEvent, GridSortEvent, SortState } from '../../src';
import { generateMusicLibrary } from './data-generator';

const PAGE_SIZE = 30;

// Full dataset lives in memory — simulates a database the "server" queries.
const allRecords = generateMusicLibrary(300);

const columns = [
  createColumn('id', 'ID', 'int', { cssClass: 'text-right' }),
  createColumn('title', 'Title', 'plain', {
    sortable: { key: sortExternal },
    filterable: { key: filterExternal },
  }),
  createColumn('artist', 'Artist', 'plain', {
    sortable: { key: sortExternal },
    filterable: { key: filterExternal },
  }),
  createColumn('year', 'Year', 'int', {
    cssClass: 'text-right',
    sortable: { key: sortExternal },
    filterable: { fieldType: 'number', key: filterExternal },
  }),
  createColumn('rating', 'Rating', 'int', {
    cssClass: 'text-right',
    sortable: { key: sortExternal },
    filterable: { fieldType: 'number', key: filterExternal },
  }),
];

const records = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const sortState = ref<SortState>([]);
const currentFilters = ref<Record<string, any>>({});

// Filtered+sorted full result set — recomputed on every sort/filter change.
let serverResult: any[] = [];

function applyFiltersAndSort(sort: SortState, filters: Record<string, any>): any[] {
  let result = [...allRecords];

  if (filters.title)
    result = result.filter(r => r.title.toLowerCase().includes(String(filters.title).toLowerCase()));
  if (filters.artist)
    result = result.filter(r => r.artist.toLowerCase().includes(String(filters.artist).toLowerCase()));
  if (filters.year != null && filters.year !== '')
    result = result.filter(r => r.year === Number(filters.year));
  if (filters.rating != null && filters.rating !== '')
    result = result.filter(r => r.rating === Number(filters.rating));

  for (let i = sort.length - 1; i >= 0; i--) {
    const { columnName, direction } = sort[i];
    result.sort((a, b) => {
      const av = a[columnName], bv = b[columnName];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === 'asc' ? cmp : -cmp;
    });
  }

  return result;
}

function randomDelay() {
  return 800 + Math.random() * 800;
}

// Guards against out-of-order responses: a filter/sort change started while the previous one is
// still pending must win once both eventually resolve, not whichever's randomDelay() happens to
// be shorter. Every load bumps this and captures its own value; a response only applies if it's
// still the latest by the time its delay elapses, so an in-flight request never has to be
// blocked (and its own trigger silently dropped) just to keep this simple.
let loadToken = 0;

// Load first page — resets everything. Called on initial load, sort, filter, or reload.
function initialLoad() {
  const token = ++loadToken;
  loading.value = true;
  records.value = [];
  serverResult = applyFiltersAndSort(sortState.value, currentFilters.value);
  total.value = serverResult.length;

  setTimeout(() => {
    if (token !== loadToken) return;
    records.value = serverResult.slice(0, PAGE_SIZE);
    loading.value = false;
  }, randomDelay());
}

// Append next page — called by @load when user scrolls near the end.
function loadNextPage() {
  if (loading.value || records.value.length >= total.value) return;
  const token = ++loadToken;
  loading.value = true;

  const from = records.value.length;
  setTimeout(() => {
    if (token !== loadToken) return;
    records.value = [...records.value, ...serverResult.slice(from, from + PAGE_SIZE)];
    loading.value = false;
  }, randomDelay());
}

function onSort({ suggestedSort }: GridSortEvent) {
  sortState.value = suggestedSort;
  initialLoad();
}

function onFilter({ filterValues }: GridFilterEvent) {
  currentFilters.value = filterValues;
  initialLoad();
}

function clear() {
  loadToken++; // invalidate any in-flight request so it can't repopulate records after this
  loading.value = false;
  records.value = [];
  total.value = 0;
  serverResult = [];
}
</script>

<style scoped>
.grid-class {
  height: 40em;
}

:deep(.df-grid.header) {
  font-weight: bold;
}

:deep(.df-grid.card.even) {
  background-color: #b0b0b040;
}

:deep(.df-grid.card.odd) {
  background-color: #60606040;
}

/* Single-line row: id | title | artist | year | rating. `.df-record-grid` is the marker the
   body, header, and filter row all carry, so one declaration covers all three.

   `grid-auto-rows: min-content` matters because the cells below are `overflow: hidden` (for the
   ellipsis truncation) — a grid item with non-visible overflow gets an *automatic minimum size*
   of 0 for the default `auto` row-sizing function, instead of its content size, which once the
   body grid's own `overflow-y: scroll` gives it a definite height smaller than every row's true
   height combined, lets rows compress toward 0 rather than the grid scrolling as expected —
   every row in the shared grid overlapping the next instead of each keeping its own height.
   `min-content` is an explicit (non-`auto`) row-sizing function, so it isn't subject to that
   automatic-minimum-size reduction and rows keep their real height regardless of overflow. */
:deep(.df-record-grid) {
  display: grid;
  grid-template-columns: minmax(2em, 4em) 1fr 1fr minmax(3em, 5em) minmax(3em, 5em);
  grid-auto-rows: min-content;
  gap: .25em;
  font-size: 0.85rem;
}

:deep(.df-grid.card) {
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
}

:deep(.df-grid.card.header) {
  border-bottom: 1px solid rgba(128, 128, 128, 0.5);
}

/* One row per record: with every record's cells sharing one grid, plain auto-placement has no
   notion of record boundaries — every cell needs this same explicit row. */
:deep(.df-grid.cell) {
  grid-row: calc(var(--row-base) + 1);
  padding: 0 .25em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.df-grid.cell.id), :deep(.df-grid.cell.year), :deep(.df-grid.cell.rating) {
  text-align: right;
}
</style>
