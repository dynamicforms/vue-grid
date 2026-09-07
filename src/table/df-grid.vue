<template>
  <div
    ref="containerRef"
    v-longpress="($event) => processMouse('longpress', $event)"
    class="df-grid container d-flex flex-column"
    :class="{ selection: isSelectionActive, exclusion: uSelection.selectionMode.value === 'exclusion' }"
    :style="[`--${templateColumns}`, { '--df-grid-scrollbar-width': `${scrollbarWidth}px` }]"
    @mousedown="
      ($event) => {
        if ($event.shiftKey && !props.recentlyAdded?.isAdding.value) $event.preventDefault();
      }
    "
    @click="($event) => processMouse('click', $event)"
    @dblclick="($event) => processMouse('dblclick', $event)"
    @keydown.enter="void 0"
  >
    <div v-if="$slots['toolbar-start'] || $slots['toolbar-end']" class="df-grid-toolbar" data-section="toolbar">
      <div class="df-grid-toolbar-start"><slot name="toolbar-start" /></div>
      <div class="df-grid-toolbar-end"><slot name="toolbar-end" /></div>
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
      <template #header="headerSlotProps"><slot name="header" v-bind="headerSlotProps" /></template>
      <template #statusBar="statusBarProps"><slot name="statusBar" v-bind="statusBarProps" /></template>
      <template #groupActions><slot name="groupActions" /></template>
    </df-grid-header>
    <div class="df-grid-body">
      <excessive-scroll :height="-excessiveScrollAmount" direction="top" />
      <div ref="bodyGridRef" class="df-grid body-grid" :class="uColumns.cssClass.value" data-section="body">
        <div style="display: contents; visibility: hidden" :style="headerRowBaseVars(uColumns.rowsPerRecord.value)">
          <component :is="() => headerContentVNodes" />
        </div>
        <!--
        data-pk/data-idx are duplicated on this wrapper AND on the row-anchor below: the anchor
        carries them for the documented `.df-grid.card[data-pk="…"]` query pattern (a real box,
        addressable by class), while the wrapper carries them so useGridMouseEvents can find the
        row from a click on a cell — cells are this wrapper's children, not the anchor's (the
        anchor is a sibling, not an ancestor, of the cells), so `.closest()` from a cell click can
        only reach the row through an ancestor that actually carries the attribute.
        -->
        <div
          v-for="(item, index) in sortedRecords"
          :key="item[keyField]"
          style="display: contents"
          :style="rowBaseVars(index, uColumns.rowsPerRecord.value)"
          :data-pk="item[keyField]"
          :data-idx="index"
        >
          <slot name="item" :item="item" :index="index" :active="true">
            <div
              class="df-grid card"
              :class="[
                uColumns.cssClass.value,
                props.rowClass?.(item, index),
                isSelectionActive ? (uSelection.isSelected(item[props.keyField]) ? 'selected' : 'unselected') : null,
                props.recentlyAdded?.isPendingAdd(item[props.keyField]) ? 'state-adding' : null,
              ]"
              :data-pk="item[keyField]"
              :data-idx="index"
            />
            <grid-card
              :item="item"
              :columns="columnRendererOptionsInternal"
              :renderers="DefaultRenderers"
              :no-wrapper-item="true"
            />
          </slot>
        </div>
      </div>
      <div v-if="showSummaryBar || loading || !props.records.length" class="df-summary-bar" data-section="summary-bar">
        <slot name="summary-bar">
          <div v-if="loading" class="df-summary-loading">
            <slot name="loading">
              <cached-icon name="mdi-loading" class="df-summary-spin" />
              <span>{{ translatableStrings.Loading }}</span>
            </slot>
          </div>
          <div v-else-if="!props.records.length" class="df-summary-no-data">
            <slot name="no-data">
              <cached-icon name="mdi-database-off" />
              <span>{{ translatableStrings.NoData }}</span>
            </slot>
          </div>
        </slot>
      </div>
      <excessive-scroll :height="excessiveScrollAmount" direction="bottom" />
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
          <slot v-if="$slots['incoming-arc-top']" name="incoming-arc-top" />
        </incoming-arc>
        <incoming-arc
          direction="bottom"
          :trigger="props.recentlyAdded.bottomArcFlashTick.value"
          :max-opacity="props.incomingArcMaxOpacity ?? 1"
        >
          <slot v-if="$slots['incoming-arc-bottom']" name="incoming-arc-bottom" />
        </incoming-arc>
      </template>
    </div>
    <div v-if="$slots['footer-start'] || $slots['footer-end']" class="df-grid-footer" data-section="footer">
      <slot name="footer-start" />
      <slot name="footer-end" />
    </div>
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
        @onmeasure="(event) => (shadowMeasurements[colsDef.name] = event.totalWidth)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { keys, maxBy, pickBy, throttle } from 'lodash-es';
import { computed, h, nextTick, onMounted, onUnmounted, onUpdated, ref, toRef, watch } from 'vue';
import { CachedIcon } from 'vue-cached-icon';

import { DefaultRenderers, gridColumnCreate, gridDestroy, RendererOptionsMap, RowValue } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { useColumns } from './columns';
import { useFiltering } from './columns-filtering';
import { useSorting } from './columns-sorting';
import DfGridHeader from './df-grid-header.vue';
import { useGridMouseEvents } from './df-grid-mouse-events';
import type { GridEmits, GridProps } from './df-grid-types';
import ExcessiveScroll from './excessive-scroll.vue';
import { GridCard, headerRowBaseVars, rowBaseVars, ShadowGrid, useHeaderContent } from './helpers';
import IncomingArc from './incoming-arc.vue';
import { useSelection } from './selection';
import { translatableStrings } from './translations';
import { useExcessiveScroll } from './use-excessive-scroll';

const props = withDefaults(defineProps<GridProps>(), {
  secondaryShadowCount: 30,
  columns: () => [],
  showFilterRow: false,
  showStatusBar: false,
  showSummaryBar: false,
  loading: false,
  rowClass: (_item: RowValue, index: number) => (index % 2 === 0 ? 'even' : 'odd'),
  selectionMode: null,
});
const emit = defineEmits<GridEmits>();

const gridId = Symbol('df-grid');
const secondaryShadowOffset = ref(0);
const templateColumns = ref('');

const uColumns = useColumns(props, gridId);

// Processing pipeline: records → filter → sort → display
const {
  filterState,
  emitWrapper: filterEmitWrapper,
  filteredRecords,
} = useFiltering(props, emit, uColumns, toRef(props, 'records'));
const {
  sortState,
  emitWrapper: sortEmitWrapper,
  sortedRecords,
} = useSorting(props, filterEmitWrapper, uColumns, filteredRecords);

const headerRef = ref();
const shadowMeasurements: Record<string, any> = {};
const bodyGridRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const headerContentRef = useHeaderContent().provideHeaderContent();
const headerContentVNodes = computed(() =>
  headerContentRef.value.map((c) => h(c.tag, { ...c.attrs, innerHTML: c.content })),
);

// Every row is currently mounted (windowing is a separate follow-up — see the migration notes
// near `bodyGridRef`), so the true visible range has to be found by scanning the row-anchors'
// own scroll position rather than reading it off a windowing library. This scan is cheap only
// because nothing is virtualized yet; once windowing returns, replace it with a range the
// windowing composable already tracks instead of re-deriving it from the DOM.
// Fired when a scroll comes within this many px of the end of the list, matching the documented
// `GridEmits.load` contract (previously the underlying virtual-scroll library's own default).
const LOAD_DISTANCE = 200;

const onBodyScrollSettle = throttle(() => {
  const el = bodyGridRef.value;
  if (!el) return;

  if (props.recentlyAdded) {
    const viewportTop = el.scrollTop;
    const viewportBottom = viewportTop + el.clientHeight;
    let start: number | null = null;
    let end: number | null = null;
    el.querySelectorAll<HTMLElement>('.df-grid.card[data-idx]').forEach((anchor) => {
      const anchorTop = anchor.offsetTop;
      const anchorBottom = anchorTop + anchor.offsetHeight;
      if (anchorBottom <= viewportTop || anchorTop >= viewportBottom) return;
      const idx = Number(anchor.dataset.idx);
      if (start === null || idx < start) start = idx;
      if (end === null || idx > end) end = idx;
    });
    if (start !== null && end !== null) props.recentlyAdded.setVisibleRange({ start, end: end + 1 });
  }

  if (!props.loading && el.scrollHeight - el.scrollTop - el.clientHeight <= LOAD_DISTANCE) {
    emit('load', 'vertical');
  }
}, 100);

const uSelection = useSelection(props, emit);
const { processMouse } = useGridMouseEvents(
  sortEmitWrapper,
  props,
  sortedRecords,
  sortState,
  headerRef,
  uColumns,
  uSelection,
);

const isSelectionActive = computed(() => {
  const mode = uSelection.selectionMode.value;
  return mode !== null && mode !== 'non-select';
});

watch(uColumns.active, () => {
  // Drop the stale widths now; `onUpdated` re-syncs once the body grid has actually
  // re-rendered with the new layout's own `grid-template-columns`.
  templateColumns.value = '';
});
watch(isSelectionActive, async () => {
  await nextTick();
  syncHeaderColumns();
});

// The header is a structurally separate box (its own filter row / status bar stack beneath it),
// so it can't participate in the body grid's own native column auto-sizing. Its columns are kept
// aligned by reading the body grid's own computed `grid-template-columns` (now resolved natively,
// from real row content — no shadow grid involved) and broadcasting it onto the header via a CSS
// variable, exactly the width the body actually settled on.
function readBodyColumns(): string | null {
  if (!bodyGridRef.value) return null;
  const columnWidths = window.getComputedStyle(bodyGridRef.value).getPropertyValue('grid-template-columns');
  return columnWidths && columnWidths !== 'none' ? columnWidths : null;
}
const syncHeaderColumns = throttle(() => {
  const columnWidths = readBodyColumns();
  if (columnWidths) templateColumns.value = `grid-template-columns: ${columnWidths}`;
}, 100);

const vsCompatRef = computed(() => ({ $el: bodyGridRef.value }));
const { amount: excessiveScrollAmount } = useExcessiveScroll(
  containerRef,
  vsCompatRef,
  toRef(props, 'loading'),
  toRef(props, 'excessiveScrollThreshold'),
  (amt) => emit('excessive-scroll', amt),
);
const scrollbarWidth = ref(0);
function measureScrollbarWidth() {
  // The header is a sibling of the body scroller, so it has to reserve the same width for the
  // vertical scrollbar that the scroller reserves - otherwise its columns are wider than the
  // body columns they label. How much that is cannot be declared: classic scrollbars take
  // ~15px, overlay ones take none, and `scrollbar-gutter: stable` is honoured differently
  // between engines on the same platform. So we ask the scroller what it actually reserved.
  const el = bodyGridRef.value;
  if (el) scrollbarWidth.value = el.offsetWidth - el.clientWidth;
}

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  measureScrollbarWidth();
  syncHeaderColumns();
  onBodyScrollSettle();
  bodyGridRef.value?.addEventListener('scroll', onBodyScrollSettle, { passive: true });
  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const { width } = entry.contentRect;
      measureScrollbarWidth();
      syncHeaderColumns();
      const filtered = pickBy(shadowMeasurements, (config) => config <= width);
      const bestLayout = maxBy(keys(filtered), (key) => filtered[key]);
      if (bestLayout != null && bestLayout !== props.activeColumns) {
        templateColumns.value = '';
        emit('update:activeColumns', <string>bestLayout);
      }
    });
  });
  resizeObserver.observe(containerRef.value!);
});
onUnmounted(() => {
  resizeObserver?.disconnect();
  bodyGridRef.value?.removeEventListener('scroll', onBodyScrollSettle);
  // Cancel pending trailing-edge invocations — without this, a throttle window open at unmount
  // time fires later against a detached bodyGridRef for no purpose.
  syncHeaderColumns.cancel();
  onBodyScrollSettle.cancel();
});
onUpdated(() => {
  // Rows arriving or leaving can make the body scrollbar appear or disappear without the
  // container ever resizing, and can change the body grid's own native column widths.
  measureScrollbarWidth();
  onBodyScrollSettle();
  syncHeaderColumns();
});

const columnRendererOptionsInternal = computed(() =>
  uColumns.columns.value.map((column) => {
    const opt: CellOptionsInternal = (column.rendererOptions ?? { nullHandler: 'null-null' }) as CellOptionsInternal;
    opt[gridIdOption] = gridId;
    opt[columnNameOption] = column.fieldName;
    opt[columnIdOption] = Symbol('grid-column');

    gridColumnCreate(gridId, column.renderer as keyof RendererOptionsMap, opt);
    return { ...column, rendererOptions: opt };
  }),
);

onUnmounted(() => gridDestroy(gridId));

defineExpose({
  // Forces the header's column widths to be re-read off the body grid's own native sizing, for
  // layout changes the ResizeObserver has no way to see on its own — e.g. a column's content
  // changing width without the container itself resizing. The returned promise resolves once the
  // new widths have actually reached the header, not merely once they were read:
  // `syncHeaderColumns` is throttled against the flood of updates a resize produces, so an
  // explicit, one-off request flushes it instead of leaving the caller to guess how long the
  // throttle window has left to run.
  reMeasure: async () => {
    await nextTick();
    syncHeaderColumns();
    syncHeaderColumns.flush();
    await nextTick();
  },
});
</script>

<style>
.df-grid.container {
  /*
   * The containing block for the secondary (per-alternate-layout) shadow grids, which are
   * `position: absolute; left: 0; right: 0` and direct children of this element. Without this
   * they stretch to whatever ancestor happens to be positioned - in a Vuetify app that is
   * `.v-application__wrap`, the full page width - and the widths they measure would then be
   * wrong for the container they're actually meant to describe.
   */
  position: relative;
}
.df-grid-toolbar,
.df-grid-footer {
  display: flex;
  justify-content: space-between;
}
.df-grid-toolbar-start,
.df-grid-toolbar-end {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.df-grid-body {
  position: relative;
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
}
.df-grid-body .body-grid {
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
.df-summary-loading,
.df-summary-no-data {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 2.5em;
  opacity: 0.7;
}
@keyframes df-grid-spin {
  to {
    transform: rotate(360deg);
  }
}
.df-summary-spin {
  animation: df-grid-spin 1s linear infinite;
}
.df-grid.container .df-grid.card.header {
  /*
   * The header is a structurally separate box (its own filter-row/status-bar stack sits beneath
   * it) so it can't be a native item of the body grid. Its columns are kept aligned with the
   * body's own natively-sized columns by copying the body's resolved pixel widths here.
   */
  /*noinspection CssUnresolvedCustomProperty*/
  grid-template-columns: var(--grid-template-columns) !important;
}
.df-grid.container .body-grid .df-grid.card {
  /*
   * The row-anchor: an otherwise-empty box giving each record something to style (zebra
   * background, border, selection highlight) and something for click handling to `.closest()`
   * onto, now that a record's cells are direct items of the shared body grid rather than being
   * wrapped in their own per-row grid. `--row-base`/`--rows-per-record` are published per record
   * (see use-row-placement.ts) on an ancestor `display:contents` wrapper and inherited here.
   */
  grid-column: 1 / -1;
  grid-row: calc(var(--row-base) + 1) / span var(--rows-per-record);
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
