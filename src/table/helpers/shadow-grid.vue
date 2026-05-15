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
    <component :is="() => headerContentVNodes"/>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, toRefs } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue } from '../cell-renderers';
import { ColumnDefinition } from '../columns';

import GridCard from './grid-card.vue';
import { useHeaderContent } from './header-content';
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
const { keyField } = toRefs(props); // This is necessary because vue 3.4 SSR renderer messes up the v-memo generation

interface Emits {
  (e: 'onmeasure', value: ShadowGridMeasurements): any;
}
const emits = defineEmits<Emits>();
const { headerContentVNodes } = useHeaderContent();
const shadowGridRef = ref();

function checkShadowGridColumns() {
  if (!shadowGridRef.value) return;

  const computedStyle = window.getComputedStyle(shadowGridRef.value);
  const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));

  emits('onmeasure', { totalWidth, columnWidths: computedStyle.getPropertyValue('grid-template-columns') });
}

function* idxAndItem() {
  nextTick(() => checkShadowGridColumns());
  const mx = Math.min(props.offset + props.count, props.records.length) - props.offset;
  for (let i = 0; i < mx; i++) {
    yield props.records[i + props.offset];
  }
}

function reMeasure() {
  checkShadowGridColumns();
}
defineExpose({ reMeasure });
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
