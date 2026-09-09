<template>
  <div
    ref="headerRef"
    class="df-grid header-container"
    :style="{
      'overflow-x': 'hidden',
      'overflow-y': 'hidden',
      minHeight: `${headerHeight}px`,
    }"
  >
    <!-- Header row -->
    <slot name="header" :item="headerItem">
      <grid-card
        :item="headerItem"
        :columns="headerOptions"
        :renderers="DefaultRenderers"
        :class="['df-grid', 'card', 'header', 'df-record-grid', 'df-unanchored', gridClass]"
        :style="headerRowBaseVars(rowsPerRecord)"
        data-pk="header"
        data-idx="header"
      />
    </slot>

    <!-- Filter row -->
    <div
      v-if="showFilterRow"
      class="df-grid card filter-row df-record-grid df-unanchored"
      data-section="filter"
      :class="gridClass"
      :style="headerRowBaseVars(rowsPerRecord)"
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
            :placeholder="getFilterableConfig(column)?.placeholder ?? filterPlaceholder(column)"
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
            :placeholder="getFilterableConfig(column)?.placeholder ?? filterPlaceholder(column)"
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
            :placeholder="getFilterableConfig(column)?.placeholder ?? filterPlaceholder(column)"
            :input-type="getFilterableConfig(column)!.fieldType === 'number' ? 'number' : 'text'"
            :density="filterInputDensity"
            :passthrough-attrs="getFilterableConfig(column)!.fieldType === 'number' ? { controlVariant: 'hidden' } : {}"
          />
        </template>
      </div>
    </div>

    <!-- Status bar -->
    <div
      v-if="showStatusBar || isSelectionActive"
      class="df-status-bar"
      data-section="status-bar"
      :class="{ 'selection-bar': isSelectionActive }"
    >
      <template v-if="isSelectionActive">
        <div class="selection-bar-left">
          <cached-icon
            name="mdi-close"
            class="selection-icon"
            :title="translatableStrings.CancelSelectionMode"
            @click="emit('cancel-selection')"
          />
          <span class="selection-count">{{ selectionCountText }}</span>
          <cached-icon
            name="mdi-shuffle"
            class="selection-icon"
            :title="translatableStrings.InvertSelection"
            @click="emit('invert-selection')"
          />
        </div>
        <div class="selection-group-actions">
          <slot name="groupActions" />
        </div>
      </template>
      <template v-else>
        <slot name="statusBar" :filter-state="filterState">
          <div class="status-section">{{ activeFiltersText }}</div>
        </slot>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { interpolate } from '@dynamicforms/translatable';
import { DfCheckbox, DfDateTime, DfInput, DfSelect, FieldDensity } from '@dynamicforms/vuetify-inputs';
import { computed, onMounted, onUpdated, ref, watch } from 'vue';
import { CachedIcon } from 'vue-cached-icon';

import { DefaultRenderers, gridColumnCreate, RendererOptionsMap } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { ColumnDefinition } from './columns';
import { FilterState, getFilterConfig } from './columns-filtering';
import { getSortConfig, type ColumnSortState, type SortState } from './columns-sorting';
import { GridCard, headerRowBaseVars, useHeaderContent } from './helpers';
import type { SelectionMode } from './selection';
import { translatableStrings } from './translations';

const filterInputDensity = ref<FieldDensity>('inline');

type CssClassTypes = string | string[] | Record<string, boolean>;
type CssClasses = CssClassTypes | CssClassTypes[];

export interface HeaderProps {
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  gridId: symbol;
  gridClass: CssClasses;
  rowsPerRecord?: number;
  sortState: SortState;
  showFilterRow?: boolean;
  showStatusBar?: boolean;
  filterState?: FilterState;
  selectionMode?: SelectionMode;
  selectionKeys?: Set<any>;
  /**
   * The body grid's own resolved `grid-template-columns`, forwarded from df-grid.vue purely as a
   * change signal — the actual column widths reach this component's cells via the
   * `--grid-template-columns` CSS custom property (inherited from the container), not this prop's
   * value. Watched below so `calcHeaderHeight()` re-measures once the body grid publishes its
   * real column widths: that CSS var change alone is invisible to Vue's reactivity, so without
   * this prop nothing would re-trigger a remeasure if the first one landed before the widths were
   * ready, leaving `headerHeight` stuck at whatever (possibly inflated, wrongly-wrapped) value it
   * measured then.
   */
  templateColumns?: string;
}

const props = withDefaults(defineProps<HeaderProps>(), {
  rowsPerRecord: 1,
  filterState: undefined,
  selectionMode: null,
  selectionKeys: undefined,
  templateColumns: undefined,
});
const emit = defineEmits<{ 'cancel-selection': []; 'invert-selection': [] }>();

const headerItem = computed(() => Object.fromEntries(props.columns.map((column) => [column.fieldName, column.label])));

const headerOptions = computed(() =>
  props.columns.map((column) => {
    const srtIdx = props.sortState.findIndex((ssi) => ssi.columnName === column.fieldName);
    const srt = srtIdx === -1 ? null : props.sortState[srtIdx];
    const singleSegment = props.sortState.length === 1;
    const sortState: ColumnSortState = {
      index: srtIdx === -1 ? undefined : srtIdx + (singleSegment ? 0 : 1),
      sortable: getSortConfig(column.sortable).direction != null,
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
  }),
);

const headerRef = ref();
const headerHeight = ref(0);

const { setHeaderContent } = useHeaderContent();

function getFilterableConfig(column: ColumnDefinition<keyof RendererOptionsMap>) {
  const config = getFilterConfig((column as any).filterable);
  return config.fieldType || config.choices ? config : null;
}

function filterPlaceholder(column: ColumnDefinition<keyof RendererOptionsMap>) {
  return interpolate(translatableStrings.FilterColumn, { column: column.label });
}

const isSelectionActive = computed(() => props.selectionMode != null && props.selectionMode !== 'non-select');

const selectionCountText = computed(() => {
  const count = props.selectionKeys?.size ?? 0;
  const key = props.selectionMode === 'selection' ? 'SelectionCountSelected' : 'SelectionCountExcluded';
  return interpolate(translatableStrings[key], { count });
});

const activeFilterCount = computed(() => {
  if (!props.filterState) return 0;
  const filterValues = props.filterState.value;
  if (!filterValues) return 0;
  return Object.values(filterValues).filter((v) => v != null && v !== '' && v !== undefined).length;
});

const activeFiltersText = computed(() =>
  interpolate(translatableStrings.ActiveFilters, { count: activeFilterCount.value }),
);

// A settle chain (below) writes headerHeight.value on every attempt, which re-renders the
// component (it drives the template's own `minHeight` binding) and fires onUpdated() again —
// without a guard, that re-entrant call would start its OWN settle chain on top of the one
// already running, doubling on every attempt. `isSettling` makes an onUpdated() firing caused by
// our own retries a no-op instead, bounding total work to the one chain already in flight.
let isSettling = false;

function measureHeaderHeightOnce(): number | null {
  if (!headerRef.value) return null;
  headerRef.value.style.minHeight = 'auto';
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  headerRef.value.offsetHeight; // force recalc layout (desktop browsers don't need this)
  const measured = headerRef.value.scrollHeight;
  headerHeight.value = measured;
  headerRef.value.style.minHeight = `${measured}px`;
  return measured;
}

// The filter row's own inputs (Vuetify components) can still be mid-layout at the exact
// synchronous point calcHeaderHeight() runs at, even after the forced reflow above — a reading
// taken then is typically too tall, and nothing else re-measures afterwards, so it would
// otherwise stay locked into `min-height` indefinitely. Retries once per frame until two
// consecutive readings agree, bounded so a genuinely still-changing layout (rather than a
// transient one) can't spin this forever.
function settleHeaderHeight(previous: number | null, attemptsLeft: number) {
  const measured = measureHeaderHeightOnce();
  if (measured !== null && measured !== previous && attemptsLeft > 0) {
    requestAnimationFrame(() => settleHeaderHeight(measured, attemptsLeft - 1));
    return;
  }
  isSettling = false;
}

function calcHeaderHeight() {
  if (!headerRef.value) return;
  // Always relays the current header content, even while a settle chain (below) is already in
  // flight — this is a different consumer (the shadow grid's own layout measurement) than the
  // height settling below, and skipping it here would leave that consumer looking at stale
  // content for the whole settle window instead of just deferring the height remeasure.
  setHeaderContent(Array.from(headerRef.value.children[0].children));
  if (isSettling) return;
  isSettling = true;
  const measured = measureHeaderHeightOnce();
  requestAnimationFrame(() => settleHeaderHeight(measured, 10));
}

onUpdated(() => calcHeaderHeight());
onMounted(() => calcHeaderHeight());
watch(
  () => props.templateColumns,
  () => calcHeaderHeight(),
);

defineExpose({ headerItem, headerOptions, headerHeight });
</script>

<style scoped>
.df-grid.header-container {
  display: flex;
  flex-direction: column;
  /*
   * The width the body scroller reserves for its vertical scrollbar, measured by df-grid and
   * published as a custom property. The header scrolls with nothing of its own, so it has to
   * step aside by exactly that much to stay aligned with the body columns. `scrollbar-gutter:
   * stable` cannot do this: with overlay scrollbars Chromium still reserves the classic width
   * while the body reserves none.
   */
  padding-right: var(--df-grid-scrollbar-width, 0px);
}
:deep(.df-grid.card.header .df-grid.cell) {
  user-select: none;
}
/*
 * Elsewhere `.content` grows to fill the cell (renderers.ts), pinning a post element to the far
 * right edge. In the header that stretch put the sort indicator so far from its column's label
 * that neighbouring columns read as one block. Here it only takes the width it needs, so the
 * indicator sits right after the label instead of at the cell boundary.
 */
:deep(.df-grid.card.header .df-grid.cell.has-pre-post > .content) {
  flex: 0 1 auto;
}

.df-grid.cell.filter-cell {
  padding: 0.25em;
}

.df-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.selection-bar-left {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.selection-icon {
  cursor: pointer;
  opacity: 0.7;
  transition:
    background-color 0.15s,
    opacity 0.15s;
  margin-top: -0.4em;
}

.selection-icon:hover {
  background-color: rgba(0, 0, 0, 0.08);
  opacity: 1;
}

.selection-count {
  font-weight: 500;
}

.selection-group-actions {
  display: flex;
  align-items: center;
  gap: 0.25em;
  margin-left: auto;
}

.filter-cell :deep(.v-checkbox-btn) {
  justify-content: center;
  min-height: unset;
}

.filter-cell :deep(.v-field) {
  font-size: 0.85em;
}
</style>
