<template>
  <div class="df-grid single-grid" :class="layout">
    <div style="display: contents; visibility: hidden">
      <grid-card :item="headerItem" :columns="headerColumns" :renderers="DefaultRenderers" :no-wrapper-item="true" />
    </div>
    <div
      v-for="(r, i) in records"
      :key="r.id"
      style="display: contents"
      :style="layout === 'wrapping' ? { '--row-base': i * 3 } : undefined"
    >
      <grid-card :item="r" :columns="columns" :renderers="DefaultRenderers" :no-wrapper-item="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
// The idea under test: one real shared `display:grid` holding actual (non-shadow) rows as direct
// grid items, letting the browser's native `auto`/`minmax(0,auto)` track-sizing algorithm size
// columns — no separate shadow-grid measurement pass, no getComputedStyle read, no
// `--grid-template-columns` broadcast.
//
// The header row is a `display:contents; visibility:hidden` wrapper: `display:contents` removes
// the wrapper's own box, so its child cells become direct grid items of `.single-grid` (their
// widths count toward column sizing) while `visibility:hidden` inherits through to them, keeping
// the header invisible without removing it from layout.
//
// For the wrapping (three-row-per-record) layout, every cell needs an explicit grid-row relative
// to the record it belongs to — plain CSS Grid auto-placement has no notion of "record
// boundaries", so a bare `grid-row: 3` would put every record's third-row cell on the SAME
// physical row. Each record's wrapper publishes `--row-base` (record index * 3); the per-field
// CSS below reads it via `calc(var(--row-base) + N)`. The header reuses this by staying at
// row-base 0 — its (hidden) cells overlap record 0's, the same way today's shadow-grid already
// mixes header and body cells in one grid for measurement purposes.
import { computed } from 'vue';

import { DefaultRenderers, GridCard } from '../../src';
import type { ColumnDefinitionsList } from '../../src/table/columns';

const props = defineProps<{ records: any[]; columns: ColumnDefinitionsList; layout: 'uniform' | 'wrapping' }>();

const headerItem = computed(() => Object.fromEntries(props.columns.map((c) => [c.fieldName, c.label])));
const headerColumns = computed(() => props.columns.map((c) => ({ ...c, renderer: 'plain', rendererOptions: {} })));
</script>

<style>
.df-grid.single-grid.uniform {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, auto));
  gap: 0.25em;
}

.df-grid.single-grid.wrapping {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, auto));
  gap: 0.25em;
}

.df-grid.single-grid.wrapping .df-grid.cell.title {
  grid-column: 1 / 3;
  grid-row: calc(var(--row-base) + 1);
}
.df-grid.single-grid.wrapping .df-grid.cell.artist {
  grid-column: 3 / 5;
  grid-row: calc(var(--row-base) + 1);
}
.df-grid.single-grid.wrapping .df-grid.cell.year {
  grid-column: 5;
  grid-row: calc(var(--row-base) + 1);
}
.df-grid.single-grid.wrapping .df-grid.cell.duration {
  grid-column: 6;
  grid-row: calc(var(--row-base) + 1);
}
.df-grid.single-grid.wrapping .df-grid.cell.genres {
  grid-column: 1 / 5;
  grid-row: calc(var(--row-base) + 2);
}
.df-grid.single-grid.wrapping .df-grid.cell.rating {
  grid-column: 5;
  grid-row: calc(var(--row-base) + 2);
}
.df-grid.single-grid.wrapping .df-grid.cell.moods {
  grid-column: 1 / 5;
  grid-row: calc(var(--row-base) + 3);
}

.df-grid.cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid darkgray;
  border-radius: 4px;
  padding: 0 0.25em;
}
</style>
