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
      :estimated-row-height="estimatedRowHeight"
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

import { createColumn, DfGrid, filterColumns, ResponsiveColumnDefinitions, SelectionMode } from '../../src';
import { generateMusicLibrary, languagesMap } from './data-generator';

const records = reactive(generateMusicLibrary(10000));

// --- Selection state ---
const selectionMode = ref<SelectionMode>(null);
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

// Checkbox column for single-line layout. Returns null when selection is inactive (matches
// threeRowActionsCol pattern) so the cell is empty; shows checkbox when selection is active.
const selectionCol = createColumn('_selection', '', 'plain', {
  filterable: false,
  sortable: false,
  rendererOptions: {
    transform: () => '',
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
  createColumn('genres', 'Genres', 'plain', { filterable: true, rendererOptions: { transform: (v: string[]) => v.join(', ') } }),
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
  createColumn('moods', 'Moods', 'plain', { filterable: true, rendererOptions: { transform: (v: string[]) => v.join(', ') } }),
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

// single-line: selectionCol dedicated first column (1.5em always); empty when selection inactive
// three-row:   selection + delete icons combined in one cell via threeRowActionsCol (preRender + postRender)
// single-column: no structural change – selected state shown via rowClass only
const columnsResponsive: ResponsiveColumnDefinitions = [
  {
    cssClass: 'single-line',
    columns: [selectionCol, ...filterColumns(columns, [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12])],
  },
  {
    cssClass: 'three-row',
    rows: 3,
    columns: [...filterColumns(columns, [0, 1, 2, 3]), threeRowActionsCol, ...filterColumns(columns, [5, 6, 7, 8, 9, 10, 11])],
  },
  { cssClass: 'single-column', rows: columns.length, columns },
];

const activeColumDef = ref('three-row');

// `estimatedRowHeight` is a single value shared by every responsive layout, but the layouts
// themselves have wildly different real row heights (single-line ~26px, three-row ~90px,
// single-column ~340px, since it stacks all thirteen fields into one column). Windowing falls
// back to this estimate for every not-yet-measured row, so a mismatched estimate makes it
// misjudge how many records a given scrolled distance actually covers — on a fast scroll through
// still-unmeasured rows this can land the mounted window far from the real viewport, showing
// nothing but spacer until the layout's own measured heights catch up. Keeping one estimate per
// layout, reactive to which one is active, keeps that misjudgement bounded to ordinary rounding
// error instead.
const estimatedRowHeightByLayout: Record<string, number> = { 'single-line': 26, 'three-row': 90, 'single-column': 340 };
const estimatedRowHeight = computed(() => estimatedRowHeightByLayout[activeColumDef.value] ?? 90);

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
:deep(.df-grid.card.single-column.selected) {
  background-color: #1976d230 !important;
  outline: none;
}

/*
 * Real rows are direct items of one shared grid (`.body-grid`) instead of each being its own
 * independent grid — the per-layout `grid-template-columns` lives on the shared container now,
 * not on each row. `.df-grid.card` is the row-anchor: an otherwise-empty box spanning the
 * record's full column/row band, giving it something to carry zebra striping, border, and
 * selection highlight, and something for click handling to `.closest()` onto.
 */

/*
 * --- three-row: 7 columns (no selection) ---
 * Tracks 2-4 host title/artist/genres/moods — the free-text fields with no natural upper bound
 * on how long their content can be. `minmax(12em, 1fr)` lets each claim leftover space on a wide
 * screen (no ceiling, no chosen number) while being free to shrink toward wrapping under
 * pressure, instead of a bare `auto` track's max-content sizing, which never wraps at all and
 * just keeps growing with whatever the longest sampled value happens to be. The `12em` floor is a
 * demo-only, empirically-tuned choice (a lower value measured no effect on when the layout
 * switches) — it belongs on these tracks, not as a `min-width` on the cells that span them: an
 * item's own `min-width` has to fight the grid's track-sizing algorithm to expand the tracks it
 * spans, and can lose that fight and simply overflow past them into a neighbouring column
 * instead, whereas a track's own `minmax` floor is exactly what the sizing algorithm is already
 * built to honour.
 */
:deep(.df-record-grid.three-row) {
  grid-template-columns: minmax(2em, 4em) repeat(3, minmax(12em, 1fr)) minmax(2em, 4em) minmax(4em, 8em) minmax(min-content, max-content);
}

/*
 * Base shared-grid layout — `display`, `gap`, `font-size` and the fallback `grid-template-columns`
 * belong here, on `.df-record-grid`, not on `.df-grid.body-grid`: `.df-record-grid` is the marker
 * every place that lays out a record's fields carries — the real body grid, the header, and the
 * filter row — so one declaration is naturally enough for all three. Only the resolved pixel track
 * list actually needs the header/filter's own JS-driven `!important` override on top of this
 * (it depends on the body's real, measured content — no static CSS value could substitute for
 * that); a static per-layout choice like `gap` never needed a JS copy step in the first place,
 * that was solving a problem this selector already solves on its own.
 */
:deep(.df-record-grid) {
  display:               grid;
  grid-template-columns: minmax(2em, 4em) repeat(3, auto) minmax(2em, 4em) minmax(2em, 8em) repeat(7, auto);
  gap:                   .25em;
  font-size:              0.85rem;
}

:deep(.df-grid.card) {
  border:        1px solid #808080ff;
  border-radius: 6px;
}

/*
 * The header and filter row are, unlike a real row's anchor, themselves the grid container that
 * receives the body grid's own copied `grid-template-columns` — a `border` (unlike an `outline`)
 * is part of the box model, so it would shrink their own content box by 2px below what that
 * copied, border-free pixel list assumes is available, overflowing the row by exactly the border
 * width and drifting the header/body columns out of alignment further right, one border's worth
 * at a time. `outline` draws the same visual line without taking part in the box model at all.
 */
:deep(.df-grid.card.header),
:deep(.df-grid.card.filter-row) {
  border:          none;
  outline:         1px solid #808080ff;
  outline-offset:  -1px;
}

:deep(.df-record-grid.single-column) {
  grid-template-columns: auto;
}

/*
 * A record's row-anchor explicitly claims the record's whole `--rows-per-record`-tall band
 * (`.df-grid.container .body-grid .df-grid.card` in df-grid.vue) so it can carry zebra/selection
 * styling across it. In a single-column grid that band is the record's only column too, so an
 * auto-placed cell (`grid-row: auto`) can never actually land inside its own record's band — the
 * anchor, placed first in DOM order, has already claimed every row in it, and CSS grid auto-flow
 * skips cells already spoken for regardless of which record they logically belong to. Cells need
 * the same explicit, record-relative placement the anchor gets. There is no name shared by every
 * field to select on (two columns here are both named `year`), so this keys off child position
 * instead: a record's cells are its row-anchor's next thirteen siblings, in column declaration
 * order, so under a real record's own wrapper (`.df-anchored`) `:nth-child(2)` is the first field,
 * `:nth-child(3)` the second, and so on. Three other places render this same field list with no
 * row-anchor of their own — the header, the filter row, and the hidden clone `df-grid.vue` measures
 * the body grid's own header-width contribution from — so the same field is one child position
 * earlier there; each carries `df-unanchored` instead. The two markers key off the cell's own
 * *immediate* wrapper rather than some ancestor further up (`.body-grid`, say) precisely because
 * the hidden clone lives inside `.body-grid` too: keying off that ancestor would make both rule
 * sets match its cells at once, with whichever pairing has one more class in its selector chain
 * winning by specificity regardless of which one is actually correct for that wrapper.
 */
:deep(.df-record-grid.single-column .df-grid.cell) {
  grid-column: 1 / 2 !important;
}
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(2)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(1))  { grid-row: calc(var(--row-base) + 1); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(3)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(2))  { grid-row: calc(var(--row-base) + 2); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(4)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(3))  { grid-row: calc(var(--row-base) + 3); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(5)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(4))  { grid-row: calc(var(--row-base) + 4); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(6)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(5))  { grid-row: calc(var(--row-base) + 5); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(7)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(6))  { grid-row: calc(var(--row-base) + 6); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(8)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(7))  { grid-row: calc(var(--row-base) + 7); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(9)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(8))  { grid-row: calc(var(--row-base) + 8); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(10)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(9))  { grid-row: calc(var(--row-base) + 9); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(11)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(10)) { grid-row: calc(var(--row-base) + 10); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(12)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(11)) { grid-row: calc(var(--row-base) + 11); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(13)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(12)) { grid-row: calc(var(--row-base) + 12); }
:deep(.df-grid.body-grid.single-column .df-anchored .df-grid.cell:nth-child(14)),
:deep(.df-unanchored.single-column .df-grid.cell:nth-child(13)) { grid-row: calc(var(--row-base) + 13); }

/* --- single-line: 13 columns; first column auto-sizes (0 when cell hidden, ~1.5em when visible) --- */
:deep(.df-record-grid.single-line) {
  grid-template-columns: max-content repeat(9, minmax(min-content, max-content)) 1fr minmax(min-content, max-content) minmax(min-content, max-content);
}

/*
 * Same conflict as single-column's, one row instead of one column: the row-anchor claims the
 * record's entire (single, since `rows` defaults to 1 here) row across every column, so an
 * auto-placed cell (`grid-column: auto`) can never land in it. Cells get the same
 * record-relative, nth-child-keyed explicit placement — see the single-column comment above,
 * including the header/filter-row one-child-earlier offset (they have no row-anchor sibling).
 */
:deep(.df-record-grid.single-line .df-grid.cell) {
  grid-row: calc(var(--row-base) + 1) !important;
}
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(2)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(1))  { grid-column: 1; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(3)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(2))  { grid-column: 2; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(4)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(3))  { grid-column: 3; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(5)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(4))  { grid-column: 4; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(6)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(5))  { grid-column: 5; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(7)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(6))  { grid-column: 6; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(8)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(7))  { grid-column: 7; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(9)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(8))  { grid-column: 8; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(10)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(9))  { grid-column: 9; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(11)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(10)) { grid-column: 10; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(12)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(11)) { grid-column: 11; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(13)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(12)) { grid-column: 12; }
:deep(.df-grid.body-grid.single-line .df-anchored .df-grid.cell:nth-child(14)),
:deep(.df-unanchored.single-line .df-grid.cell:nth-child(13)) { grid-column: 13; }

/* --- selection checkbox cell: hidden by default; shown when selection is active --- */
:deep(.df-grid.cell._selection) {
  display: none;
}
:deep(.df-grid.container.selection .df-grid.cell._selection) {
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

:deep(.df-record-grid.three-row .df-grid.cell.title),
:deep(.df-record-grid.three-row .df-grid.cell.artist),
:deep(.df-record-grid.three-row .df-grid.cell.genres) {
  grid-column: span 2;
}

/*
 * Three-row placement is relative to each record via --row-base (published per record on an
 * ancestor `display:contents` wrapper, see use-row-placement.ts) rather than absolute row
 * numbers: with every record's cells sharing one grid, an absolute `grid-row: 3` would put
 * every record's third-row cell on the SAME physical row instead of each record getting its own
 * band. title/artist/duration need an explicit row here too (they didn't before) — plain CSS
 * auto-placement has no notion of "record boundaries" once rows share a grid.
 *
 * title/artist also need an explicit grid-column here, overriding the generic `span 2` rule
 * above with a real starting line: `span 2` alone leaves the column auto-placed, and the
 * auto-placement algorithm's cursor only ever advances (it's a single pass over the whole
 * shared grid, not reset per record) — for a record whose row sits behind where the cursor has
 * already advanced to, the browser cannot backfill columns 1-2 in that row and instead grows
 * the grid with implicit extra columns to fit the item in.
 */
:deep(.df-record-grid.three-row .df-grid.cell.title) {
  grid-column: 1 / 3;
  grid-row:    calc(var(--row-base) + 1);
}
:deep(.df-record-grid.three-row .df-grid.cell.artist) {
  grid-column: 3 / 5;
  grid-row:    calc(var(--row-base) + 1);
}

/*
 * id/year/favorite/play_count/language have no other position rule anywhere — before this
 * migration they simply auto-placed into whatever cell was free within their own row's
 * independent grid. With every record's cells on one shared grid, an unpositioned cell isn't
 * safely contained to its own record any more: the browser's auto-placement algorithm hunts for
 * the next free cell across the WHOLE grid, and if the rows near each record's own band are
 * already full of explicitly-placed cells, it creates extra implicit columns to fit the item in
 * — silently growing the grid and overflowing it. Every three-row field needs an explicit,
 * record-relative slot for that reason, not just the ones that already had one.
 */
:deep(.df-record-grid.three-row .df-grid.cell.id) {
  grid-column: 5;
  grid-row:    calc(var(--row-base) + 1);
}
:deep(.df-record-grid.three-row .df-grid.cell.year) {
  grid-column: 6;
  grid-row:    calc(var(--row-base) + 2);
}
:deep(.df-record-grid.three-row .df-grid.cell.favorite) {
  grid-column: 4;
  grid-row:    calc(var(--row-base) + 3);
}
:deep(.df-record-grid.three-row .df-grid.cell.play_count) {
  grid-column: 5;
  grid-row:    calc(var(--row-base) + 3);
}
:deep(.df-record-grid.three-row .df-grid.cell.language) {
  grid-column: 6;
  grid-row:    calc(var(--row-base) + 3);
}

:deep(.df-record-grid.three-row .df-grid.cell.moods) {
  grid-column: 1 / 4;
  grid-row:    calc(var(--row-base) + 3);
}

:deep(.df-record-grid.three-row .df-grid.cell.duration) {
  grid-column: 6;
  grid-row:    calc(var(--row-base) + 1);
}

:deep(.df-record-grid.three-row .df-grid.cell.genres) {
  grid-column: 1 / 5;
  grid-row:    calc(var(--row-base) + 2);
}

:deep(.df-record-grid.three-row .df-grid.cell.rating) {
  grid-column: 5;
  grid-row:    calc(var(--row-base) + 2);
}

:deep(.df-grid.cell.favorite) {
  text-align: center;
}

:deep(.df-record-grid.three-row .df-grid.cell.actions) {
  grid-column: 7;
  grid-row:    calc(var(--row-base) + 1) / calc(var(--row-base) + 4);
  display:     flex;
  align-items: center;
}
</style>
