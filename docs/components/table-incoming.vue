<template>
  <div ref="demoRef" class="my-demo-app" style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <v-btn color="primary"   @click="addRecords('end')">Add at bottom</v-btn>
      <v-btn color="secondary" @click="addRecords('start')">Add at top</v-btn>
      <v-btn color="success"   @click="addRecords('random')">Add random</v-btn>
      <v-btn color="error"     @click="addRecords('visible')">Add in visible range</v-btn>
      <v-btn :color="autoActive ? 'warning' : 'info'" @click="toggleAuto">
        {{ autoActive ? 'Pause auto-add' : 'Start auto-add' }}
      </v-btn>
      <span style="font-size: 0.8rem; opacity: 0.7">{{ records.length }} records</span>
    </div>
    <df-grid
      :columns="columns"
      :records="records"
      :recently-added="recentlyAdded"
      class="incoming-demo-grid"
      key-field="id"
      :row-class="rowClass"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';

import { createColumn, DfGrid, useRecentlyAdded } from '../../src';
import { generateMusicLibrary } from './data-generator';

const demoRef = ref<HTMLElement | null>(null);
const records = reactive(generateMusicLibrary(50)) as any[];

let nextId = records.reduce((max: number, r: any) => Math.max(max, r.id as number), 0) + 1;

const recentlyAdded = useRecentlyAdded(ref(records), 'id');

function rowClass(item: any, index: number): string {
  const stripe = index % 2 === 0 ? 'even' : 'odd';
  return recentlyAdded.isPendingAdd(item.id) ? `${stripe} state-adding` : stripe;
}

function addRecords(position: 'start' | 'end' | 'random' | 'visible') {
  const count = 1; //Math.floor(Math.random() * 2) + 1;
  const newOnes = generateMusicLibrary(count).map((r) => ({ ...r, id: nextId++ }));
  const pks = newOnes.map((r) => r.id);

  if (position === 'start') {
    records.unshift(...newOnes);
    recentlyAdded.addRecentlyAdded(pks, 600);
  } else if (position === 'end') {
    records.push(...newOnes);
    recentlyAdded.addRecentlyAdded(pks, 600);
  } else if (position === 'visible') {
    const { start, end } = recentlyAdded.visibleRange.value;
    const rangeSize = Math.max(0, end - start);
    if (rangeSize === 0) return;
    const pos = start + Math.floor(Math.random() * rangeSize);
    records.splice(pos, 0, ...newOnes);
    recentlyAdded.addRecentlyAdded(pks, 600);
  } else {
    const pos = Math.floor(Math.random() * (records.length + 1));
    records.splice(pos, 0, ...newOnes);
    recentlyAdded.addRecentlyAdded(pks, 600);
  }
}

const autoActive = ref(false);
let autoTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNext() {
  if (!autoActive.value) return;
  autoTimer = setTimeout(() => {
    const positions = ['start', 'end', 'end', 'end', 'random'] as const;
    addRecords(positions[Math.floor(Math.random() * positions.length)]);
    scheduleNext();
  }, 1200 + Math.random() * 800);
}

function toggleAuto() {
  autoActive.value = !autoActive.value;
  if (autoActive.value) {
    scheduleNext();
  } else {
    if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; }
  }
}

onUnmounted(() => { if (autoTimer !== null) clearTimeout(autoTimer); });

// Pre-scroll so the user can immediately see the arc on first click without
// having to manually scroll — the arc only fires when new records are outside
// the visible viewport, so we start with the grid scrolled ~40 % down.
onMounted(() => {
  const scrollEl = demoRef.value?.querySelector<HTMLElement>('.body-grid');
  if (scrollEl) scrollEl.scrollTop = 350;
});

// A responsive single-entry definition (rather than a flat column list) so `rows` can declare
// the 2-row-per-record card layout below — a flat column list always implies 1 row per record.
const columns = [
  {
    cssClass: 'incoming-card',
    rows: 2,
    columns: [
      createColumn('id',     'Id',     'int',   { cssClass: 'text-right' }),
      createColumn('title',  'Title',  'plain'),
      createColumn('artist', 'Artist', 'plain'),
      createColumn('year',   'Year',   'int',   { cssClass: 'text-right' }),
      createColumn('rating', 'Rating', 'int',   { cssClass: 'text-right' }),
    ],
  },
];
</script>

<style>
/* scaleY reveal + brightness wink. filter:brightness() is GPU-compositable and animates
   smoothly regardless of what else is going on in the row's own layout. */
@keyframes df-row-scale-in {
  from { transform: scaleY(0); opacity: 0.3; }
  to   { transform: scaleY(1); opacity: 1;   }
}
@keyframes df-row-wink {
  0%, 100% { filter: brightness(1);   }
  50%      { filter: brightness(2.2); }
}

.incoming-demo-grid .df-grid.card.state-adding {
  transform-origin: center center;
  animation:
    df-row-scale-in 0.25s ease-out,
    df-row-wink     0.4s  0.25s ease-in-out both;
}

/* ---------- 2-row card layout -------------------------------------------- */
.incoming-demo-grid {
  height: 30em;
}
/* Real rows are direct items of one shared grid (`.body-grid`) instead of each being its own
   independent grid; `.df-grid.card` is the row-anchor (zebra/border), not a grid itself. */
.incoming-demo-grid .df-grid.body-grid {
  display: grid;
  /*
   * 4 columns:  [narrow id/blank]  [wide title/year]  [wide artist/blank]  [narrow rating]
   * Row 1: title spans cols 1-3, artist spans cols 3-5 (i.e. 1-2 and 3-4 in a 4-col grid)
   * Row 2: id · year · (gap) · rating
   */
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
}
.incoming-demo-grid .df-grid.card {
  border: 1px solid #80808050;
  border-radius: 4px;
}

/* Placement is relative to each record via --row-base (see use-row-placement.ts): with every
   record's cells sharing one grid, an absolute `grid-row: 1` would put every record's first-row
   cell on the SAME physical row instead of each record getting its own 2-row band. */
.incoming-demo-grid .df-grid.cell.title  { grid-column: 1 / 3; grid-row: calc(var(--row-base) + 1); }
.incoming-demo-grid .df-grid.cell.artist { grid-column: 3 / 5; grid-row: calc(var(--row-base) + 1); }

.incoming-demo-grid .df-grid.cell.id     { grid-column: 1; grid-row: calc(var(--row-base) + 2); font-size: 0.75em; opacity: 0.6; }
.incoming-demo-grid .df-grid.cell.year   { grid-column: 2; grid-row: calc(var(--row-base) + 2); }
.incoming-demo-grid .df-grid.cell.rating { grid-column: 4; grid-row: calc(var(--row-base) + 2); }

/* Zebra & header */
.incoming-demo-grid .df-grid.card.even { background-color: #b0b0b020; }
.incoming-demo-grid .df-grid.card.odd  { background-color: #60606020; }
.incoming-demo-grid .df-grid.header-container { font-weight: bold; }
</style>
