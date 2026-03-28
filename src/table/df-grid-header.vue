<template>
  <div
    ref="headerRef"
    class="df-grid header-container"
    :style="{
      'overflow-x': 'hidden',
      'overflow-y': 'hidden',
      'scrollbar-gutter': 'stable',
      minHeight: `${headerHeight}px`,
    }"
  >
    <!-- Header row -->
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

    <!-- Filter row -->
    <div
      v-if="showFilterRow"
      class="df-grid card filter-row"
      :class="gridClass"
    >
      <div
        v-for="column in columns"
        :key="column.fieldName"
        :class="['df-grid', 'cell', 'filter-cell', column.fieldName, column.cssClass ?? '']"
      >
        <template v-if="getFilterableConfig(column)">
          <!-- df-select for choices -->
          <df-select
            v-if="getFilterableConfig(column)!.choices"
            :control="filterState!.fields[column.fieldName]"
            :choices="getFilterableConfig(column)!.choices"
            :placeholder="getFilterableConfig(column)?.placeholder ?? `Filter ${column.label}...`"
            :clearable="true"
            :allow-null="true"
            :multiple="true"
            :density="filterInputDensity"
            @focusout="calcHeaderHeight()"
          />
          <!-- df-datetime for date type -->
          <df-date-time
            v-else-if="getFilterableConfig(column)!.fieldType === 'date'"
            :control="filterState!.fields[column.fieldName]"
            :placeholder="getFilterableConfig(column)?.placeholder ?? `Filter ${column.label}...`"
            :clearable="true"
            input-type="date"
            :density="filterInputDensity"
          />
          <!-- df-checkbox for boolean type -->
          <df-checkbox
            v-else-if="getFilterableConfig(column)!.fieldType === 'boolean'"
            :control="filterState!.fields[column.fieldName]"
            :label="getFilterableConfig(column)?.placeholder ?? ''"
            :allow-null="true"
            :density="filterInputDensity"
          />
          <!-- df-input for other types (string, number) -->
          <df-input
            v-else
            :control="filterState!.fields[column.fieldName]"
            :placeholder="getFilterableConfig(column)?.placeholder ?? `Filter ${column.label}...`"
            :input-type="getFilterableConfig(column)!.fieldType === 'number' ? 'number' : 'text'"
            :density="filterInputDensity"
            :passthrough-attrs="getFilterableConfig(column)!.fieldType === 'number' ? { controlVariant: 'hidden' } : {}"
          />
        </template>
      </div>
    </div>

    <!-- Status bar -->
    <div
      v-if="showStatusBar"
      class="df-status-bar"
    >
      <slot name="statusBar" :filter-state="filterState">
        <div class="status-section">
          Active filters: {{ activeFilterCount }}
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DfCheckbox, DfDateTime, DfInput, DfSelect, FieldDensity } from '@dynamicforms/vuetify-inputs';
import { isBoolean } from 'lodash-es';
import { computed, onMounted, onUpdated, ref } from 'vue';

import { DefaultRenderers, gridColumnCreate, RendererOptionsMap } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { ColumnDefinition } from './columns';
import { FilterState, getFilterConfig } from './columns-filtering';
import type { ColumnSortState, SortState } from './columns-sorting';
import { GridCard, useHeaderContent } from './helpers';

const filterInputDensity = ref<FieldDensity>('inline');

type CssClassTypes = string | string[] | Record<string, boolean>;
type CssClasses = CssClassTypes | CssClassTypes[];

interface HeaderProps {
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  gridId: symbol;
  gridClass: CssClasses;
  sortState: SortState;
  showFilterRow?: boolean;
  showStatusBar?: boolean;
  filterState?: FilterState;
}

const props = defineProps<HeaderProps>();

const headerItem = computed(() => (
  Object.fromEntries(props.columns.map((column) => [column.fieldName, column.label]))
));

const headerOptions = computed(() => props.columns.map((column) => {
  const srtIdx = props.sortState.findIndex((ssi) => ssi.columnName === column.fieldName);
  const srt = srtIdx === -1 ? null : props.sortState[srtIdx];
  const singleSegment = props.sortState.length === 1;
  const sortState: ColumnSortState = {
    index: srtIdx === -1 ? undefined : srtIdx + (singleSegment ? 0 : 1),
    sortable: isBoolean(column.sortable) ? column.sortable : column.sortable?.direction !== undefined,
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

function getFilterableConfig(column: ColumnDefinition<keyof RendererOptionsMap>) {
  const config = getFilterConfig((column as any).filterable);
  return (config.fieldType || config.choices) ? config : null;
}

const activeFilterCount = computed(() => {
  if (!props.filterState) return 0;
  const filterValues = props.filterState.value;
  if (!filterValues) return 0;
  return Object.values(filterValues).filter((v) => v != null && v !== '' && v !== undefined).length;
});

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

<style scoped>
.df-grid.header-container {
  display: flex;
  flex-direction: column;
}
:deep(.df-grid.card.header .df-grid.cell) {
  user-select: none;
}

.df-grid.cell.filter-cell {
  padding: 0.25em;
}

.df-status-bar {
  display: flex;
  justify-content: space-between;
  padding: 0.5em;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background-color: rgba(0, 0, 0, 0.02);
  font-size: 0.85em;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.filter-cell :deep(.v-checkbox-btn) {
  justify-content: center;
  min-height: unset;
}

.filter-cell :deep(.v-field) {
  font-size: 0.85em;
}
</style>
