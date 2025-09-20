<template>
  <div :class="fullScreenClass" style="display: flex; flex-direction: column">
    <div class="py-4 text-center">
      <v-btn @click="fullScreenClass = fullScreenClass === '' ? 'full-screen' : ''">
        {{ fullScreenButtonText }}
      </v-btn>
    </div>
    <df-grid
      v-model:active-columns="activeColumDef"
      :columns="columnsResponsive"
      :records="records"
      class="grid-class"
      key-field="id"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { createColumn, DfGrid, filterColumns, ResponsiveColumnDefinitions } from '../../src';
import { generateMusicLibrary } from './data-generator';

const records = generateMusicLibrary(10000);

const columns = [
  createColumn('id', 'Id', 'int', { cssClass: 'text-right' }),
  createColumn('title', 'Title', 'plain'),
  createColumn('artist', 'Artist', 'plain'),
  createColumn('year', 'Year', 'int', { cssClass: 'text-right' }),
  createColumn('year', 'Year', 'int', { cssClass: 'text-right', rendererOptions: { transform: (v) => v % 100 } }),
  createColumn('duration', 'Duration', 'plain', { cssClass: 'text-right' }), // TODO refactor to time
  createColumn('genres', 'Genres', 'plain'),
  createColumn('rating', 'Rating', 'int', { cssClass: 'text-right' }),
  createColumn('favorite', 'Favorite', 'checkbox'),
  createColumn('play_count', 'Play count', 'int', { cssClass: 'text-right' }),
  createColumn('moods', 'Moods', 'plain'),
  createColumn('language', 'Language', 'plain'),
];
const columnsResponsive = [
  { cssClass: 'single-line', columns: filterColumns(columns, [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11]) },
  { cssClass: 'three-row', columns: filterColumns(columns, [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11]) },
  // { cssClass: 'narrow-1', columns: filterColumns(columns, [0, 1, 2, 5, 6]) },
  // { cssClass: 'narrow-2', columns: filterColumns(columns, ['id', 'title', 'artist', 'genres', { year: 1 }]) },
  { cssClass: 'single-column', columns: columns },
] as ResponsiveColumnDefinitions;
const activeColumDef = ref('three-row');
const fullScreenClass = ref('');
const fullScreenButtonText = computed(
  () => (fullScreenClass.value === '' ? 'Stretch grid to window' : "restore grid to original size"),
);
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
  height: 60em;
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
