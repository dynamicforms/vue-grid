<template>
  <div v-bind="$attrs">
    <messages-widget v-if="pre" :message="([pre] as any)" classes="pre"/>
    <messages-widget :message="([content] as any)" :classes="contentClass ?? 'content'"/>
    <messages-widget v-if="post" :message="([post] as any)" classes="post"/>
  </div>
</template>

<script setup lang="ts">
// No unit tests: this is a pure display component with no JavaScript logic.
// All conditional rendering (v-if="pre", v-if="post") is template-level and not
// instrumented by Istanbul's JS coverage. Testing it would only mount a shell
// and verify that Vue's own v-if directive works.
import { MessagesWidget, RenderableValue } from '@dynamicforms/vue-forms';

defineOptions({ inheritAttrs: false });

defineProps<{
  pre?: RenderableValue | null;
  content: RenderableValue;
  post?: RenderableValue | null;
  contentClass?: string;
}>();
</script>
