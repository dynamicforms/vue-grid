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
    <slot name="header" :item="headerItem" :row-attrs="headerRowAttrs" :cell-attrs="columnHeaderCellAttrs">
      <grid-card
        v-bind="headerRowAttrs"
        :item="headerItem"
        :columns="headerOptions"
        :renderers="DefaultRenderers"
        :cell-attrs="columnHeaderCellAttrs"
        :class="['df-grid', 'card', 'header', 'df-record-grid', 'df-unanchored', gridClass]"
        :style="headerRowBaseVars(rowsPerRecord)"
        data-pk="header"
        data-idx="header"
      />
    </slot>

    <!-- Filter row -->
    <div
      v-if="showFilterRow"
      :id="domId ? filterRowDomId(domId) : undefined"
      class="df-grid card filter-row df-record-grid df-unanchored"
      role="row"
      aria-rowindex="2"
      data-section="filter"
      :class="gridClass"
      :style="headerRowBaseVars(rowsPerRecord)"
    >
      <div
        v-for="column in columns"
        :key="column.fieldName"
        :class="['df-grid', 'cell', 'filter-cell', column.fieldName, column.cssClass ?? '']"
        role="cell"
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
            :passthrough-attrs="filterAttrs[column.fieldName]"
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
            :passthrough-attrs="filterAttrs[column.fieldName]"
          />
          <!-- df-checkbox for boolean type -->
          <df-checkbox
            v-else-if="getFilterableConfig(column)!.fieldType === 'boolean'"
            :control="filterState!.fields[column.fieldName]"
            :label="getFilterableConfig(column)?.placeholder ?? ''"
            :allow-null="true"
            :density="filterInputDensity"
            :passthrough-attrs="filterAttrs[column.fieldName]"
          />
          <!-- df-input for other types (string, number) -->
          <df-input
            v-else
            :control="filterState!.fields[column.fieldName]"
            :placeholder="getFilterableConfig(column)?.placeholder ?? filterPlaceholder(column)"
            :input-type="getFilterableConfig(column)!.fieldType === 'number' ? 'number' : 'text'"
            :density="filterInputDensity"
            :passthrough-attrs="filterAttrs[column.fieldName]"
          />
        </template>
      </div>
    </div>

    <!-- Status bar -->
    <div
      v-if="showStatusBar || isSelectionActive"
      class="df-status-bar"
      data-section="status-bar"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      :class="{ 'selection-bar': isSelectionActive }"
    >
      <template v-if="isSelectionActive">
        <div class="selection-bar-left">
          <cached-icon
            name="mdi-close"
            class="selection-icon"
            role="button"
            tabindex="0"
            :title="translate('CancelSelectionMode')"
            :aria-label="translate('CancelSelectionMode')"
            @click="emit('cancel-selection')"
            @keydown.enter.space.prevent="(e: KeyboardEvent) => !e.repeat && emit('cancel-selection')"
          />
          <span class="selection-count">{{ selectionCountText }}</span>
          <cached-icon
            name="mdi-shuffle"
            class="selection-icon"
            role="button"
            tabindex="0"
            :title="translate('InvertSelection')"
            :aria-label="translate('InvertSelection')"
            @click="emit('invert-selection')"
            @keydown.enter.space.prevent="(e: KeyboardEvent) => !e.repeat && emit('invert-selection')"
          />
        </div>
        <div class="selection-group-actions">
          <slot name="groupActions" />
        </div>
      </template>
      <template v-else>
        <slot name="statusBar" :filter-state="filterState" :view="view" :record-count="recordCount">
          <div class="status-section">{{ activeFiltersText }}</div>
          <div v-if="recordCountText" class="status-section">{{ recordCountText }}</div>
        </slot>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DfCheckbox, DfDateTime, DfInput, DfSelect, FieldDensity } from '@dynamicforms/vuetify-inputs';
import { computed, onMounted, onUpdated, ref, watch } from 'vue';
import { CachedIcon } from 'vue-cached-icon';

import { DefaultRenderers, gridColumnCreate, RendererOptionsMap } from './cell-renderers';
import { ariaSortStateOption } from './cell-renderers/header-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { ColumnDefinition, columnLabel, columnLabelText, type ColumnLabels } from './columns';
import { FilterState, getFilterConfig } from './columns-filtering';
import { getSortConfig, type ColumnSortState, type SortState } from './columns-sorting';
import type { GridRecordCount } from './df-grid-types';
import { GridCard, headerRowBaseVars, useHeaderContent } from './helpers';
import { columnHeaderCellAttrs, filterRowDomId, headerRowDomId } from './helpers/aria';
import type { SelectionMode } from './selection';
import { translate } from './translations';
import type { GridViewState } from './use-view-change';

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
  view?: GridViewState;
  recordCount?: GridRecordCount;
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
  /** Prefix of the header row's and the filter row's element ids, which the grid's table refers to in `aria-owns`. */
  domId?: string;
}

const props = withDefaults(defineProps<HeaderProps>(), {
  rowsPerRecord: 1,
  filterState: undefined,
  view: undefined,
  recordCount: undefined,
  selectionMode: null,
  selectionKeys: undefined,
  templateColumns: undefined,
  domId: undefined,
});
const emit = defineEmits<{ 'cancel-selection': []; 'invert-selection': [] }>();

// a function label is called here, so a change of what it reads renders the header again
const headerItem = computed((): ColumnLabels =>
  Object.fromEntries(props.columns.map((column) => [column.fieldName, columnLabel(column)])),
);

const headerRowAttrs = computed(() => ({
  id: props.domId ? headerRowDomId(props.domId) : undefined,
  role: 'row',
  'aria-rowindex': 1,
}));

type HeaderColumn = ColumnDefinition<keyof RendererOptionsMap> & { sortState: ColumnSortState };

function columnSortState(sort: SortState, column: ColumnDefinition<keyof RendererOptionsMap>): ColumnSortState {
  const srtIdx = sort.findIndex((ssi) => ssi.columnName === column.fieldName);
  return {
    index: srtIdx === -1 ? undefined : srtIdx + (sort.length === 1 ? 0 : 1),
    sortable: getSortConfig(column.sortable).direction != null,
    direction: srtIdx === -1 ? undefined : sort[srtIdx].direction,
  };
}

// the sort entries the grid applies: those naming a sortable column in a direction the column allows
const appliedSortState = computed((): SortState =>
  props.sortState.filter((ssi) => {
    const column = props.columns.find((c) => c.fieldName === ssi.columnName);
    const direction = column ? getSortConfig(column.sortable).direction : undefined;
    return direction != null && (direction === 'both' || direction === ssi.direction);
  }),
);

const headerOptions = computed((): HeaderColumn[] =>
  props.columns.map((column) => {
    const sortState = columnSortState(props.sortState, column);

    const opt: CellOptionsInternal = {
      nullHandler: 'null-null',
      redrawColumn: () => null,
      sortState,
      [ariaSortStateOption]: columnSortState(appliedSortState.value, column),
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

/**
 * The passthrough attrs of each column's filter input, by field name: the accessible name, with `aria-labelledby`
 * cleared so the name is not taken from the input's (empty) field label, and hidden controls of a number input.
 * Each object keeps its identity until a column or the locale changes, so the filter inputs do not re-render with
 * the header.
 */
const filterAttrs = computed((): Record<string, Readonly<Record<string, unknown>>> =>
  Object.fromEntries(
    props.columns.map((column) => {
      const config = getFilterableConfig(column);
      const numberInput = !config?.choices && config?.fieldType === 'number';
      const filterName = translate('FilterColumnName', { column: columnLabelText(column) });
      // the checkbox shows the placeholder as its visible label: the name starts with it (WCAG 2.5.3)
      const visibleLabel = !config?.choices && config?.fieldType === 'boolean' ? config.placeholder : undefined;
      const attrs = {
        'aria-label': visibleLabel ? `${visibleLabel}, ${filterName}` : filterName,
        'aria-labelledby': undefined,
        ...(numberInput ? { controlVariant: 'hidden' } : {}),
      };
      return [column.fieldName, Object.freeze(attrs)];
    }),
  ),
);

function filterPlaceholder(column: ColumnDefinition<keyof RendererOptionsMap>) {
  return translate('FilterColumn', { column: columnLabelText(column) });
}

const isSelectionActive = computed(() => props.selectionMode != null && props.selectionMode !== 'non-select');

const selectionCountText = computed(() => {
  const count = props.selectionKeys?.size ?? 0;
  const key = props.selectionMode === 'selection' ? 'SelectionCountSelected' : 'SelectionCountExcluded';
  return translate(key, { count });
});

const activeFilterCount = computed(() => {
  if (!props.filterState) return 0;
  return Object.values(props.filterState.value).filter((v) => v != null && v !== '' && v !== undefined).length;
});

const activeFiltersText = computed(() => translate('ActiveFilters', { count: activeFilterCount.value }));

const recordCountText = computed(() => {
  const { recordCount, view } = props;
  if (recordCount) {
    if (recordCount.total == null) return translate('RecordCount', { count: recordCount.matching });
    return translate('RecordCountOfTotal', { count: recordCount.matching, total: recordCount.total });
  }
  if (!view) return '';
  if (!view.filteringLocal) return translate('RecordCount', { count: view.loadedCount });
  return translate('RecordCountOfTotal', { count: view.shownCount, total: view.loadedCount });
});

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
/*
 * A header cell is a flex row, so `text-align` does not move its label and sorting indicator. The
 * alignment classes a column's `cssClass` can carry are mapped onto the row instead.
 */
:deep(.df-grid.card.header .df-grid.cell.has-pre-post:is(.text-right, .text-end)) {
  justify-content: flex-end;
}
:deep(.df-grid.card.header .df-grid.cell.has-pre-post.text-center) {
  justify-content: center;
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

@media (prefers-reduced-motion: reduce) {
  .selection-icon {
    transition: none;
  }
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
