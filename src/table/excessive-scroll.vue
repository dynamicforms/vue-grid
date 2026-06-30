<template>
  <div
    v-if="height > 0"
    class="df-excessive-scroll"
    :class="`df-excessive-scroll--${direction}`"
    :style="{ height: `${height}px` }"
  />
</template>

<script setup lang="ts">
defineProps<{ height: number; direction: 'top' | 'bottom' }>();
</script>

<style>
.df-excessive-scroll {
  width: 100%;
  overflow: hidden;
}
.df-excessive-scroll--bottom {
  background: linear-gradient(to bottom, transparent, rgba(64, 100, 200, 0.2));
}
.df-excessive-scroll--top {
  background: linear-gradient(to top, transparent, rgba(64, 100, 200, 0.2));
}
</style>
