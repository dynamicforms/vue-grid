<template>
  <render/>
</template>

<script setup lang="ts">
// This is a straight copy from vuetify-inputs, but I don't want all the baggage associated. df-table dowesn't need
// all those dependencies (but I did have to add vue-markdown-render for this widget)
import { ValidationError } from '@dynamicforms/vue-forms';
import { h } from 'vue';
import VueMarkdown from 'vue-markdown-render';

type ClassTypes = string | string[] | Record<string, boolean>;

interface Props {
  errors: ValidationError[];
  message: string;
  classes?: ClassTypes | ClassTypes[];
}

const props = withDefaults(defineProps<Props>(), { classes: 'text-error' });

const render = () => {
  if (props.message !== ' ') return h('span', { class: props.classes }, props.message);
  const res: ReturnType<typeof h>[] = [];
  props.errors.forEach((error: ValidationError) => {
    switch (error.componentName) {
    case 'template':
      res.push(h('div', { class: props.classes }, error.componentBody));
      break;
    case 'vue-markdown':
      res.push(h(
        VueMarkdown,
        { class: [props.classes, 'df-messages-widget-markdown'], source: (<any>error.componentBindings).source },
      ));
      break;
    default:
      res.push(
        h(error.componentName, { class: props.classes, ...error.componentBindings, innerHTML: error.componentBody }),
      );
      break;
    }
  });
  return res;
};
</script>

<style>
/* we would like there to be no margins for the displayed errors at the very top and very bottom. rest of it is fine */
.df-messages-widget-markdown > :first-child, .df-messages-widget-markdown > :last-child {
  margin-top: 0 !important;
  padding-top: 0 !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
  line-height: 1.35em !important; /* inspired by vitepress' aggressive settings */
}
</style>
