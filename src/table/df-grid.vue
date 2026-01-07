<template>
  <div
    ref="containerRef"
    v-longpress="($event) => processMouse('longpress', $event)"
    class="df-grid container d-flex flex-column"
    :style="`--${templateColumns}`"
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void (0)"
  >
    <df-grid-header
      ref="headerRef"
      :columns="uColumns.columns.value"
      :grid-id="gridId"
      :template-columns="templateColumns"
      :grid-class="uColumns.cssClass.value"
      :sort-state="sortState"
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
      @onmeasure="(event) => doShadowMeasure(event)"
    />
    <div v-for="colsDef in uColumns.builtColumns.value" :key="colsDef.name">
      <!--
      we only render secondary shadows once (v-if="!shadowMeasurements[colsDef.name]") to get ballpark width figures.
      This will cause issues when switching among the dynamic layouts because the initial render might have been
      too narrow. This may be mitigated by increasing secondaryShadowCount
      -->
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
        @onmeasure="(event) => shadowMeasurements[colsDef.name] = event.totalWidth"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { keys, maxBy, pickBy, throttle } from 'lodash-es';
import { computed, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
// @ts-ignore
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import { DefaultRenderers, gridColumnCreate, gridDestroy, RendererOptionsMap } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { useColumns } from './columns';
import { useSorting } from './columns-sorting';
import DfGridHeader from './df-grid-header.vue';
import { useGridMouseEvents } from './df-grid-mouse-events';
import type { GridEmits, GridProps } from './df-grid-types';
import { GridCard, ShadowGrid, ShadowGridMeasurements, useHeaderContent } from './helpers';

const props = withDefaults(
  defineProps<GridProps>(),
  { mainShadowCount: 500, secondaryShadowCount: 30, columns: () => [] },
);
const emit = defineEmits<GridEmits>();

const { sortState, emitWrapper } = useSorting(props, emit);

const mainShadowOffset = ref(0);
const secondaryShadowOffset = ref(0);
const templateColumns = ref('');
const gridId = Symbol('df-grid');
const headerRef = ref();
const shadowMeasurements: Record<string, any> = {};
const shadowRef = ref();

useHeaderContent().provideHeaderContent();

const updateRenderedRows = throttle(
  (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => {
    const mid = Math.round((visibleStartIndex + visibleEndIndex) / 2);
    mainShadowOffset.value = Math.max(0, mid - Math.round(props.mainShadowCount / 2));
  },
  250,
);

const uColumns = useColumns(props, gridId);
const { processMouse } = useGridMouseEvents(emitWrapper, props, sortState, headerRef, uColumns);

watch(uColumns.active, () => { templateColumns.value = ''; });

const containerRef = ref();
let lastResizeWasShrink = true;
let lastResizeWidth = 0;
const resizeObserver = new ResizeObserver((etries) => {
  etries.forEach((entry) => {
    const { width } = entry.contentRect;
    lastResizeWasShrink = width < lastResizeWidth;
    lastResizeWidth = width;
    const filtered = pickBy(shadowMeasurements, (config) => config <= width);
    const bestLayout = maxBy(keys(filtered), (key) => filtered[key]);
    shadowRef.value?.reMeasure();
    if (bestLayout != null && bestLayout !== props.activeColumns) {
      templateColumns.value = '';
      emit('update:activeColumns', <string> bestLayout);
    }
  });
});
onMounted(() => { resizeObserver.observe(containerRef.value); });
onUnmounted(() => { resizeObserver.disconnect(); });
onUpdated(() => {
  const targetElement = containerRef.value?.querySelector('.df-grid.dynamic-scroller-item .df-grid.card');
  if (targetElement != null && !lastResizeWasShrink) {
    const computedStyle = window.getComputedStyle(targetElement);
    const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));
    const tSWidth = targetElement.scrollWidth;
    if (tSWidth > totalWidth && tSWidth > shadowMeasurements[uColumns.active.value]) {
      // console.log(totalWidth, tSWidth, shadowMeasurements[uColumns.active.value]);
      shadowMeasurements[uColumns.active.value] = tSWidth;
    }
  }
});

const doShadowMeasure = throttle(
  (event: ShadowGridMeasurements) => { templateColumns.value = `grid-template-columns: ${event.columnWidths}`; },
  100,
);

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
.df-grid.container .df-grid.card:not(.shadow-grid) {
  /*noinspection CssUnresolvedCustomProperty*/
  grid-template-columns: var(--grid-template-columns);
}
</style>
