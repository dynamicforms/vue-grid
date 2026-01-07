<template>
  <div class="df-grid-sorting-indicator-wrapper">
    &nbsp;
    <svg :viewBox="viewBox" stroke="currentColor" fill="currentColor">
      <path v-if="direction !== 'asc'" data-sort="asc" d="M16,0l-16 20 16 -6 16 6Z"/>
      <g
        v-if="index"
        data-sort="sort-index"
        font-family="sans-serif"
        font-size="28"
        dominant-baseline="central"
        text-anchor="middle"
      >
        <path fill="none" stroke-width="2" d="M16,20l14 6 0 16 -14 6 -14 -6 0-16Z"/>
        <text x="16" y="34">{{ index }}</text>
      </g>
      <path v-if="direction !== 'desc'" data-sort="desc" d="M16,68l-16 -20 16 6 16 -6Z"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { type ColumnSortState } from '../columns-sorting';

const props = withDefaults(
  defineProps<ColumnSortState>(),
  { direction: undefined, index: undefined, sortable: true },
);

const viewBox = computed(
  () => `0 ${props.direction === 'asc' ? '16' : '0'} 32 ${props.direction === 'desc' ? '52' : '68'}`,
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
  transform: translateY(-50%);
  width: .75em;
}
</style>
