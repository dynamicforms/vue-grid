<template>
  <messages-widget v-if="noWrapperItem" :message="formattedData" classes="df-grid cell" :item-attrs="cellAttrs" />
  <div v-else class="df-grid card">
    <messages-widget :message="formattedData" classes="df-grid cell" :item-attrs="cellAttrs" />
  </div>
</template>

<script setup lang="ts">
import { MessagesWidget, type RenderableValue } from '@dynamicforms/vuetify-inputs';

import { FormattedDataProps, useFormattedData } from './use-formatted-data';

interface CardProps extends FormattedDataProps {
  noWrapperItem?: boolean;
  /** Attributes bound on every cell element: one set for all cells, or a function of the cell's value and index. */
  cellAttrs?: Record<string, unknown> | ((item: RenderableValue, index: number) => Record<string, unknown> | undefined);
}
const props = withDefaults(defineProps<CardProps>(), {
  addRowResetItem: false,
  noWrapperItem: false,
  cellAttrs: undefined,
});
const { formattedData } = useFormattedData(props);
</script>

<style>
.df-grid.shadow-grid.card > .df-grid.cell.df-grid-card-break-item {
  grid-column: -2 / -1 !important;
}
</style>
