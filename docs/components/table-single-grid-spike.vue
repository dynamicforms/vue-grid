<template>
  <div>
    <div style="display: flex; gap: 1em; padding: 1em; align-items: center">
      <label>Mode: <select v-model="mode"><option value="baseline">baseline</option><option value="candidate">candidate</option></select></label>
      <label>Count: <select v-model.number="count"><option :value="500">500</option><option :value="2000">2000</option><option :value="5000">5000</option></select></label>
      <label>Layout: <select v-model="layout"><option value="uniform">uniform</option><option value="wrapping">wrapping</option></select></label>
      <span>{{ records.length }} records</span>
    </div>
    <div ref="wrapperEl" style="max-width: 100%; overflow: auto">
      <table-single-grid-spike-baseline
        v-if="mode === 'baseline'"
        :key="instanceKey"
        :records="records"
        :columns="columns"
        :layout="layout"
      />
      <table-single-grid-spike-candidate
        v-else
        :key="instanceKey"
        :records="records"
        :columns="columns"
        :layout="layout"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Harness for the single-grid column-sizing spike. Mounts exactly one of the baseline/candidate
// variants at a time and exposes a small automation surface for Playwright, following the
// `window.__roCallbackCount`-style convention already used in e2e/render-loop.spec.ts, so trials
// don't rely on brittle UI clicking.
import { computed, nextTick, onMounted, ref } from 'vue';

import { makeSpikeRecords, uniformColumns, wrappingColumns } from './table-single-grid-spike-data';
import TableSingleGridSpikeBaseline from './table-single-grid-spike-baseline.vue';
import TableSingleGridSpikeCandidate from './table-single-grid-spike-candidate.vue';

const mode = ref<'baseline' | 'candidate'>('baseline');
const count = ref(500);
const layout = ref<'uniform' | 'wrapping'>('uniform');
const wrapperEl = ref<HTMLElement>();

const records = computed(() => makeSpikeRecords(count.value));
const columns = computed(() => (layout.value === 'uniform' ? uniformColumns : wrappingColumns));

// Bumped to force a clean remount (mount-cost trials need a fresh instance, not a reactive update).
const remountTick = ref(0);
const instanceKey = computed(() => `${mode.value}-${count.value}-${layout.value}-${remountTick.value}`);

onMounted(() => {
  (window as any).__spike = {
    setMode: async (m: 'baseline' | 'candidate') => {
      mode.value = m;
      await nextTick();
    },
    setCount: async (c: number) => {
      count.value = c;
      await nextTick();
    },
    setLayout: async (l: 'uniform' | 'wrapping') => {
      layout.value = l;
      await nextTick();
    },
    remount: async () => {
      remountTick.value += 1;
      await nextTick();
    },
    resizeContainer: async (width: number) => {
      if (wrapperEl.value) wrapperEl.value.style.maxWidth = `${width}px`;
      await nextTick();
    },
  };
});
</script>
