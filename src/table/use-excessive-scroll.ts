/* eslint-disable import/prefer-default-export */
import { onMounted, onUnmounted, ref } from 'vue';
import type { Ref } from 'vue';

/** Maximum overscroll displacement in pixels. */
const MAX_AMOUNT = 60;

/**
 * Tracks overscroll displacement for pull-to-refresh / pull-to-load gestures.
 *
 * @param containerRef - root element that receives wheel events
 * @param vsRef        - virtual-scroll component ref (used to read scroll position)
 * @param loading      - when true, scrolling past the bottom always accumulates overscroll
 * @param threshold    - percentage of MAX_AMOUNT (60 px) at which the `excessive-scroll` event
 *                       fires; `undefined` disables the event entirely
 * @param onTrigger    - callback invoked with the signed displacement (px) when the threshold is
 *                       crossed; positive = past bottom, negative = past top
 */
export function useExcessiveScroll(
  containerRef: Ref<HTMLElement | null>,
  vsRef: Ref<any>,
  loading: Ref<boolean>,
  threshold: Ref<number | undefined>,
  onTrigger: (amount: number) => void,
) {
  const amount = ref(0);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let decayFrame: number | null = null;
  let decayStart: number | null = null;
  let decayFrom = 0;

  // Trigger-reset tracking:
  //   triggerLastAt            — timestamp of the last firing (null = never fired)
  //   belowThresholdSinceTrigger — true once the amount drops back below the threshold after firing;
  //                               starts true so the very first crossing can fire immediately
  let triggerLastAt: number | null = null;
  let belowThresholdSinceTrigger = true;

  function checkThreshold(currentAmount: number) {
    const t = threshold.value;
    if (t == null) return;

    const thresholdPx = (t / 100) * MAX_AMOUNT;
    const absAmount = Math.abs(currentAmount);

    if (absAmount >= thresholdPx) {
      const now = Date.now();
      const canFire =
        belowThresholdSinceTrigger &&
        (triggerLastAt === null || now - triggerLastAt >= 1000);
      if (canFire) {
        triggerLastAt = now;
        belowThresholdSinceTrigger = false;
        onTrigger(currentAmount);
      }
    } else if (!belowThresholdSinceTrigger) {
      belowThresholdSinceTrigger = true;
    }
  }

  function cancelDecay() {
    if (decayFrame !== null) { cancelAnimationFrame(decayFrame); decayFrame = null; }
  }

  function stepDecay(now: number) {
    if (decayStart === null) decayStart = now;
    const progress = Math.min((now - decayStart) / 200, 1);
    amount.value = decayFrom * (1 - progress);
    checkThreshold(amount.value);
    if (progress < 1) {
      decayFrame = requestAnimationFrame(stepDecay);
    } else {
      amount.value = 0;
      decayFrame = null;
    }
  }

  function startDecay() {
    cancelDecay();
    decayStart = null;
    decayFrom = amount.value;
    decayFrame = requestAnimationFrame(stepDecay);
  }

  function resetTimer() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; startDecay(); }, 200);
  }

  function onWheel(event: WheelEvent) {
    if (event.deltaY === 0) return;
    const target = event.target as HTMLElement;
    const section = (target.closest('[data-section]') as HTMLElement | null)?.dataset.section;
    if (section !== 'body' && section !== 'summary-bar') return;
    const sd = vsRef.value?.scrollDetails?.value;
    const el = vsRef.value?.$el as HTMLElement | undefined;
    let atBottom = false;
    let atTop = false;
    if (sd) {
      atBottom = sd.scrollOffset.y + sd.viewportSize.height >= sd.totalSize.height - 5;
      atTop = sd.scrollOffset.y <= 5;
    } else if (el) {
      atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 5;
      atTop = el.scrollTop <= 5;
    }
    if (event.deltaY > 0 && (atBottom || loading.value)) {
      cancelDecay();
      amount.value = Math.min(amount.value + event.deltaY * 0.15, MAX_AMOUNT);
      checkThreshold(amount.value);
      resetTimer();
    } else if (event.deltaY < 0 && atTop) {
      cancelDecay();
      amount.value = Math.max(amount.value + event.deltaY * 0.15, -MAX_AMOUNT);
      checkThreshold(amount.value);
      resetTimer();
    }
  }

  onMounted(() => {
    containerRef.value?.addEventListener('wheel', onWheel, { passive: true });
  });

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
    cancelDecay();
    containerRef.value?.removeEventListener('wheel', onWheel);
  });

  return { amount };
}
