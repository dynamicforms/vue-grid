import { onMounted, onUnmounted, ref } from 'vue';
import type { Ref } from 'vue';

export function useExcessiveScroll(
  containerRef: Ref<HTMLElement | null>,
  vsRef: Ref<any>,
  loading: Ref<boolean>,
) {
  const amount = ref(0);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let decayFrame: number | null = null;
  let decayStart: number | null = null;
  let decayFrom = 0;

  function cancelDecay() {
    if (decayFrame !== null) { cancelAnimationFrame(decayFrame); decayFrame = null; }
  }

  function stepDecay(now: number) {
    if (decayStart === null) decayStart = now;
    const progress = Math.min((now - decayStart) / 200, 1);
    amount.value = decayFrom * (1 - progress);
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
      amount.value = Math.min(amount.value + event.deltaY * 0.15, 60);
      resetTimer();
    } else if (event.deltaY < 0 && atTop) {
      cancelDecay();
      amount.value = Math.max(amount.value + event.deltaY * 0.15, -60);
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
