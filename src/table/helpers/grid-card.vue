<template>
  <div class="df-grid card">
    <messages-widget :message="formattedData" classes="df-grid cell"/>
  </div>
</template>

<script setup lang="ts">
import { MessagesWidget } from '@dynamicforms/vue-forms';
import { computed } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue } from './cell-renderers';
import { ColumnDefinition } from './columns';

interface CardProps {
  item: RowValue;
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  renderers: RenderersMap;
}
const props = defineProps<CardProps>();

const formattedData = computed(() => {
  const item = props.item;
  const renderers = props.renderers;

  return props.columns.map((column) => {
    const value = item[column.fieldName];
    let renderer = props.renderers[column.renderer ?? 'plain'];
    const rendererOptions = column.rendererOptions;
    const nullHandler = column.rendererOptions?.nullHandler as keyof RenderersMap;

    if (value == null && nullHandler != null) renderer = renderers[nullHandler];
    const res = renderer(value, item, rendererOptions as any);
    res.classes = column.fieldName;
    return res;
  });
});
</script>

<style scoped>
.card {
  /* production */
  transition: grid-template-columns 2s ease;
}
</style>
