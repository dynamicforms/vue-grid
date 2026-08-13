<template>
  <div
    class="df-incoming-arc"
    :class="`df-incoming-arc--${direction}`"
    aria-hidden="true"
  >
    <slot>
      <div class="df-incoming-arc__wave" :style="{ opacity: arcOpacity }"/>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Counter that increments on each incoming-records event from above or below. */
    trigger: number;
    direction: 'top' | 'bottom';
    /** Peak opacity for the first flash. Subsequent rapid flashes decay toward 0.15. Default 1. */
    maxOpacity?: number;
  }>(),
  { maxOpacity: 1 },
);

const arcOpacity = ref(0);
let decayRaf: number | null = null;
let lastTriggerAt = 0;
let triggerCount = 0;

function cancelDecay() {
  if (decayRaf !== null) {
    cancelAnimationFrame(decayRaf);
    decayRaf = null;
  }
}

function startDecay(fromOpacity: number) {
  cancelDecay();
  const DURATION = 800;
  const startTime = performance.now();
  const decay = (now: number) => {
    const progress = Math.min((now - startTime) / DURATION, 1);
    arcOpacity.value = fromOpacity * (1 - progress);
    if (progress < 1) {
      decayRaf = requestAnimationFrame(decay);
    } else {
      arcOpacity.value = 0;
      decayRaf = null;
    }
  };
  decayRaf = requestAnimationFrame(decay);
}

watch(
  () => props.trigger,
  (newVal, oldVal) => {
    if (newVal === oldVal) return;
    const now = Date.now();
    const isFrequent = now - lastTriggerAt < 1500 && triggerCount > 0;
    triggerCount = isFrequent ? triggerCount + 1 : 1;
    lastTriggerAt = now;

    // Each rapid consecutive trigger reduces initial opacity toward 0.15 (discrete / subtle).
    const initialOpacity = isFrequent ?
      props.maxOpacity * Math.max(0.15, 1 - 0.15 * (triggerCount - 1)) :
      props.maxOpacity;

    arcOpacity.value = initialOpacity;
    startDecay(initialOpacity);
  },
);

onUnmounted(cancelDecay);
</script>

<style>
.df-incoming-arc {
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
}
.df-incoming-arc--top { top: 0; }
.df-incoming-arc--bottom { bottom: 0; }

.df-incoming-arc__wave {
  position: absolute;
  left: -10%;
  right: -10%;
}
.df-incoming-arc--top .df-incoming-arc__wave {
  top: 0;
  height: 100%;
  background: radial-gradient(ellipse 70% 100% at 50% 0%, rgba(64, 100, 220, 0.9) 0%, transparent 100%);
}
.df-incoming-arc--bottom .df-incoming-arc__wave {
  bottom: 0;
  height: 100%;
  background: radial-gradient(ellipse 70% 100% at 50% 100%, rgba(64, 100, 220, 0.9) 0%, transparent 100%);
}
</style>
