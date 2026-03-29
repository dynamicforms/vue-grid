<template>
  <div v-bind="$attrs">
    <messages-widget v-if="pre" :message="([pre] as any)" classes="pre"/>
    <messages-widget :message="([content] as any)" :classes="contentClass ?? 'content'"/>
    <messages-widget v-if="post" :message="([post] as any)" classes="post"/>
  </div>
</template>

<script setup lang="ts">
import { MessagesWidget, RenderableValue } from '@dynamicforms/vue-forms';

defineOptions({ inheritAttrs: false });

defineProps<{
  pre?: RenderableValue | null;
  content: RenderableValue;
  post?: RenderableValue | null;
  contentClass?: string;
}>();
</script>
