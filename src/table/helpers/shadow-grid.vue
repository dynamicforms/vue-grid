<template>
  <div class="df-grid-shadow-clip" v-bind="wrapperAttrs">
    <div
      ref="shadowGridRef"
      class="df-grid shadow-grid card body-grid df-record-grid"
      :class="attrs.class"
      :style="sizeStyle"
    >
      <grid-card
        v-for="item in idxAndItem()"
        :key="`${item[keyField]}`"
        v-memo="[`${item[keyField]}`, columnKey]"
        :item="item"
        :columns="columns"
        :renderers="renderers"
        :add-row-reset-item="true"
        :no-wrapper-item="true"
      />
      <component :is="() => headerContentVNodes" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { omit } from 'lodash-es';
import { computed, nextTick, ref, toRefs, useAttrs } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue } from '../cell-renderers';
import { ColumnDefinition } from '../columns';

import GridCard from './grid-card.vue';
import { useHeaderContent } from './header-content';
import { ShadowGridMeasurements } from './shadow-grid-types';
import { computeLineHeightPx, lineCountFromHeights, median } from './shadow-metrics';

// The measured grid (the inner div, not the component root) carries a `body-grid` class
// alongside the caller's own layout class (e.g. `three-row`, passed as `class` on the
// `<shadow-grid>` tag) so consumer CSS written for `.df-grid.body-grid.<layout>` — the real
// shared grid's own class — also applies here. The shadow only measures correctly if it gets the
// exact same `display:grid`/`grid-template-columns` declaration the real grid gets; without it
// this element is never actually a grid, `grid-template-columns` computed-styles as `none`
// forever, and `checkShadowGridColumns` below retries on every animation frame indefinitely.
// Vue's default attrs fallthrough would put a caller-supplied `class` on the component root
// (`.df-grid-shadow-clip`) instead, which only positions and clips — it carries no layout class
// of its own, so every caller-supplied layout would measure identically. `inheritAttrs: false`
// plus the explicit bindings below route `class` to the inner grid and everything else (e.g.
// the `style="right: auto"` override callers pass) to the root.
defineOptions({ inheritAttrs: false });

export interface GridProps {
  records: RowValue[];
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  renderers: RenderersMap;
  count: number;
  offset: number;
  keyField: string;
  selectionActive?: boolean;
  // 'max-content' (default) measures each field's natural, unwrapped width — today's behaviour.
  // 'min-content' forces every field to wrap at every opportunity instead, which df-grid.vue uses
  // to read how many lines each sampled row's content actually needs at that narrowest width.
  sizeTo?: 'max-content' | 'min-content';
}

const props = withDefaults(defineProps<GridProps>(), { sizeTo: 'max-content' });
// The following dereference is necessary because vue 3.4 SSR renderer messes up the v-memo generation
const { keyField } = toRefs(props);
const columnKey = computed(() => props.columns.map((c) => c.fieldName).join(','));
const sizeStyle = computed(() => (props.sizeTo === 'min-content' ? { width: 'min-content' } : undefined));

interface Emits {
  (e: 'onmeasure', value: ShadowGridMeasurements): any;
}
const emits = defineEmits<Emits>();
const { headerContentVNodes } = useHeaderContent();
const shadowGridRef = ref<HTMLElement | null>(null);

const attrs = useAttrs();
const wrapperAttrs = computed(() => omit(attrs, 'class'));

// Resolves once a valid measurement has actually been emitted, retrying across animation frames
// in the meantime — the caller doesn't need its own knowledge of the "none" race to await
// completion.
function checkShadowGridColumns(): Promise<void> {
  // istanbul ignore next — shadowGridRef.value is always set when the component is mounted;
  // the null branch is a defensive guard that cannot be triggered through normal component usage.
  if (!shadowGridRef.value) return Promise.resolve();

  return new Promise((resolve) => {
    const attempt = () => {
      const computedStyle = window.getComputedStyle(shadowGridRef.value!);
      const columnWidths = computedStyle.getPropertyValue('grid-template-columns');

      // `grid-template-columns` reads back as its initial value, "none", for the one frame
      // between the element existing in the DOM and the stylesheet rule that makes it a grid
      // taking effect. Emitting that would hand every `onmeasure` listener a value none of them
      // can use meaningfully — retrying here, once, on the next frame is cheaper than every
      // listener re-deriving "was this reading valid" for itself.
      if (!columnWidths || columnWidths === 'none') {
        requestAnimationFrame(attempt);
        return;
      }

      // Firefox has been observed under-reporting a min-content grid's own resolved `width` when
      // it contains items with overlapping column spans (e.g. one field spanning tracks 1-4
      // alongside others spanning subsets of the same tracks) — the grid's computed width comes
      // back narrower than a child cell's own rendered width, i.e. content silently overflows the
      // box rather than growing it, which a min-content box is defined never to allow. `scrollWidth`
      // reflects the actual required width regardless of that mis-sizing, so it's used as a floor.
      const styleWidth = Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', ''));
      const totalWidth = Math.ceil(Math.max(styleWidth, shadowGridRef.value!.scrollWidth));
      const fieldGroups = groupCellsByField();

      if (props.sizeTo === 'min-content') {
        const fieldCompactMetrics: Record<string, { minContentWidth: number; medianLines: number }> = {};
        fieldGroups.forEach((cells, field) => {
          const lineHeights = cells.map((cell) => computeLineHeightPx(cell));
          const lineCounts = cells.map((cell, i) => lineCountFromHeights(cell.scrollHeight, lineHeights[i]));
          fieldCompactMetrics[field] = {
            minContentWidth: cells[0].getBoundingClientRect().width,
            medianLines: median(lineCounts),
          };
        });
        emits('onmeasure', { totalWidth, columnWidths, fieldCompactMetrics });
      } else {
        const fieldMaxWidths: Record<string, number> = {};
        fieldGroups.forEach((cells, field) => {
          fieldMaxWidths[field] = cells[0].getBoundingClientRect().width;
        });
        emits('onmeasure', { totalWidth, columnWidths, fieldMaxWidths });
      }
      resolve();
    };
    attempt();
  });
}

// Every rendered cell carries its own field name as a CSS class (see use-formatted-data.ts) — a
// direct classList match, rather than a dynamic `.field-name` selector, avoids needing to escape
// field names that aren't valid bare CSS identifiers.
function groupCellsByField(): Map<string, HTMLElement[]> {
  const groups = new Map<string, HTMLElement[]>();
  const fieldNames = props.columns.map((c) => c.fieldName);
  const cells = shadowGridRef.value!.querySelectorAll<HTMLElement>('.df-grid.cell');
  cells.forEach((cell) => {
    const field = fieldNames.find((f) => cell.classList.contains(f));
    if (!field) return;
    const list = groups.get(field);
    if (list) list.push(cell);
    else groups.set(field, [cell]);
  });
  return groups;
}

function* idxAndItem() {
  nextTick(() => checkShadowGridColumns());
  const mx = Math.min(props.offset + props.count, props.records.length) - props.offset;
  for (let i = 0; i < mx; i++) {
    yield props.records[i + props.offset];
  }
}

function reMeasure(): Promise<void> {
  return checkShadowGridColumns();
}
defineExpose({
  reMeasure,
  get containerEl() {
    return shadowGridRef.value;
  },
});
</script>

<style>
/*
 * The measured grid (`.df-grid.shadow-grid`) needs to size itself to its own natural content
 * width, which can be — and often is, that's the whole point — wider than the container. A plain
 * block clips that overflow reliably in every engine; the grid itself, given `position:absolute;
 * left:0; right:0` directly, does not: at least one engine resolves that into a used width equal
 * to the containing block's width for a *block* box, but not consistently for a *grid* box whose
 * own tracks want more room, instead growing the box to fit its content and leaking that width
 * into the container's own scrollable overflow. Splitting the positioning/clipping (this wrapper)
 * from the sizing (the grid itself, `width: max-content` below) sidesteps the inconsistency.
 */
.df-grid-shadow-clip {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  /*
   * `display: flow-root` forces this element's own width to actually settle at what `left`/
   * `right` say it should be, instead of growing to accommodate the oversized `width: max-content`
   * child — plain `overflow-x: hidden` establishes a block formatting context too and should be
   * enough by spec, but isn't reliably enough in every engine for this specific combination
   * (position:absolute sizing + an intrinsically-sized descendant needing more room). flow-root's
   * entire purpose is exactly this "don't let a child's content affect my own size" guarantee.
   */
  display: flow-root;
  /* `contain: size` makes this element's own box size completely independent of its children's
     content — the guarantee `display:flow-root` alone did not reliably provide here. */
  contain: size layout;
  pointer-events: none;
  height: 20em;
  overflow-y: scroll;
  overflow-x: hidden;
  visibility: hidden;
}
.df-grid.shadow-grid {
  width: max-content;
  /* Keeps each cell at its own content height rather than the row's tallest cell — shadow-metrics.ts
     reads per-cell `scrollHeight` to count wrapped lines per field. */
  align-items: start;
}
</style>
