<template>
  <df-grid :columns="columns" :records="records" height="70em" key-field="id"/>
</template>

<script setup lang="ts">
import { createColumn, DfGrid } from '../../src';
import { generateMusicLibrary } from './data-generator';

const records = generateMusicLibrary(10000);

const columns = [
  createColumn('id', 'int'),
  createColumn('title', 'plain'),
  createColumn('artist', 'plain'),
  createColumn('year', 'int'),
  createColumn('duration', 'plain'), // TODO refactor to time
  createColumn('genres', 'plain'),
  createColumn('rating', 'int'),
  createColumn('favorite', 'checkbox'),
  createColumn('play_count', 'int'),
  createColumn('moods', 'plain'),
  createColumn('language', 'plain'),
];
</script>

<style scoped>
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
  margin-bottom: .5em;
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

</style>
