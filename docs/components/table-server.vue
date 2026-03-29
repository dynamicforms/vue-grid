<template>
  <div style="display: flex; flex-direction: column; height: 35em">
    <df-grid
      v-model:sortState="sortState"
      :columns="columns"
      :records="records"
      class="grid-class"
      key-field="id"
      :show-filter-row="true"
      @sort="onSort"
      @filter="onFilter"
    >
      <template #toolbar-start>
        <span style="font-weight: bold; padding: 4px 8px">Music Library</span>
      </template>
      <template #toolbar-end>
        <span style="padding: 4px 8px; opacity: 0.7">
          {{ loading ? 'Loading…' : `Showing ${records.length} of ${total} results` }}
        </span>
      </template>
    </df-grid>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { createColumn, filterExternal, sortExternal } from '../../src';
import type { GridFilterEvent, GridSortEvent, SortState } from '../../src';
import { generateMusicLibrary } from './data-generator';

// Simulated back-end: all data lives in memory, but filtering and sorting
// are performed here rather than by the grid. In a real app this would be
// an API call returning the already-filtered/sorted page of results.
const allRecords = generateMusicLibrary(5000);

// sortExternal tells the grid: "show the sort indicator but don't sort records yourself"
// filterExternal tells the grid: "show the filter input but don't apply a local predicate"
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
  }),
];

const records = ref<any[]>(allRecords);
const total = ref(0);
const loading = ref(false);
const sortState = ref<SortState>([]);

// Keep the last filter values so a sort event can re-use them
const currentFilters = ref<Record<string, any>>({});

function fetchData(sort: SortState, filters: Record<string, any>) {
  loading.value = true;
  // setTimeout simulates network round-trip; replace with an actual fetch() call
  setTimeout(() => {
    let result = [...allRecords];

    // Apply filters
    if (filters.title)
      result = result.filter(r => r.title.toLowerCase().includes(String(filters.title).toLowerCase()));
    if (filters.artist)
      result = result.filter(r => r.artist.toLowerCase().includes(String(filters.artist).toLowerCase()));
    if (filters.year != null && filters.year !== '')
      result = result.filter(r => r.year === Number(filters.year));

    total.value = result.length;

    // Apply sort (iterate in reverse so the first entry has the highest priority)
    for (let i = sort.length - 1; i >= 0; i--) {
      const { columnName, direction } = sort[i];
      result.sort((a, b) => {
        const av = a[columnName], bv = b[columnName];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    // Only return the first page; in a real app you'd implement pagination here
    records.value = result.slice(0, 300);
    loading.value = false;
  }, 300);
}

// @sort fires when the user clicks a sortable column header.
// suggestedSort is the sort state the grid would have applied if it were sorting locally.
// Use it as-is or modify it before storing (e.g. to enforce a fixed primary sort).
function onSort({ suggestedSort }: GridSortEvent) {
  sortState.value = suggestedSort;
  fetchData(suggestedSort, currentFilters.value);
}

// @filter fires on every keystroke in a filter input.
// filterValues is a plain key→value map — easy to forward to a backend query.
function onFilter({ filterValues }: GridFilterEvent) {
  currentFilters.value = filterValues;
  fetchData(sortState.value, filterValues);
}

onMounted(() => fetchData([], {}));
</script>

<style scoped>
.full-screen {
  position: fixed;
  inset: 0;
  z-index: 999;
  color: white;
  background: black;
}
.grid-class {
  height: 40em;
}
.full-screen .grid-class {
  flex: 1;
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
:deep(.df-grid.card) {
  display: grid;
  grid-template-columns: minmax(2em, 4em) repeat(3, auto) minmax(2em, 4em) minmax(2em, 8em);
  gap: .25em;

  padding: 0.5em;
  border: 1px solid #808080ff;
  border-radius: 6px;
  font-size: 0.85rem;
  /*
   * won't work for item measurements, so see the next selector adding negligible padding to parent. That seems to
   * finally take into account this margin
   */
  margin-bottom: .5em;
}
:deep(.df-grid.dynamic-scroller-item) {
  padding-bottom: .1px;
}
:deep(.df-grid.card.single-column) {
  grid-template-columns: auto;
}
:deep(.df-grid.card.single-column > *) {
  grid-column: 1 / 2 !important;
  grid-row: auto !important;
  grid-area: auto !important;
}
:deep(.df-grid.card.single-line) {
  /* column before last 1fr so that it stretches to remaining available space */
  grid-template-columns: repeat(9, minmax(min-content, max-content)) 1fr minmax(min-content, max-content);
}
:deep(.df-grid.card.single-line > *) {
  grid-column: auto !important;
  grid-row: auto !important;
  grid-area: auto !important;
}
:deep(.df-grid.cell) {
  border: 1px solid darkgray;
  border-radius: 4px;
  padding: 0 .25em;
}
:deep(.df-grid.cell.title), :deep(.df-grid.cell.artist), :deep(.df-grid.cell.genres) {
  grid-column: span 2;
}
:deep(.df-grid.cell.moods) {
  grid-column: 1 / 4;
  grid-row: 3;
}
:deep(.df-grid.cell.duration) {
  grid-column: 6;
}
:deep(.df-grid.cell.genres) {
  grid-column: 1 / 5;
  grid-row: 2;
}
:deep(.df-grid.cell.rating) {
  grid-column: 5;
  grid-row: 2;
}
:deep(.df-grid.cell.favorite) {
  text-align: center;
}
</style>
