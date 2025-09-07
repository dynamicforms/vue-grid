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
  /* production */
  transition: grid-template-columns 2s ease;
}
.df-grid.cell.df-grid-card-break-item {
  grid-column: 1 / -1;
}
</style>
