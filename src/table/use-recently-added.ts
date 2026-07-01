import { computed, nextTick, onUnmounted, reactive, ref, toValue } from 'vue';
import type { MaybeRef, Ref } from 'vue';

import type { RowValue } from './cell-renderers';

export interface UseRecentlyAdded {
  /** Add pks to the recently-added list. Removed automatically after `timeout` ms (default 250). */
  addRecentlyAdded(pks: any[], timeout?: number): void;
  /** Returns true while a pk is in the recently-added list. Reactive. */
  isPendingAdd(pk: any): boolean;
  /** Returns ms elapsed since the pk was added, or null if not in the list. Reactive (rAF-ticked). */
  timeSinceAdded(pk: any): number | null;
  /**
   * Called by the grid to inform the composable of the currently visible row index range.
   * Must be called whenever the virtual scroll's visible range changes.
   */
  setVisibleRange(range: { start: number; end: number }): void;
  /** Explicitly trigger a top-arc flash. Useful for custom insertion logic where auto-detection is not enough. */
  triggerTopArc(): void;
  /** Explicitly trigger a bottom-arc flash. */
  triggerBottomArc(): void;
  /** Increments each time a flash should trigger on the top arc (newly added pks above viewport). */
  topArcFlashTick: Ref<number>;
  /** Increments each time a flash should trigger on the bottom arc (newly added pks below viewport). */
  bottomArcFlashTick: Ref<number>;
  /** The currently visible row index range as reported by the grid. Read-only for consumers. */
  visibleRange: Ref<{ start: number; end: number }>;
}

/**
 * Tracks recently-added records for animation purposes.
 *
 * @param records  - reactive ref to the sorted/filtered records the grid is displaying
 * @param keyField - the field name used as pk (matches the grid's `keyField` prop)
 */
export function useRecentlyAdded(
  records: Ref<RowValue[]>,
  keyField: MaybeRef<string>,
): UseRecentlyAdded {
  // pk → addedAt timestamp. Vue 3 reactive() wraps Maps with full reactivity.
  const entries = reactive(new Map<any, number>());
  const visibleRange = ref<{ start: number; end: number }>({ start: 0, end: 0 });

  // rAF ticker: drives timeSinceAdded() reactivity while entries are pending.
  const ticker = ref(0);
  let rafId: number | null = null;

  const topArcFlashTick = ref(0);
  const bottomArcFlashTick = ref(0);

  const pkToIndex = computed(() => {
    const kf = toValue(keyField);
    const map = new Map<any, number>();
    records.value.forEach((record, index) => map.set(record[kf], index));
    return map;
  });

  function startTicker() {
    if (rafId !== null) return;
    const tick = () => {
      ticker.value++;
      if (entries.size > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(tick);
  }

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  function addRecentlyAdded(pks: any[], timeout = 250) {
    const now = Date.now();
    // Capture the visible range NOW (before the virtual scroll has a chance to
    // update it in response to the records mutation). Virtual-scroll fires
    // visible-range-change asynchronously (next Vue render cycle), so at this
    // point visibleRange still reflects where the user was looking before the
    // mutation — which is exactly what we need to decide if new records landed
    // outside the viewport.
    const { start, end } = visibleRange.value;
    pks.forEach((pk) => {
      entries.set(pk, now);
      setTimeout(() => entries.delete(pk), timeout);
    });
    startTicker();

    // Use nextTick so pkToIndex (computed from records) is already updated.
    nextTick(() => {
      const indexMap = pkToIndex.value;
      let hasTop = false;
      let hasBottom = false;
      pks.forEach((pk) => {
        if (!entries.has(pk)) return; // already expired
        const idx = indexMap.get(pk);
        if (idx === undefined) return;
        if (idx < start) hasTop = true;
        else if (idx >= end) hasBottom = true;
      });
      if (hasTop) topArcFlashTick.value++;
      if (hasBottom) bottomArcFlashTick.value++;
    });
  }

  function isPendingAdd(pk: any): boolean {
    return entries.has(pk);
  }

  function timeSinceAdded(pk: any): number | null {
    void ticker.value; // establish reactive dependency on the rAF tick
    const addedAt = entries.get(pk);
    return addedAt != null ? Date.now() - addedAt : null;
  }

  function setVisibleRange(range: { start: number; end: number }) {
    visibleRange.value = range;
  }

  function triggerTopArc() { topArcFlashTick.value++; }
  function triggerBottomArc() { bottomArcFlashTick.value++; }

  return {
    addRecentlyAdded,
    isPendingAdd,
    timeSinceAdded,
    setVisibleRange,
    triggerTopArc,
    triggerBottomArc,
    topArcFlashTick,
    bottomArcFlashTick,
    visibleRange,
  };
}
