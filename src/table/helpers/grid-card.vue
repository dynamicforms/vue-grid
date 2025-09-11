<template>
  <messages-widget v-if="noWrapperItem" :message="formattedData" classes="df-grid cell"/>
  <div v-else class="df-grid card">
    <messages-widget :message="formattedData" classes="df-grid cell"/>
  </div>
</template>

<script setup lang="ts">
import { MessagesWidget } from '@dynamicforms/vue-forms';

import { FormattedDataProps, useFormattedData } from './use-formatted-data';

interface CardProps extends FormattedDataProps {
  noWrapperItem?: boolean;
}
const props = withDefaults(defineProps<CardProps>(), { addRowResetItem: false, noWrapperItem: false });

const { formattedData } = useFormattedData(props);
</script>

<style>
.df-grid.card {
  transition: grid-template-columns 1s ease;
}
.df-grid.shadow-grid.card > .df-grid.cell.df-grid-card-break-item {
  grid-column: -2 / -1 !important;
}
</style>
