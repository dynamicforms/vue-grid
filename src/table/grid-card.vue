<template>
  <div class="df-grid card">
    <div v-for="[key, itm] in Object.entries(item)" :key="key" :class="`df-grid cell ${key}`" v-html="itm"/>
  </div>
</template>

<script setup lang="ts">
interface CardProps {
  item: Record<string, any>;
}
defineProps<CardProps>();
</script>

<style scoped>
.card {
  /* production */
  transition: grid-template-columns 2s ease;
}
</style>
