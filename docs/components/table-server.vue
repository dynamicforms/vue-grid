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

// Load first page — resets everything. Called on initial load, sort, filter, or reload.
function initialLoad() {
  if (loading.value) return;
  loading.value = true;
  records.value = [];
  serverResult = applyFiltersAndSort(sortState.value, currentFilters.value);
  total.value = serverResult.length;

  setTimeout(() => {
    records.value = serverResult.slice(0, PAGE_SIZE);
    loading.value = false;
  }, randomDelay());
}

// Append next page — called by @load when user scrolls near the end.
function loadNextPage() {
  if (loading.value || records.value.length >= total.value) return;
  loading.value = true;

  const from = records.value.length;
  setTimeout(() => {
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

/* Single-line card: id | title | artist | year | rating */
:deep(.df-grid.card) {
  display: grid;
  grid-template-columns: minmax(2em, 4em) 1fr 1fr minmax(3em, 5em) minmax(3em, 5em);
  gap: .25em;
  padding: 0.35em 0.5em;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
  font-size: 0.85rem;
}

:deep(.df-grid.card.header) {
  border-bottom: 1px solid rgba(128, 128, 128, 0.5);
}

:deep(.df-grid.dynamic-scroller-item) {
  padding-bottom: .1px;
}

:deep(.df-grid.cell) {
  padding: 0 .25em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.df-grid.cell.id), :deep(.df-grid.cell.year), :deep(.df-grid.cell.rating) {
  text-align: right;
}
</style>
