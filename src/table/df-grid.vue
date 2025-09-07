<template>
  <div
    class="df-grid container"
    :style="`height: ${height}`"
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void (0)"
  >
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
          :data-idx="index"
        />
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

export interface GridEmits {
  (e: 'click', rowIdx: number, key: any, rowData: RowValue | undefined, columnClasses: string[]): void;
  (e: 'dblclick', rowIdx: number, key: any, rowData: RowValue | undefined, columnClasses: string[]): void;
}

const emit = defineEmits<GridEmits>();

const mainShadowOffset = ref(0);
const templateColumns = ref('');
const gridId = Symbol('df-grid');

function processMouse(eType: 'click' | 'dblclick', event: MouseEvent) {
  const target = event.target as HTMLElement;

  const column = target.closest('.df-grid.cell');
  const row = target?.closest('.df-grid.card');
  const colClasses = [...(column?.classList ?? [])].filter((c: any) => !['df-grid', 'cell'].includes(c));
  const rowId = Number.parseInt(row?.getAttribute('data-idx') ?? '-1', 10);
  const rowData = rowId === -1 ? undefined : props.records[rowId];
  emit(eType as any, rowId, rowData?.[props.keyField], rowData, colClasses);
}

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
