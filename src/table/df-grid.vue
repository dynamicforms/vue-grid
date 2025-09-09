<template>
  <div
    class="df-grid container d-flex flex-column"
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void (0)"
  >
    <df-grid-header ref="headerRef" :columns="columns" :grid-id="gridId" :template-columns="templateColumns">
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
            :class="{ even: index % 2 === 0, odd: index % 2 === 1 }"
            :style="`${templateColumns}`"
            :data-pk="item[keyField]"
            :data-idx="index"
          />
        </slot>
      </dynamic-scroller-item>
    </dynamic-scroller>
    <shadow-grid
      :records="records"
      :columns="columnRendererOptionsInternal"
      :renderers="DefaultRenderers"
      :count="mainShadowCount"
      :offset="mainShadowOffset"
      :key-field="keyField"
      @onmeasure="templateColumns = `grid-template-columns: ${$event.columnWidths}`"
    />
  </div>
</template>

<script setup lang="ts">
import { throttle } from 'lodash-es';
import { computed, onUnmounted, ref } from 'vue';
// @ts-ignore
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import { DefaultRenderers, gridColumnCreate, gridDestroy, RendererOptionsMap, RowValue } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import DfGridHeader from './df-grid-header.vue';
import { useGridMouseEvents, type GridEmits } from './df-grid-mouse-events';
import type { GridProps } from './df-grid-types';
import { GridCard, ShadowGrid } from './helpers';

const props = withDefaults(defineProps<GridProps>(), { mainShadowCount: 100, columns: () => [] });

const emit = defineEmits<GridEmits>();
const { processMouse } = useGridMouseEvents(emit, props);

const mainShadowOffset = ref(0);
const templateColumns = ref('');
const gridId = Symbol('df-grid');
const headerRef = ref();

const updateRenderedRows = throttle(
  (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => {
    const mid = Math.round((visibleStartIndex + visibleEndIndex) / 2);
    mainShadowOffset.value = Math.max(0, mid - Math.round(props.mainShadowCount / 2));
  },
  250,
);

const columnRendererOptionsInternal = computed(() => props.columns.map((column) => {
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
