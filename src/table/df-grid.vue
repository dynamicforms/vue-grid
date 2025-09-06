<template>
  <div class="df-grid container" :style="`height: ${height}`">
    <dynamic-scroller
      v-slot="{ item, index, active }"
      class="cards-grid"
      :items="records"
      :min-item-size="30"
      :key-field="keyField"
      :buffer="1000"
      :emit-update="true"
      style="height: 100%; overflow-y: auto"
      @update="updateRenderedRows"
    >
      <dynamic-scroller-item
        :item="item"
        :active="active"
        :size-dependencies="[]"
        :data-index="index"
        class="df-grid dynamic-scroller-item"
      >
        <grid-card
          v-if="active"
          :item="item"
          :columns="columnRendererOptionsInternal"
          :renderers="DefaultRenderers"
          :class="{ even: index % 2 === 0, odd: index % 2 === 1 }"
          :style="`${templateColumns}`"
          :data-pk="item[keyField]"
        />
      </dynamic-scroller-item>
    </dynamic-scroller>
    <shadow-grid
      :records="records"
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

import { DefaultRenderers, gridColumnCreate, gridDestroy, RendererOptionsMap, RowValue } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { ColumnDefinition } from './columns';
import { GridCard, ShadowGrid } from './helpers';

interface GridProps {
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  records: RowValue[];
  height: string | number;
  keyField: string;
  mainShadowCount?: number;
}

const props = withDefaults(defineProps<GridProps>(), { mainShadowCount: 100, columns: () => [] });

const mainShadowOffset = ref(0);
const templateColumns = ref('');
const gridId = Symbol('df-grid');

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
