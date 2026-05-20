<template>
  <div :class="[fullScreenClass, 'my-demo-app']" style="display: flex; flex-direction: column">
    <div class="py-4 text-center">
      <v-btn @click="fullScreenClass = fullScreenClass === '' ? 'full-screen' : ''">
        {{ fullScreenButtonText }}
      </v-btn>
    </div>
    <df-grid
      v-model:active-columns="activeColumDef"
      v-model:selection-mode="selectionMode"
      v-model:selection-keys="selectionKeys"
      :columns="columnsResponsive"
      :records="records"
      class="grid-class"
      key-field="id"
      :show-filter-row="true"
      :show-status-bar="false"
      @click="(data) => console.log('click:', data)"
      @sort="(data) => console.log('sort:', data)"
    >
      <template #toolbar-start>
        <span style="font-weight: bold; padding: 4px 8px">Music Library</span>
      </template>
      <template #toolbar-end>
        <div style="display: flex; flex-direction: column; align-items: flex-end; padding: 4px 8px">
          <div>
            <cached-icon name="mdi-book-plus" title="add one record" class="shuffle-icon" @click.stop="addRows(1)"/>
            <cached-icon name="mdi-book-plus-multiple" title="add 1000 records" class="shuffle-icon" @click.stop="addRows(1000)"/>
          </div>
          <span style="font-size: 0.8rem; opacity: 0.8">{{ records.length }} records</span>
        </div>
      </template>
      <template #groupActions>
        <cached-icon name="mdi-delete" title="Delete selected" class="shuffle-icon" style="color: red" @click.stop="deleteSelected"/>
      </template>
      <template #footer-start>
        <span style="padding: 4px 8px; font-size: 0.8rem; opacity: 0.6">@dynamicforms/vue-grid</span>
      </template>
      <template #footer-end>
        <span style="padding: 4px 8px; font-size: 0.8rem; opacity: 0.6">Active layout: {{ activeColumDef }}</span>
      </template>
    </df-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import { createColumn, DfGrid, filterColumns, ResponsiveColumnDefinitions } from '../../src';
import { generateMusicLibrary, languagesMap } from './data-generator';

const records = reactive(generateMusicLibrary(10000));

// --- Selection state ---
const selectionMode = ref<null | 'selection' | 'exclusion'>(null);
const selectionKeys = ref<Set<any>>(new Set());

function isSelected(id: any): boolean {
  if (selectionMode.value === 'selection') return selectionKeys.value.has(id);
  if (selectionMode.value === 'exclusion') return !selectionKeys.value.has(id);
  return false;
}

function toggleSelection(id: any): void {
  const keys = new Set(selectionKeys.value);
  if (keys.has(id)) keys.delete(id);
  else keys.add(id);
  selectionKeys.value = keys;
}

function deleteSelected(): void {
  const arr = records as any[];
  const toKeep = arr.filter((r) => !isSelected(r.id));
  arr.splice(0, arr.length, ...toKeep);
}

// Checkbox column used in single-line and three-row layouts when in selection mode.
// postRender reads selectionMode/selectionKeys reactively so each card's formattedData
// computed re-evaluates when selection changes.
const selectionCol = createColumn('_selection', '', 'plain', {
  filterable: false,
  sortable: false,
  rendererOptions: {
    transform: () => '',
    postRender: (value: any, rowValue: any) => new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: {
        name: isSelected(rowValue.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline',
        class: 'selection-checkbox',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          toggleSelection(rowValue.id);
        },
      },
    } as SimpleComponentDef),
  },
});

const columns = [
  createColumn('id', 'Id', 'int', { cssClass: 'text-right' }),
  createColumn('title', 'Title', 'plain', { filterable: true }),
  createColumn('artist', 'Artist', 'plain', { filterable: true }),
  createColumn('year', 'Year', 'int', { cssClass: 'text-right', filterable: { fieldType: 'number' } }),
  createColumn('year', 'Year', 'int', {
    cssClass: 'text-right',
    rendererOptions: { transform: (v) => v % 100 },
    filterable: { fieldType: 'number' }
  }),
  createColumn('duration', 'Duration', 'plain', { cssClass: 'text-right', filterable: { fieldType: 'date' } }), // TODO refactor to time
  createColumn('genres', 'Genres', 'plain', { filterable: true }),
  createColumn('rating', 'Rating', 'int', { cssClass: 'text-right', filterable: { fieldType: 'number' } }),
  createColumn('favorite', 'Favorite', 'checkbox', {
    rendererOptions: {
      postRender: (value: any, rowValue: any) => new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: {
          name: 'mdi-shuffle',
          class: 'shuffle-icon',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            rowValue.favorite = !rowValue.favorite;
          },
        },
      } as SimpleComponentDef),
    },
  }),
  createColumn('play_count', 'Play count', 'int', { cssClass: 'text-right', filterable: { fieldType: 'number' } }),
  createColumn('moods', 'Moods', 'plain', { filterable: true }),
  createColumn('language', 'Languages', 'plain', { filterable: { choices: languagesMap } }),
  createColumn('actions', 'Delete', 'plain', {
    filterable: false,
    sortable: false,
    rendererOptions: {
      postRender: (value: any, rowValue: any) => new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: {
          name: 'mdi-delete',
          class: 'shuffle-icon',
          style: { color: 'red' },
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            const index = records.findIndex(r => r.id === rowValue.id);
            if (index !== -1) records.splice(index, 1);
          },
        },
      } as SimpleComponentDef),
    },
  }),
];

// three-row layout: selection + delete icons share the same cell via preRender/postRender (has-pre-post flex)
const threeRowActionsCol = createColumn('actions', 'Delete', 'plain', {
  filterable: false,
  sortable: false,
  rendererOptions: {
    postRender: (_value: any, rowValue: any) => {
      if (selectionMode.value === null) return null;
      return new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: {
          name: isSelected(rowValue.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline',
          class: 'selection-checkbox',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            toggleSelection(rowValue.id);
          },
        },
      } as SimpleComponentDef);
    },
    preRender: (_value: any, rowValue: any) => new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: {
        name: 'mdi-delete',
        class: 'shuffle-icon',
        style: { color: 'red' },
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          const index = records.findIndex(r => r.id === rowValue.id);
          if (index !== -1) records.splice(index, 1);
        },
      },
    } as SimpleComponentDef),
  },
});

// columnsResponsive is a computed so layouts can include/exclude selectionCol based on selection mode.
// single-line: checkbox column on the far left
// three-row:   selection + delete icons combined in one cell via threeRowActionsCol (preRender + postRender)
// single-column: no structural change – selected state shown via rowClass only
const columnsResponsive = computed<ResponsiveColumnDefinitions>(() => {
  const inSelection = selectionMode.value !== null;
  return [
    {
      cssClass: 'single-line',
      columns: inSelection
        ? [selectionCol, ...filterColumns(columns, [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12])]
        : filterColumns(columns, [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12]),
    },
    {
      cssClass: 'three-row',
      columns: [...filterColumns(columns, [0, 1, 2, 3]), threeRowActionsCol, ...filterColumns(columns, [5, 6, 7, 8, 9, 10, 11])],
    },
    { cssClass: 'single-column', columns },
  ];
});

const activeColumDef = ref('three-row');
const fullScreenClass = ref('');
const fullScreenButtonText = computed(
  () => (fullScreenClass.value === '' ? 'Stretch grid to window' : "restore grid to original size"),
);

function getMaxId() {
  let max = 0;
  for (const r of records as any[]) {
    if (typeof r.id === 'number' && r.id > max) max = r.id;
  }
  return max;
}

function addRows(count: number) {
  const startId = getMaxId() + 1;
  const newOnes = generateMusicLibrary(count);
  newOnes.forEach((r, i) => {
    (r as any).id = startId + i;
  });
  (records as any[]).push(...newOnes as any[]);
}
</script>

<style scoped>
.full-screen {
  position:   fixed;
  inset:      0;
  z-index:    999;
  color:      white;
  background: black;
}

:global(.shuffle-icon) {
  cursor:  pointer;
  padding: 0 .1em;
  opacity: 0.7;
  color:   blue;
}

:global(.dark .shuffle-icon) {
  color: aqua;
}

:global(.selection-checkbox) {
  cursor:  pointer;
  padding: 0 .1em;
  color:   #1976d2;
}

:global(.dark .selection-checkbox) {
  color: #64b5f6;
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

/* --- Selection highlight --- */
:deep(.df-grid.card.selected) {
  outline: 2px solid #1976d280;
}

:deep(.df-grid.card.single-column.selected) {
  background-color: #1976d230 !important;
  outline: none;
}

/* --- three-row: 7 columns (no selection) --- */
:deep(.df-grid.card.three-row) {
  grid-template-columns: minmax(2em, 4em) repeat(3, auto) minmax(2em, 4em) minmax(2em, 8em) minmax(min-content, max-content);
}


/* --- base card layout --- */
:deep(.df-grid.card) {
  display:               grid;
  grid-template-columns: minmax(2em, 4em) repeat(3, auto) minmax(2em, 4em) minmax(2em, 8em) repeat(7, auto);
  gap:                   .25em;

  padding:               0.5em;
  border:                1px solid #808080ff;
  border-radius:         6px;
  font-size:             0.85rem;
  /*
   * won't work for item measurements, so see the next selector adding negligible padding to parent. That seems to
   * finally take into account this margin
   */
  margin-bottom:         .5em;
}

:deep(.df-grid.dynamic-scroller-item) {
  padding-bottom: .1px;
}

:deep(.df-grid.card.single-column) {
  grid-template-columns: auto;
}

:deep(.df-grid.container .df-grid.card.single-column > *) {
  grid-column: 1 / 2 !important;
  grid-row:    auto !important;
  grid-area:   auto !important;
}

/* --- single-line: 12 columns (no selection) --- */
:deep(.df-grid.card.single-line) {
  /* column before last 1fr so that it stretches to remaining available space */
  grid-template-columns: repeat(9, minmax(min-content, max-content)) 1fr minmax(min-content, max-content)  minmax(min-content, max-content);
}

/* --- single-line: 13 columns (in selection mode — checkbox column prepended) --- */
:deep(.df-grid.container.selection .df-grid.card.single-line) {
  grid-template-columns: minmax(min-content, 1.5em) repeat(9, minmax(min-content, max-content)) 1fr minmax(min-content, max-content) minmax(min-content, max-content);
}

:deep(.df-grid.card.single-line > *) {
  grid-column: auto !important;
  grid-row:    auto !important;
  grid-area:   auto !important;
}

/* --- selection checkbox cell --- */
:deep(.df-grid.cell._selection) {
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         0;
  border:          none;
}

:deep(.df-grid.cell) {
  border:        1px solid darkgray;
  border-radius: 4px;
  padding:       0 .25em;
}

:deep(.df-grid.cell.title), :deep(.df-grid.cell.artist), :deep(.df-grid.cell.genres) {
  grid-column: span 2;
}

:deep(.df-grid.cell.moods) {
  grid-column: 1 / 4;
  grid-row:    3;
}

:deep(.df-grid.cell.duration) {
  grid-column: 6;
}

:deep(.df-grid.cell.genres) {
  grid-column: 1 / 5;
  grid-row:    2;
}

:deep(.df-grid.cell.rating) {
  grid-column: 5;
  grid-row:    2;
}

:deep(.df-grid.cell.favorite) {
  text-align: center;
}

:deep(.df-grid.card.three-row .df-grid.cell.actions) {
  grid-column: 7;
  grid-row:    1 / 4;
  display:     flex;
  align-items: center;
}
</style>
