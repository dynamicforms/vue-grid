<template>
  <div class="a11y-demo">
    <div class="a11y-demo-controls">
      <v-btn @click="showFilterRow = !showFilterRow">{{ showFilterRow ? 'Hide filter row' : 'Show filter row' }}</v-btn>
      <v-btn @click="empty = !empty">{{ empty ? 'Restore records' : 'Remove all records' }}</v-btn>
    </div>
    <df-grid
      aria-label="Music library"
      :columns="columns"
      :records="shownRecords"
      key-field="id"
      :show-filter-row="showFilterRow"
      :show-status-bar="true"
      :estimated-row-height="26"
      class="a11y-demo-grid"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { createColumn } from '../../src';

const artists = ['Queen', 'Pink Floyd', 'Nirvana', 'Adele', 'Radiohead'];

// 400 records with values derived from the id, so every page load shows the same data
const records = Array.from({ length: 400 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    title: `Track ${String(id).padStart(3, '0')}`,
    artist: artists[index % artists.length],
    year: 1960 + (id % 40),
  };
});

const columns = [
  createColumn('id', 'Id', 'plain'),
  createColumn('title', 'Title', 'plain', { filterable: true }),
  createColumn('artist', 'Artist', 'plain', { filterable: true }),
  createColumn('year', 'Year', 'plain'),
];

const showFilterRow = ref(true);
const empty = ref(false);
const shownRecords = computed(() => (empty.value ? [] : records));
</script>

<style scoped>
.a11y-demo-controls {
  display: flex;
  gap: 0.5em;
  padding-bottom: 0.5em;
}

.a11y-demo-grid {
  height: 30em;
}

:deep(.df-record-grid) {
  display: grid;
  grid-template-columns: minmax(2em, 4em) minmax(min-content, 1fr) minmax(min-content, 1fr) minmax(3em, 5em);
  grid-auto-rows: min-content;
  gap: 0.25em;
  font-size: 0.85rem;
}

:deep(.df-grid.header) {
  font-weight: bold;
}

:deep(.df-grid.card) {
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
}

:deep(.df-grid.cell) {
  padding: 0 0.25em;
  white-space: nowrap;
}

:deep(.df-grid.cell.id),
:deep(.df-grid.cell.year) {
  text-align: right;
}
</style>
