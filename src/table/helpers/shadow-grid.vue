<template>
  <div ref="shadowGridRef" class="df-grid shadow-grid card">
    <div
      v-for="{ item, field } in idxAndItem()"
      :key="`${item[keyField]}-${field}`"
      v-memo="[`${item[keyField]}-${field}`]"
      :class="`df-grid cell ${field}`"
    >
      {{ item[field] }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { ShadowGridMeasurements } from './shadow-grid-types';

interface GridProps {
  records: Record<string, any>[];
  count: number;
  offset: number;
  keyField: string;
}

const props = defineProps<GridProps>();

interface Emits {
  (e: 'onmeasure', value: ShadowGridMeasurements): any;
}
const emits = defineEmits<Emits>();

const shadowGridRef = ref();

function checkShadowGridColumns() {
  if (!shadowGridRef.value) return;

  const computedStyle = window.getComputedStyle(shadowGridRef.value);
  const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));

  emits('onmeasure', { totalWidth, columnWidths: computedStyle.getPropertyValue('grid-template-columns') });
}

function* idxAndItem() {
  nextTick(() => checkShadowGridColumns());
  for (let i = 0; i < props.count; i++) {
    const itm = props.records[i + props.offset];
    yield { item: itm, field: 'df-grid-card-break-item' };
    for (const idx of Object.keys(itm)) {
      yield { item: itm, field: idx as keyof typeof itm };
    }
  }
}
</script>

<style scoped>
.df-grid.shadow-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  height: 20em;
  overflow-y: scroll;
  overflow-x: hidden;
  visibility: hidden;
}
:deep(.df-grid.cell.df-grid-card-break-item) {
  grid-column: 1 / -1;
}
</style>
