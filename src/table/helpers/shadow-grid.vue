<template>
  <div ref="shadowGridRef" class="df-grid shadow-grid card">
    <grid-card
      v-for="item in idxAndItem()"
      :key="`${item[keyField]}`"
      v-memo="[`${item[keyField]}`, columnKey]"
      :item="item"
      :columns="columns"
      :renderers="renderers"
      :add-row-reset-item="true"
      :no-wrapper-item="true"
    />
    <component :is="() => headerContentVNodes" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRefs } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue } from '../cell-renderers';
import { ColumnDefinition } from '../columns';

import GridCard from './grid-card.vue';
import { useHeaderContent } from './header-content';
import { ShadowGridMeasurements } from './shadow-grid-types';

export interface GridProps {
  records: RowValue[];
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  renderers: RenderersMap;
  count: number;
  offset: number;
  keyField: string;
  selectionActive?: boolean;
}

const props = defineProps<GridProps>();
// The following dereference is necessary because vue 3.4 SSR renderer messes up the v-memo generation
const { keyField } = toRefs(props);
const columnKey = computed(() => props.columns.map((c) => c.fieldName).join(','));

interface Emits {
  (e: 'onmeasure', value: ShadowGridMeasurements): any;
}
const emits = defineEmits<Emits>();
const { headerContentVNodes } = useHeaderContent();
const shadowGridRef = ref();

// Resolves once a valid measurement has actually been emitted, retrying across animation frames
// in the meantime — the caller doesn't need its own knowledge of the "none" race to await
// completion.
function checkShadowGridColumns(): Promise<void> {
  // istanbul ignore next — shadowGridRef.value is always set when the component is mounted;
  // the null branch is a defensive guard that cannot be triggered through normal component usage.
  if (!shadowGridRef.value) return Promise.resolve();

  return new Promise((resolve) => {
    const attempt = () => {
      const computedStyle = window.getComputedStyle(shadowGridRef.value);
      const columnWidths = computedStyle.getPropertyValue('grid-template-columns');

      // `grid-template-columns` reads back as its initial value, "none", for the one frame
      // between the element existing in the DOM and the stylesheet rule that makes it a grid
      // taking effect. Emitting that would hand every `onmeasure` listener a value none of them
      // can use meaningfully — retrying here, once, on the next frame is cheaper than every
      // listener re-deriving "was this reading valid" for itself.
      if (!columnWidths || columnWidths === 'none') {
        requestAnimationFrame(attempt);
        return;
      }

      const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));

      emits('onmeasure', { totalWidth, columnWidths });
      resolve();
    };
    attempt();
  });
}

function* idxAndItem() {
  nextTick(() => checkShadowGridColumns());
  const mx = Math.min(props.offset + props.count, props.records.length) - props.offset;
  for (let i = 0; i < mx; i++) {
    yield props.records[i + props.offset];
  }
}

function reMeasure(): Promise<void> {
  return checkShadowGridColumns();
}
defineExpose({
  reMeasure,
  get containerEl() {
    return shadowGridRef.value;
  },
});
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
