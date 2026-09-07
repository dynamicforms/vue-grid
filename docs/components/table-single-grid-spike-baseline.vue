<template>
  <div ref="containerEl" class="df-grid container" :style="`--${templateColumns}`">
    <grid-card
      class="df-grid card header"
      :class="layout"
      :item="headerItem"
      :columns="headerColumns"
      :renderers="DefaultRenderers"
    />
    <grid-card
      v-for="r in records"
      :key="r.id"
      :class="layout"
      :item="r"
      :columns="columns"
      :renderers="DefaultRenderers"
    />
    <shadow-grid
      ref="shadowRef"
      class="df-grid card"
      :class="layout"
      :records="records"
      :columns="columns"
      :renderers="DefaultRenderers"
      :count="Math.min(500, records.length)"
      :offset="0"
      key-field="id"
      @onmeasure="onMeasure"
    />
  </div>
</template>

<script setup lang="ts">
// Faithful, non-virtualized reproduction of today's production mechanism: every row is its own
// `display:grid` box (df-grid.vue / grid-card.vue), and column widths are resolved by a separate
// invisible shadow-grid instance whose native `grid-template-columns` is read via getComputedStyle
// and broadcast onto every real row through a `--grid-template-columns` CSS variable — exactly the
// mechanism documented in df-grid.vue's `doShadowMeasure`/`templateColumns` and the
// `.df-grid.container .df-grid.card:not(.shadow-grid)` override rule.
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { throttle } from 'lodash-es';

import { DefaultRenderers, GridCard } from '../../src';
import { useHeaderContent } from '../../src/table/helpers';
import ShadowGrid from '../../src/table/helpers/shadow-grid.vue';
import type { ShadowGridMeasurements } from '../../src/table/helpers/shadow-grid-types';
import type { ColumnDefinitionsList } from '../../src/table/columns';

const props = defineProps<{ records: any[]; columns: ColumnDefinitionsList; layout: 'uniform' | 'wrapping' }>();

const containerEl = ref<HTMLElement>();
const shadowRef = ref<InstanceType<typeof ShadowGrid>>();
const templateColumns = ref('');

const headerItem = ref<Record<string, string>>({});
const headerColumns = ref<ColumnDefinitionsList>([]);
watch(
  () => props.columns,
  (cols) => {
    headerItem.value = Object.fromEntries(cols.map((c) => [c.fieldName, c.label]));
    headerColumns.value = cols.map((c) => ({ ...c, renderer: 'plain', rendererOptions: {} }));
  },
  { immediate: true },
);

const { provideHeaderContent, setHeaderContent } = useHeaderContent();
provideHeaderContent();

const doShadowMeasure = throttle((event: ShadowGridMeasurements) => {
  templateColumns.value = `grid-template-columns: ${event.columnWidths}`;
}, 100);
function onMeasure(event: ShadowGridMeasurements) {
  doShadowMeasure(event);
}

function publishHeaderContent() {
  if (containerEl.value) setHeaderContent(Array.from(containerEl.value.querySelector('.df-grid.card.header')?.children ?? []) as HTMLElement[]);
}

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  publishHeaderContent();
  resizeObserver = new ResizeObserver(() => shadowRef.value?.reMeasure());
  resizeObserver.observe(containerEl.value!);
});
onUnmounted(() => resizeObserver?.disconnect());

</script>

<style>
.df-grid.container {
  position: relative;
}
.df-grid.container .df-grid.card:not(.shadow-grid) {
  grid-template-columns: var(--grid-template-columns) !important;
}

.df-grid.card {
  display: grid;
  gap: 0.25em;
}

.df-grid.card.uniform {
  grid-template-columns: repeat(10, minmax(0, auto));
}

.df-grid.card.wrapping {
  grid-template-columns: repeat(7, minmax(0, auto));
}
.df-grid.card.wrapping .df-grid.cell.title {
  grid-column: 1 / 3;
}
.df-grid.card.wrapping .df-grid.cell.artist {
  grid-column: 3 / 5;
}
.df-grid.card.wrapping .df-grid.cell.year {
  grid-column: 5;
  grid-row: 1;
}
.df-grid.card.wrapping .df-grid.cell.duration {
  grid-column: 6;
  grid-row: 1;
}
.df-grid.card.wrapping .df-grid.cell.genres {
  grid-column: 1 / 5;
  grid-row: 2;
}
.df-grid.card.wrapping .df-grid.cell.rating {
  grid-column: 5;
  grid-row: 2;
}
.df-grid.card.wrapping .df-grid.cell.moods {
  grid-column: 1 / 5;
  grid-row: 3;
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
