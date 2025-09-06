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
        :size-dependencies="[]"
        :data-index="index"
        class="dynamic-scroller-item"
      >
        <grid-card
          :item="renderItem(item)"
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
import { ref } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';

import { ShadowGrid } from './helpers';
import GridCard from './grid-card.vue';

interface GridProps {
  records: Record<string, any>[];
  height: string | number;
  keyField: string;
  mainShadowCount?: number;
}

const props = withDefaults(defineProps<GridProps>(), { mainShadowCount: 100 });

const mainShadowOffset = ref(0);
const templateColumns = ref('');

const updateRenderedRows = throttle(
  (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => {
    const mid = Math.round((visibleStartIndex + visibleEndIndex) / 2);
    mainShadowOffset.value = Math.max(0, mid - Math.round(props.mainShadowCount / 2));
  },
  250,
);

function renderItem(item: Record<string, any>) {
  return item;
}
</script>

<style scoped>
.df-grid.container {
  position: relative;
}
.dynamic-scroller-item {
  /* itemi morajo biti position: absolute, drugače je med njimi dvojni spacing */
  position:absolute;
  left: 0;
  right: 0;
}
</style>
