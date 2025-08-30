<template>
  <div class="df-grid container">
    <dynamic-scroller
      v-slot="{ item, index, active }"
      class="cards-grid"
      :items="records"
      :min-item-size="30"
      :key-field="keyField"
      :buffer="1000"
      :emit-update="true"
      :style="`height: ${height}; overflow-y: auto`"
      @update="updateRenderedRows"
    >
      <dynamic-scroller-item
        :item="item"
        :active="active"
        :size-dependencies="[item.message]"
        :data-index="index"
        class="dynamic-scroller-item"
      >
        <table-card :item="item" :style="`${templateColumns}`"/>
      </dynamic-scroller-item>
    </dynamic-scroller>
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
  </div>
</template>

<script setup lang="ts">
import { throttle } from 'lodash-es';
import { nextTick, ref } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';

import TableCard from './table-card.vue';

interface GridProps {
  records: Record<string, any>[];
  height: string | number;
  keyField: string;
  shadowCount?: number;
}

const props = withDefaults(defineProps<GridProps>(), { shadowCount: 100 });

const visibleItemsStart = ref(0);
const visibleItemsCount = ref(0);
const shadowGridRef = ref();
const templateColumns = ref('');

function checkShadowGridColumns() {
  if (!shadowGridRef.value) return;

  const computedStyle = window.getComputedStyle(shadowGridRef.value);
  // const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));
  templateColumns.value = `grid-template-columns: ${computedStyle.getPropertyValue('grid-template-columns')}`;
}

function* idxAndItem() {
  nextTick(() => checkShadowGridColumns());
  for (let i = 0; i < visibleItemsCount.value; i++) {
    const itm = props.records[i + visibleItemsStart.value];
    yield { item: itm, field: 'df-grid-card-break-item' };
    for (const idx of Object.keys(itm)) {
      yield { item: itm, field: idx as keyof typeof itm };
    }
  }
}

const updateRenderedRows = throttle(
  (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => {
    const mid = Math.round((visibleStartIndex + visibleEndIndex) / 2);
    visibleItemsStart.value = Math.max(0, mid - Math.round(props.shadowCount / 2));
    visibleItemsCount.value = props.shadowCount;
  },
  250,
);

</script>

<style scoped>
.df-grid.container {
  position: relative;
}
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
.dynamic-scroller-item {
  /* itemi morajo biti position: absolute, drugače je med njimi dvojni spacing */
  position:absolute;
  left: 0;
  right: 0;
}
:deep(.df-grid.cell.df-grid-card-break-item) {
  grid-column: 1 / -1;
}
</style>
