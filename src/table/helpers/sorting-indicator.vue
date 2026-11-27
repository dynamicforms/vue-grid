<template>
  <div
    v-if="sortable"
    class="df-grid-sorting-indicator-wrapper"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
  >
    &nbsp;
    <svg aria-hidden="true" :viewBox="viewBox" stroke="currentColor" fill="currentColor">
      <path v-if="direction !== 'desc'" data-sort="asc" d="M16,0l-16 20 16 -6 16 6Z" />
      <g
        v-if="index"
        data-sort="sort-index"
        font-family="sans-serif"
        font-size="28"
        dominant-baseline="central"
        text-anchor="middle"
      >
        <path fill="none" stroke-width="2" d="M16,20l14 6 0 16 -14 6 -14 -6 0-16Z" />
        <text x="16" y="34">{{ index }}</text>
      </g>
      <path v-if="direction !== 'asc'" data-sort="desc" d="M16,68l-16 -20 16 6 16 -6Z" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { type ColumnSortState } from '../columns-sorting';
import { translate } from '../translations';

interface SortingIndicatorProps extends ColumnSortState {
  /** The column label as plain text, for the button's accessible name. */
  columnText?: string;
}

const props = withDefaults(defineProps<SortingIndicatorProps>(), {
  direction: undefined,
  index: undefined,
  sortable: true,
  columnText: '',
});

const ariaLabel = computed(() =>
  props.columnText ? translate('SortByColumn', { column: props.columnText }) : translate('Sort'),
);

/** Enter and Space click the indicator, Shift with them Shift+clicks it; the click sorts through the grid's handler. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  if (event.repeat) return;
  const target = event.currentTarget as HTMLElement;
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: event.shiftKey }));
}

const viewBox = computed(
  () => `0 ${props.direction === 'desc' ? '16' : '0'} 32 ${props.direction === 'asc' ? '52' : '68'}`,
);
</script>

<style>
.df-grid-sorting-indicator-wrapper {
  display: inline-block;
  width: 1em; /* nbsp is very narrow */
  position: relative;
}
.df-grid-sorting-indicator-wrapper svg {
  position: absolute;
  top: 50%;
  right: 0; /* without it the static position follows the cell's text-align and pushes the icon past the cell */
  transform: translateY(-50%);
  width: 0.75em;
  opacity: 0.55;
}
</style>
