<template>
  <div
    class="df-grid container d-flex flex-column"
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void (0)"
  >
    <div
      ref="headerRef"
      class="df-grid header"
      :style="{ 'overflow-y': 'hidden', 'scrollbar-gutter': 'stable', minHeight: `${headerHeight}px` }"
    >
      <slot name="header" :item="headerItem">
        <grid-card
          :item="headerItem"
          :columns="headerOptions"
          :renderers="DefaultRenderers"
          class="df-grid card header"
          :style="`${templateColumns}`"
          data-pk="header"
          data-idx="header"
        />
      </slot>
    </div>
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
import { computed, onMounted, onUnmounted, onUpdated, ref } from 'vue';
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
  keyField: string;
  mainShadowCount?: number;
}

const props = withDefaults(defineProps<GridProps>(), { mainShadowCount: 100, columns: () => [] });

export interface GridEmits {
  (e: 'click', rowIdx: number, key: any, rowData: RowValue | undefined, columnClasses: string[], event: MouseEvent)
    : void;
  (e: 'dblclick', rowIdx: number, key: any, rowData: RowValue | undefined, columnClasses: string[], event: MouseEvent)
    : void;
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
  emit(eType as any, rowId, rowData?.[props.keyField], rowData, colClasses, event);
}

const updateRenderedRows = throttle(
  (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => {
    const mid = Math.round((visibleStartIndex + visibleEndIndex) / 2);
    mainShadowOffset.value = Math.max(0, mid - Math.round(props.mainShadowCount / 2));
  },
  250,
);

const headerItem = computed(() => (
  Object.fromEntries(props.columns.map((column) => [column.fieldName, column.label]))
));

const headerOptions = computed(() => props.columns.map((column) => {
  const opt: CellOptionsInternal = { nullHandler: 'null-null', redrawColumn: () => null } as CellOptionsInternal;
  opt[gridIdOption] = gridId;
  opt[columnNameOption] = column.fieldName;
  opt[columnIdOption] = Symbol('grid-column-header');

  gridColumnCreate(gridId, 'plain', opt);
  return { ...column, renderer: 'plain', rendererOptions: opt };
}));

const headerRef = ref();
const headerHeight = ref(0);

function calcHeaderHeight() {
  if (headerRef.value) headerHeight.value = headerRef.value.scrollHeight;
}

onUpdated(() => calcHeaderHeight());
onMounted(() => calcHeaderHeight());

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
