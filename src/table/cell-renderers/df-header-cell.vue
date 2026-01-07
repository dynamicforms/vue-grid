<template>
  <div class="df-header-cell">
    <cached-icon v-if="icon" class="df-header-icon" :name="icon"/>
    <span v-else/>
    <messages-widget classes="" :message="renderLabel"/>

    <sorting-indicator :direction="sortState.direction" :index="sortState.index" :sortable="sortState.sortable"/>
  </div>
</template>
<script setup lang="ts">
import { MdString, MessagesWidget, RenderableValue } from '@dynamicforms/vue-forms';
import { computed } from 'vue';
import { CachedIcon } from 'vue-cached-icon';

import SortingIndicator from '../helpers/sorting-indicator.vue';

import { HeaderOptions } from './header-renderers';

const props = defineProps<HeaderOptions & { value: string | MdString }>();

const renderLabel = computed(() => [new RenderableValue(props.value)]);
</script>
<style>
.df-header-cell {
  display: grid;
  grid-template-columns: auto 1fr 1em;
}
.df-grid-sorting-indicator-wrapper {
  margin-inline-start: .25em;
}
</style>
