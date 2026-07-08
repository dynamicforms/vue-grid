<template>
  <div
    ref="containerRef"
    v-longpress="($event) => processMouse('longpress', $event)"
    class="df-grid container d-flex flex-column"
    :class="{ selection: isSelectionActive, exclusion: uSelection.selectionMode.value === 'exclusion' }"
    :style="`--${templateColumns}`"
    @mousedown="($event) => { if ($event.shiftKey && !props.recentlyAdded?.isAdding.value) $event.preventDefault(); }"
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void (0)"
  >
    <div v-if="$slots['toolbar-start'] || $slots['toolbar-end']" class="df-grid-toolbar" data-section="toolbar">
      <slot name="toolbar-start"/>
      <slot name="toolbar-end"/>
    </div>
    <df-grid-header
      ref="headerRef"
      data-section="header"
      :columns="uColumns.columns.value"
      :grid-id="gridId"
      :template-columns="templateColumns"
      :grid-class="uColumns.cssClass.value"
      :sort-state="sortState"
      :show-filter-row="showFilterRow"
      :show-status-bar="showStatusBar"
      :filter-state="filterState"
      :selection-mode="uSelection.selectionMode.value"
      :selection-keys="uSelection.selectionKeys.value"
      @cancel-selection="uSelection.clearSelection()"
      @invert-selection="uSelection.invertMode()"
    >
      <template #header="headerSlotProps"><slot name="header" v-bind="headerSlotProps"/></template>
      <template #statusBar="statusBarProps"><slot name="statusBar" v-bind="statusBarProps"/></template>
      <template #groupActions><slot name="groupActions"/></template>
    </df-grid-header>
    <div class="df-grid-body">
      <virtual-scroll
        ref="vsRef"
        class="cards-grid"
        data-section="body"
        :items="sortedRecords"
        :loading="loading"
        :default-item-size="30"
        :buffer-before="30"
        :buffer-after="30"
        @visible-range-change="updateRenderedRows"
        @load="(direction) => emit('load', direction)"
      >
        <template #item="{ item, index }">
          <div class="df-grid dynamic-scroller-item">
            <slot name="item" :item="item" :index="index" :active="true">
              <grid-card
                :item="item"
                :columns="columnRendererOptionsInternal"
                :renderers="DefaultRenderers"
                :class="[
                  uColumns.cssClass.value,
                  props.rowClass?.(item, index),
                  isSelectionActive ? (uSelection.isSelected(item[props.keyField]) ? 'selected' : 'unselected') : null,
                  props.recentlyAdded?.isPendingAdd(item[props.keyField]) ? 'state-adding' : null,
                ]"
                :data-pk="item[keyField]"
                :data-idx="index"
              />
            </slot>
          </div>
        </template>
        <template #header>
          <excessive-scroll :height="-excessiveScrollAmount" direction="top"/>
        </template>
        <template #footer>
          <div
            v-if="showSummaryBar || loading || !props.records.length"
            class="df-summary-bar"
            data-section="summary-bar"
          >
            <slot name="summary-bar">
              <div v-if="loading" class="df-summary-loading">
                <slot name="loading">
                  <cached-icon name="mdi-loading" class="df-summary-spin"/>
                  <span>Loading…</span>
                </slot>
              </div>
              <div v-else-if="!props.records.length" class="df-summary-no-data">
                <slot name="no-data">
                  <cached-icon name="mdi-database-off"/>
                  <span>No data</span>
                </slot>
              </div>
            </slot>
          </div>
          <excessive-scroll :height="excessiveScrollAmount" direction="bottom"/>
        </template>
      </virtual-scroll>
      <template v-if="props.recentlyAdded">
        <incoming-arc
          direction="top"
          :trigger="props.recentlyAdded.topArcFlashTick.value"
          :max-opacity="props.incomingArcMaxOpacity ?? 1"
        >
          <!--
          Pass named slot only when the consumer provided it; a falsy v-if renders a
          Comment VNode which Vue's ensureValidVNode treats as empty — triggering the
          incoming-arc fallback wave instead of a blank slot.
          -->
          <slot v-if="$slots['incoming-arc-top']" name="incoming-arc-top"/>
        </incoming-arc>
        <incoming-arc
          direction="bottom"
          :trigger="props.recentlyAdded.bottomArcFlashTick.value"
          :max-opacity="props.incomingArcMaxOpacity ?? 1"
        >
          <slot v-if="$slots['incoming-arc-bottom']" name="incoming-arc-bottom"/>
        </incoming-arc>
      </template>
    </div>
    <div v-if="$slots['footer-start'] || $slots['footer-end']" class="df-grid-footer" data-section="footer">
      <slot name="footer-start"/>
      <slot name="footer-end"/>
    </div>
    <shadow-grid
      ref="shadowRef"
      :records="sortedRecords"
      :columns="columnRendererOptionsInternal"
      :renderers="DefaultRenderers"
      :count="mainShadowCount!"
      :offset="mainShadowOffset"
      :class="uColumns.cssClass.value"
      :key-field="keyField"
      :selection-active="isSelectionActive"
      @onmeasure="(event) => doShadowMeasure(event)"
    />
    <div v-for="colsDef in uColumns.builtColumns.value" :key="colsDef.name">
      <!--
      we only render secondary shadows once (v-if="!shadowMeasurements[colsDef.name]") to get ballpark width figures.
      This will cause issues when switching among the dynamic layouts because the initial render might have been
      too narrow. This may be mitigated by increasing secondaryShadowCount
      -->
      <shadow-grid
        v-if="!shadowMeasurements[colsDef.name]"
        style="right: auto"

        :records="sortedRecords"
        :columns="colsDef.columnRenderOptsInternal.value"
        :renderers="DefaultRenderers"
        :count="secondaryShadowCount!"
        :offset="secondaryShadowOffset"
        :class="colsDef.cssClass"
        :key-field="keyField"
        @onmeasure="(event) => shadowMeasurements[colsDef.name] = event.totalWidth"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VirtualScroll } from '@pdanpdan/virtual-scroll';
import { keys, maxBy, pickBy, throttle } from 'lodash-es';
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, toRef, watch } from 'vue';
import { CachedIcon } from 'vue-cached-icon';
import '@pdanpdan/virtual-scroll/style.css';

import { DefaultRenderers, gridColumnCreate, gridDestroy, RendererOptionsMap, RowValue } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { useColumns } from './columns';
import { useFiltering } from './columns-filtering';
import { useSorting } from './columns-sorting';
import DfGridHeader from './df-grid-header.vue';
import { useGridMouseEvents } from './df-grid-mouse-events';
import type { GridEmits, GridProps } from './df-grid-types';
import ExcessiveScroll from './excessive-scroll.vue';
import { GridCard, ShadowGrid, ShadowGridMeasurements, useHeaderContent } from './helpers';
import IncomingArc from './incoming-arc.vue';
import { useSelection } from './selection';
import { useExcessiveScroll } from './use-excessive-scroll';

const props = withDefaults(
  defineProps<GridProps>(),
  {
    mainShadowCount: 500,
    secondaryShadowCount: 30,
    columns: () => [],
    showFilterRow: false,
    showStatusBar: false,
    showSummaryBar: false,
    loading: false,
    rowClass: (_item: RowValue, index: number) => (index % 2 === 0 ? 'even' : 'odd'),
    selectionMode: null,
  },
);
const emit = defineEmits<GridEmits>();

const gridId = Symbol('df-grid');
const mainShadowOffset = ref(0);
const secondaryShadowOffset = ref(0);
const templateColumns = ref('');

const uColumns = useColumns(props, gridId);

// Processing pipeline: records → filter → sort → display
const { filterState, emitWrapper: filterEmitWrapper, filteredRecords } =
  useFiltering(props, emit, uColumns, toRef(props, 'records'));
const { sortState, emitWrapper: sortEmitWrapper, sortedRecords } =
  useSorting(props, filterEmitWrapper, uColumns, filteredRecords);

const headerRef = ref();
const shadowMeasurements: Record<string, any> = {};
const shadowRef = ref();
const vsRef = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);

useHeaderContent().provideHeaderContent();

const updateRenderedRows = throttle(
  (range: { start: number; end: number }) => {
    const mid = Math.round((range.start + range.end) / 2);
    mainShadowOffset.value = Math.max(0, mid - Math.round(props.mainShadowCount / 2));
    if (props.recentlyAdded) {
      // Use scrollDetails.currentIndex / currentEndIndex for the TRULY visible
      // range (excluding render buffers). The rendered `range` includes
      // buffer-before + buffer-after items and is useless for viewport detection.
      const sd = vsRef.value?.scrollDetails;
      props.recentlyAdded.setVisibleRange(
        sd != null ?
          { start: sd.currentIndex, end: sd.currentEndIndex + 1 } :
          range,
      );
    }
  },
  250,
);

const uSelection = useSelection(props, emit);
const { processMouse } = useGridMouseEvents(sortEmitWrapper, props, sortState, headerRef, uColumns, uSelection);

const isSelectionActive = computed(() => {
  const mode = uSelection.selectionMode.value;
  return mode !== null && mode !== 'non-select';
});

watch(uColumns.active, () => { templateColumns.value = ''; });
watch(isSelectionActive, async () => {
  await nextTick();
  const el = shadowRef.value?.containerEl as HTMLElement | undefined;
  if (!el) return;
  const columnWidths = window.getComputedStyle(el).getPropertyValue('grid-template-columns');
  if (columnWidths && columnWidths !== 'none') {
    templateColumns.value = `grid-template-columns: ${columnWidths}`;
    // `.virtual-scroll-item` elements carry `will-change: transform`, promoting them to
    // GPU-composited layers. Chromium does not re-cascade CSS custom-property changes into
    // composited subtrees — the row cards would keep the old column widths until the scroller
    // recycles them on next scroll. Setting --grid-template-columns directly on each visible
    // item bypasses the cascade boundary: the card finds the variable on its direct parent
    // (within the same composited layer) and uses the new value immediately.
    // Items that scroll into view later get the value via normal cascade from the container.
    const items = containerRef.value?.querySelectorAll<HTMLElement>('.virtual-scroll-item') ?? [];
    items.forEach((item) => item.style.setProperty('--grid-template-columns', columnWidths));
  }
});
const { amount: excessiveScrollAmount } = useExcessiveScroll(
  containerRef,
  vsRef,
  toRef(props, 'loading'),
  toRef(props, 'excessiveScrollThreshold'),
  (amt) => emit('excessive-scroll', amt),
);
let lastResizeWasShrink = true;
let lastResizeWidth = 0;
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  resizeObserver = new ResizeObserver((etries) => {
    etries.forEach((entry) => {
      const { width } = entry.contentRect;
      lastResizeWasShrink = width < lastResizeWidth;
      lastResizeWidth = width;
      const filtered = pickBy(shadowMeasurements, (config) => config <= width);
      const bestLayout = maxBy(keys(filtered), (key) => filtered[key]);
      shadowRef.value?.reMeasure();
      if (bestLayout != null && bestLayout !== props.activeColumns) {
        templateColumns.value = '';
        emit('update:activeColumns', <string> bestLayout);
      }
    });
  });
  resizeObserver.observe(containerRef.value!);
});
onUnmounted(() => {
  resizeObserver?.disconnect();
});
onUpdated(() => {
  const targetElement = containerRef.value?.querySelector('.df-grid.dynamic-scroller-item .df-grid.card');
  if (targetElement != null && !lastResizeWasShrink) {
    const computedStyle = window.getComputedStyle(targetElement);
    const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));
    const tSWidth = targetElement.scrollWidth;
    if (tSWidth > totalWidth && tSWidth > shadowMeasurements[uColumns.active.value]) {
      // console.log(totalWidth, tSWidth, shadowMeasurements[uColumns.active.value]);
      shadowMeasurements[uColumns.active.value] = tSWidth;
    }
  }
});

const doShadowMeasure = throttle(
  (event: ShadowGridMeasurements) => { templateColumns.value = `grid-template-columns: ${event.columnWidths}`; },
  100,
);

const columnRendererOptionsInternal = computed(() => uColumns.columns.value.map((column) => {
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
.df-grid-toolbar, .df-grid-footer {
  display: flex;
  justify-content: space-between;
}
.df-grid-body {
  position: relative;
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
}
.df-grid-body .cards-grid {
  height: 100%;
  overflow-y: scroll;
}
.df-summary-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 1em;
}
.df-summary-loading, .df-summary-no-data {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 2.5em;
  opacity: 0.7;
}
@keyframes df-grid-spin {
  to { transform: rotate(360deg); }
}
.df-summary-spin {
  animation: df-grid-spin 1s linear infinite;
}
.df-grid.container .df-grid.card:not(.shadow-grid) {
  /*noinspection CssUnresolvedCustomProperty*/
  grid-template-columns: var(--grid-template-columns) !important;
}
.df-grid.cell.has-pre-post {
  display: flex;
  align-items: center;
}
.df-grid.cell.has-pre-post > .pre {
  flex: 0 0 auto;
  align-content: center;
}
.df-grid.cell.has-pre-post > .content {
  flex: 1 1 auto;
  min-width: 0;
  align-content: center;
}
.df-grid.cell.has-pre-post > .post {
  flex: 0 0 auto;
  align-content: center;
}
</style>
