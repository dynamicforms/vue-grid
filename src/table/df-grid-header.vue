<template>
  <div
    ref="headerRef"
    class="df-grid header"
    :style="{
      'overflow-y': 'hidden',
      'scrollbar-gutter': 'stable',
      minHeight: `${headerHeight}px`,
    }"
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
</template>

<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue';

import { DefaultRenderers, RendererOptionsMap, gridColumnCreate } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { ColumnDefinition } from './columns';
import { GridCard } from './helpers';

interface HeaderProps {
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  gridId: symbol;
  templateColumns: string;
}

const props = defineProps<HeaderProps>();

const headerItem = computed(() => (
  Object.fromEntries(props.columns.map((column) => [column.fieldName, column.label]))
));

const headerOptions = computed(() => props.columns.map((column) => {
  const opt: CellOptionsInternal = { nullHandler: 'null-null', redrawColumn: () => null } as CellOptionsInternal;
  opt[gridIdOption] = props.gridId;
  opt[columnNameOption] = column.fieldName;
  opt[columnIdOption] = Symbol('grid-column-header');

  gridColumnCreate(props.gridId, 'plain', opt);
  return { ...column, renderer: 'plain', rendererOptions: opt };
}));

const headerRef = ref();
const headerHeight = ref(0);

function calcHeaderHeight() {
  if (headerRef.value) {
    headerRef.value.style.minHeight = 'auto';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    headerRef.value.offsetHeight; // force recalc layout (desktop browsers don't need this)
    headerHeight.value = headerRef.value.scrollHeight;
    headerRef.value.style.minHeight = `${headerHeight.value}px`;
  }
}

onUpdated(() => calcHeaderHeight());
onMounted(() => calcHeaderHeight());

defineExpose({ headerItem, headerOptions, headerHeight });
</script>
