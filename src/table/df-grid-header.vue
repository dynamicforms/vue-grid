<template>
  <div
    ref="headerRef"
    class="df-grid header"
    :style="{
      'overflow-x': 'hidden',
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
        :class="['df-grid', 'card', 'header', gridClass]"
        data-pk="header"
        data-idx="header"
      />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { isBoolean } from 'lodash-es';
import { computed, onMounted, onUpdated, ref } from 'vue';

import { DefaultRenderers, gridColumnCreate, RendererOptionsMap } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { ColumnDefinition } from './columns';
import type { ColumnSortState, SortState } from './columns-sorting';
import { GridCard, useHeaderContent } from './helpers';

type CssClassTypes = string | string[] | Record<string, boolean>;
type CssClasses = CssClassTypes | CssClassTypes[];

interface HeaderProps {
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  gridId: symbol;
  gridClass: CssClasses;
  sortState: SortState;
}

const props = defineProps<HeaderProps>();

const headerItem = computed(() => (
  Object.fromEntries(props.columns.map((column) => [column.fieldName, column.label]))
));

const headerOptions = computed(() => props.columns.map((column) => {
  const srtIdx = props.sortState.findIndex((ssi) => ssi.columnName === column.fieldName);
  const srt = srtIdx === -1 ? null : props.sortState[srtIdx];
  const sortState: ColumnSortState = {
    index: srtIdx === -1 ? undefined : srtIdx,
    sortable: isBoolean(column.sortable) ? column.sortable : column.sortable.direction !== undefined,
    direction: srt?.direction,
  };

  const opt: CellOptionsInternal = {
    nullHandler: 'null-null',
    redrawColumn: () => null,
    sortState,
    [gridIdOption]: props.gridId,
    [columnNameOption]: column.fieldName,
    [columnIdOption]: Symbol('grid-column-header'),
  } as CellOptionsInternal;

  gridColumnCreate(props.gridId, 'header' as keyof RendererOptionsMap, opt);
  return { ...column, renderer: 'header' as keyof RendererOptionsMap, rendererOptions: opt, sortState };
}));

const headerRef = ref();
const headerHeight = ref(0);

const { setHeaderContent } = useHeaderContent();

function calcHeaderHeight() {
  if (headerRef.value) {
    setHeaderContent(Array.from(headerRef.value.children[0].children));
    // headerRef.value.children[0].innerHTML;
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
