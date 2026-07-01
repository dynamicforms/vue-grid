<template>
  <div ref="demoRef" class="my-demo-app" style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <v-btn color="primary"   @click="addRecords('end')">Add at bottom</v-btn>
      <v-btn color="secondary" @click="addRecords('start')">Add at top</v-btn>
      <v-btn color="success"   @click="addRecords('random')">Add random</v-btn>
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

function addRecords(position: 'start' | 'end' | 'random') {
  const count = Math.floor(Math.random() * 2) + 1;
  const newOnes = generateMusicLibrary(count).map((r) => ({ ...r, id: nextId++ }));
  const pks = newOnes.map((r) => r.id);

  if (position === 'start') {
    records.unshift(...newOnes);
    recentlyAdded.addRecentlyAdded(pks, 600);
  } else if (position === 'end') {
    records.push(...newOnes);
    recentlyAdded.addRecentlyAdded(pks, 600);
  } else {
    const pos = Math.floor(Math.random() * (records.length + 1));
    records.splice(pos, 0, ...newOnes);
    // Let the composable determine top/bottom based on viewport position.
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
  const scrollEl = demoRef.value?.querySelector<HTMLElement>('.cards-grid');
  if (scrollEl) scrollEl.scrollTop = 350;
});

const columns = [
  createColumn('id',     'Id',     'int',   { cssClass: 'text-right' }),
  createColumn('title',  'Title',  'plain'),
  createColumn('artist', 'Artist', 'plain'),
  createColumn('year',   'Year',   'int',   { cssClass: 'text-right' }),
  createColumn('rating', 'Rating', 'int',   { cssClass: 'text-right' }),
];
</script>

<style>
/*
 * Row reveal animation: clip-path wipe from top gives the visual impression of
 * height 0 → 100 % without changing layout height (virtual scroll pre-measures sizes).
 */
@keyframes df-incoming-row-reveal {
  from { clip-path: inset(0 0 100% 0); opacity: 0.3; }
  to   { clip-path: inset(0 0 0%   0); opacity: 1;   }
}
.df-grid.card.state-adding {
  animation: df-incoming-row-reveal 0.5s ease-out;
  background-color: rgba(64, 100, 220, 0.15) !important;
}

/* ---------- 2-row card layout -------------------------------------------- */
.incoming-demo-grid {
  height: 30em;
}
.incoming-demo-grid .df-grid.card {
  display: grid;
  /*
   * 4 columns:  [narrow id/blank]  [wide title/year]  [wide artist/blank]  [narrow rating]
   * Row 1: title spans cols 1-3, artist spans cols 3-5 (i.e. 1-2 and 3-4 in a 4-col grid)
   * Row 2: id · year · (gap) · rating
   */
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
  padding: 0.35em 0.6em;
  border: 1px solid #80808050;
  border-radius: 4px;
  margin-bottom: 0.3em;
}
.incoming-demo-grid .df-grid.dynamic-scroller-item { padding-bottom: 0.1px; }

/* Row 1 — :not(.shadow-grid) excludes shadow-grid cells so shadow can auto-place and measure correctly */
.incoming-demo-grid .df-grid.card:not(.shadow-grid) .df-grid.cell.title  { grid-column: 1 / 3; grid-row: 1; }
.incoming-demo-grid .df-grid.card:not(.shadow-grid) .df-grid.cell.artist { grid-column: 3 / 5; grid-row: 1; }

/* Row 2 */
.incoming-demo-grid .df-grid.card:not(.shadow-grid) .df-grid.cell.id     { grid-column: 1; grid-row: 2; font-size: 0.75em; opacity: 0.6; }
.incoming-demo-grid .df-grid.card:not(.shadow-grid) .df-grid.cell.year   { grid-column: 2; grid-row: 2; }
.incoming-demo-grid .df-grid.card:not(.shadow-grid) .df-grid.cell.rating { grid-column: 4; grid-row: 2; }

/* Zebra & header */
.incoming-demo-grid .df-grid.card.even { background-color: #b0b0b020; }
.incoming-demo-grid .df-grid.card.odd  { background-color: #60606020; }
.incoming-demo-grid .df-grid.header-container { font-weight: bold; }
</style>
