<template>
  <div ref="shadowGridRef" class="df-grid shadow-grid card">
    <grid-card
      v-for="item in idxAndItem()"
      :key="`${item[keyField]}`"
      v-memo="[`${item[keyField]}`]"
      :item="item"
      :columns="columns"
      :renderers="renderers"
      :add-row-reset-item="true"
      :no-wrapper-item="true"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue } from '../cell-renderers';
import { ColumnDefinition } from '../columns';

import GridCard from './grid-card.vue';
import { ShadowGridMeasurements } from './shadow-grid-types';

interface GridProps {
  records: RowValue[];
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  renderers: RenderersMap;
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
  const mx = Math.min(props.count, props.records.length);
  for (let i = 0; i < mx; i++) {
    yield props.records[i + props.offset];
  }
}
</script>

<style>
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
</style>
