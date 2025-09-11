<template>
  <div
    ref="containerRef"
    class="df-grid container d-flex flex-column"
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void (0)"
  >
    <df-grid-header
      ref="headerRef"
      :columns="uColumns.columns.value"
      :grid-id="gridId"
      :template-columns="templateColumns"
      :grid-class="{ [uColumns.cssClass.value]: true }"
    >
      <template #header="headerSlotProps"><slot name="header" v-bind="headerSlotProps"/></template>
    </df-grid-header>
    <dynamic-scroller
      v-slot="{ item, index, active }"
      class="cards-grid flex-1-1 overflow-y-scroll"
      :items="records"
      :min-item-size="30"
      :key-field="keyField"
      :buffer="1000"
      :emit-update="true"
      @update="updateRenderedRows"
    >
      <dynamic-scroller-item
        :item="item"
        :active="active"
        :size-dependencies="[]"
        :data-index="index"
        class="df-grid dynamic-scroller-item"
      >
        <slot name="item" :item="item" :index="index" :active="active">
          <grid-card
            v-if="active"
            :item="item"
            :columns="columnRendererOptionsInternal"
            :renderers="DefaultRenderers"
            :class="[uColumns.cssClass.value, { even: index % 2 === 0, odd: index % 2 === 1 }]"
            :style="`${templateColumns}`"
            :data-pk="item[keyField]"
            :data-idx="index"
          />
        </slot>
      </dynamic-scroller-item>
    </dynamic-scroller>
    <shadow-grid
      ref="shadowRef"
      :records="records"
      :columns="columnRendererOptionsInternal"
      :renderers="DefaultRenderers"
      :count="mainShadowCount"
      :offset="mainShadowOffset"
      :class="uColumns.cssClass.value"
      :key-field="keyField"
      @onmeasure="templateColumns = `grid-template-columns: ${$event.columnWidths}`"
    />
    <div v-for="colsDef in uColumns.builtColumns.value" :key="colsDef.name">
      <shadow-grid
        v-if="!shadowMeasurements[colsDef.name]"
        style="right: auto"

        :records="records"
        :columns="colsDef.columnRenderOptsInternal.value"
        :renderers="DefaultRenderers"
        :count="secondaryShadowCount"
        :offset="secondaryShadowOffset"
        :class="colsDef.cssClass"
        :key-field="keyField"
        @onmeasure="shadowMeasurements[colsDef.name] = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { keys, maxBy, pickBy, throttle } from 'lodash-es';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
// @ts-ignore
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import { DefaultRenderers, gridColumnCreate, gridDestroy, RendererOptionsMap } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { useColumns } from './columns';
import DfGridHeader from './df-grid-header.vue';
import { useGridMouseEvents } from './df-grid-mouse-events';
import type { GridEmits, GridProps } from './df-grid-types';
import { GridCard, ShadowGrid } from './helpers';

const props = withDefaults(
  defineProps<GridProps>(),
  { mainShadowCount: 500, secondaryShadowCount: 30, columns: () => [] },
);
const emit = defineEmits<GridEmits>();

const mainShadowOffset = ref(0);
const secondaryShadowOffset = ref(0);
const templateColumns = ref('');
const gridId = Symbol('df-grid');
const headerRef = ref();
const shadowMeasurements: Record<string, any> = {};
const shadowRef = ref();

const { processMouse } = useGridMouseEvents(emit, props, headerRef);

const updateRenderedRows = throttle(
  (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => {
    const mid = Math.round((visibleStartIndex + visibleEndIndex) / 2);
    mainShadowOffset.value = Math.max(0, mid - Math.round(props.mainShadowCount / 2));
    // Maybe we don't update secondary shadows to avoid unnecessary redraws, but, if so, we should increase the count
    // secondaryShadowOffset.value = Math.max(0, mid - Math.round(props.secondaryShadowCount / 2));
  },
  250,
);

const uColumns = useColumns(props, gridId);

watch(uColumns.active, () => { templateColumns.value = ''; });

const containerRef = ref();
const resizeObserver = new ResizeObserver((etries) => {
  etries.forEach((entry) => {
    const { width } = entry.contentRect;
    const filtered = pickBy(shadowMeasurements, (config) => config.totalWidth <= width);
    const bestLayout = maxBy(keys(filtered), (key) => filtered[key].totalWidth);
    templateColumns.value = '';
    shadowRef.value?.reMeasure();
    if (bestLayout != null && bestLayout !== props.activeColumns) {
      emit('update:activeColumns', <string> bestLayout);
    }
  });
});
onMounted(() => { resizeObserver.observe(containerRef.value); });
onUnmounted(() => { resizeObserver.disconnect(); });

const columnRendererOptionsInternal = computed(() => uColumns.columns.value.map((column) => {
  const opt: CellOptionsInternal = (column.rendererOptions ?? { nullHandler: 'null-null' }) as CellOptionsInternal;
  opt[gridIdOption] = gridId;
  opt[columnNameOption] = column.fieldName;
  opt[columnIdOption] = Symbol('grid-column');

  gridColumnCreate(gridId, column.renderer as keyof RendererOptionsMap, opt);
  return { ...column, rendererOptions: opt };
}));

onUnmounted(() => gridDestroy(gridId));
</script>

<style>
.df-grid.container {
  position: relative;
}
.df-grid.dynamic-scroller-item {
  /* itemi morajo biti position: absolute, drugače je med njimi dvojni spacing */
  position:absolute;
  left: 0;
  right: 0;
}
</style>
