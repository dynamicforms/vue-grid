<template>
  <div class="df-grid-shadow-clip" v-bind="wrapperAttrs">
    <div ref="shadowGridRef" class="df-grid shadow-grid card body-grid" :class="attrs.class">
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
}

const props = defineProps<GridProps>();
// The following dereference is necessary because vue 3.4 SSR renderer messes up the v-memo generation
const { keyField } = toRefs(props);
const columnKey = computed(() => props.columns.map((c) => c.fieldName).join(','));

interface Emits {
  (e: 'onmeasure', value: ShadowGridMeasurements): any;
}
const emits = defineEmits<Emits>();
const { headerContentVNodes } = useHeaderContent();
const shadowGridRef = ref();

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
      const computedStyle = window.getComputedStyle(shadowGridRef.value);
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

      const totalWidth = Math.ceil(Number.parseFloat(computedStyle.getPropertyValue('width').replace('px', '')));

      emits('onmeasure', { totalWidth, columnWidths });
      resolve();
    };
    attempt();
  });
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
}
</style>
