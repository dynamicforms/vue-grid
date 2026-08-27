/**
 * @file use-excessive-scroll.spec.ts
 *
 * Tests for the `useExcessiveScroll` composable (use-excessive-scroll.ts), which turns wheel
 * events that the body scroller can no longer consume into a bounded overscroll displacement —
 * the pull-past-the-end gesture the grid renders as a rubber band and reports as
 * `excessive-scroll`.
 *
 * The composable has three moving parts, and each is tested separately below:
 *
 *  1. **Gating** — which wheel events count at all. Only events originating inside the body or
 *     the summary bar, only when the scroller is already at the edge the user is pushing
 *     against (or, downwards, while `loading` is true). The edge is read from the virtual
 *     scroller's `scrollDetails`, falling back to the scroll element's own metrics.
 *
 *  2. **The threshold latch** — `onTrigger` must fire once per gesture, not once per wheel
 *     event: after firing it stays silent until the displacement has dropped back below the
 *     threshold, and never fires twice within a second.
 *
 *  3. **Decay** — 200 ms after the last wheel event the displacement animates back to zero over
 *     200 ms of animation frames.
 *
 * Both clocks are driven by hand. `setTimeout` and `Date` come from vitest's fake timers;
 * `requestAnimationFrame` is stubbed with a queue the test pumps explicitly, so a decay only
 * advances when a test says it does, with the timestamp the test chooses.
 */
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import type { Ref } from 'vue';

import { useExcessiveScroll } from './use-excessive-scroll';

// ---------------------------------------------------------------------------
// Animation-frame harness
// ---------------------------------------------------------------------------

let pendingFrames: { id: number; cb: FrameRequestCallback }[] = [];
let nextFrameId = 1;
let cancelFrameSpy: ReturnType<typeof vi.fn>;

/** Runs the frame the composable is currently waiting for, with the given timestamp. */
function runFrame(timestamp: number) {
  const frame = pendingFrames.shift();
  if (!frame) throw new Error('no animation frame was requested');
  frame.cb(timestamp);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** `scrollDetails` shapes for the four positions the composable distinguishes. */
const scrollPositions = {
  // Content shorter than the viewport: both edges are reached at once, which lets a test move
  // the displacement in either direction without re-mounting.
  bothEnds: { scrollOffset: { y: 0 }, viewportSize: { height: 500 }, totalSize: { height: 500 } },
  atTop: { scrollOffset: { y: 0 }, viewportSize: { height: 500 }, totalSize: { height: 2000 } },
  atBottom: { scrollOffset: { y: 1500 }, viewportSize: { height: 500 }, totalSize: { height: 2000 } },
  inMiddle: { scrollOffset: { y: 700 }, viewportSize: { height: 500 }, totalSize: { height: 2000 } },
};

interface HostOptions {
  /** Virtual-scroll `scrollDetails`; omit to exercise the scroll-element fallback. */
  scrollDetails?: unknown;
  /** Stand-in for the scroller element — only its three scroll metrics are ever read. */
  scrollEl?: { scrollTop: number; scrollHeight: number; clientHeight: number };
  loading?: boolean;
  /** Percentage of the 60px maximum; `undefined` disables the event entirely. */
  threshold?: number;
}

/**
 * Mounts a host component around the composable. The container element is created here rather
 * than through a template ref so that it stays reachable after unmount, which is what makes the
 * listener-removal test meaningful.
 */
function mountHost(options: HostOptions = {}) {
  const container = document.createElement('div');
  container.innerHTML = `
    <div data-section="body"><div class="in-body"></div></div>
    <div data-section="summary-bar"><div class="in-summary"></div></div>
    <div data-section="header"><div class="in-header"></div></div>
    <div class="in-nowhere"></div>
  `;
  document.body.appendChild(container);

  const containerRef = ref<HTMLElement | null>(container);
  const vsRef = ref<any>({
    scrollDetails: 'scrollDetails' in options ? { value: options.scrollDetails } : undefined,
    $el: options.scrollEl,
  });
  const loading = ref(options.loading ?? false);
  const threshold = ref<number | undefined>('threshold' in options ? options.threshold : undefined);
  const onTrigger = vi.fn();

  let amount!: Ref<number>;
  const wrapper = mount(
    defineComponent({
      setup() {
        ({ amount } = useExcessiveScroll(containerRef, vsRef, loading, threshold, onTrigger));
        return () => h('div');
      },
    }),
  );

  return { wrapper, amount, container, onTrigger, loading, threshold };
}

/** Dispatches a wheel event from a descendant of the container, as the browser would. */
function wheel(container: HTMLElement, deltaY: number, from = '.in-body') {
  container.querySelector(from)!.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true }));
}

/** The idle period after which the composable starts animating the displacement back to zero. */
const IDLE_MS = 200;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExcessiveScroll', () => {
  beforeEach(() => {
    // Only the timers the composable uses; leaving requestAnimationFrame alone so the stub below
    // is the single source of animation frames.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

    pendingFrames = [];
    nextFrameId = 1;
    cancelFrameSpy = vi.fn((id: number) => {
      pendingFrames = pendingFrames.filter((f) => f.id !== id);
    });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      pendingFrames.push({ id, cb });
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelFrameSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // -------------------------------------------------------------------------
  describe('wheel events it ignores', () => {
    it('ignores a wheel event with no vertical delta', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.bothEnds });

      wheel(container, 0);

      expect(amount.value).toBe(0);
    });

    it('ignores wheel events from outside the body and the summary bar', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.bothEnds });

      wheel(container, 100, '.in-header');

      expect(amount.value).toBe(0);
    });

    it('ignores wheel events with no data-section ancestor', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.bothEnds });

      wheel(container, 100, '.in-nowhere');

      expect(amount.value).toBe(0);
    });

    it('ignores downward wheel while the body still has room to scroll', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.inMiddle });

      wheel(container, 100);

      expect(amount.value).toBe(0);
    });

    it('ignores upward wheel while the body is not at the top', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, -100);

      expect(amount.value).toBe(0);
    });

    it('does nothing when neither scrollDetails nor a scroll element is available', () => {
      const { container, amount } = mountHost();

      wheel(container, 100);

      expect(amount.value).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('accumulating displacement', () => {
    it('accumulates downward overscroll at the bottom, at 15% of the wheel delta', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 100);

      expect(amount.value).toBeCloseTo(15);
    });

    it('accumulates upward overscroll at the top, as a negative displacement', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atTop });

      wheel(container, -100);

      expect(amount.value).toBeCloseTo(-15);
    });

    it('accumulates across consecutive wheel events', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 100);
      wheel(container, 100);

      expect(amount.value).toBeCloseTo(30);
    });

    it('accepts wheel events from the summary bar as well', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 100, '.in-summary');

      expect(amount.value).toBeCloseTo(15);
    });

    it('clamps downward displacement at 60px', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 10_000);

      expect(amount.value).toBe(60);
    });

    it('clamps upward displacement at -60px', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atTop });

      wheel(container, -10_000);

      expect(amount.value).toBe(-60);
    });

    it('accumulates downward while loading even in the middle of the list', () => {
      // Pulling down during a load is how the grid asks for the next page, so the bottom-edge
      // requirement is deliberately waived while `loading` is true.
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.inMiddle, loading: true });

      wheel(container, 100);

      expect(amount.value).toBeCloseTo(15);
    });

    it('falls back to the scroll element metrics when scrollDetails is missing', () => {
      // scrollTop + clientHeight === scrollHeight: the element reports itself at the bottom.
      const { container, amount } = mountHost({ scrollEl: { scrollTop: 500, scrollHeight: 1000, clientHeight: 500 } });

      wheel(container, 100);

      expect(amount.value).toBeCloseTo(15);
    });

    it('detects the top edge through the scroll element fallback too', () => {
      const { container, amount } = mountHost({ scrollEl: { scrollTop: 0, scrollHeight: 1000, clientHeight: 500 } });

      wheel(container, -100);
      // Downward is rejected by the same fixture: 1000 - 0 > 500 + 5, so it is not at the bottom.
      wheel(container, 100);

      expect(amount.value).toBeCloseTo(-15);
    });
  });

  // -------------------------------------------------------------------------
  describe('threshold', () => {
    // 50% of the 60px maximum = 30px.
    const halfway = { scrollDetails: scrollPositions.bothEnds, threshold: 50 };

    it('never fires when no threshold is configured', () => {
      const { container, onTrigger } = mountHost({ scrollDetails: scrollPositions.bothEnds });

      wheel(container, 10_000);

      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('stays silent while the displacement is below the threshold', () => {
      const { container, onTrigger } = mountHost(halfway);

      wheel(container, 100); // 15px, half of the 30px threshold

      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('fires with the signed displacement once the threshold is crossed', () => {
      const { container, onTrigger } = mountHost(halfway);

      wheel(container, 10_000);

      expect(onTrigger).toHaveBeenCalledTimes(1);
      expect(onTrigger).toHaveBeenCalledWith(60);
    });

    it('reports a negative displacement when the gesture is upward', () => {
      const { container, onTrigger } = mountHost(halfway);

      wheel(container, -10_000);

      expect(onTrigger).toHaveBeenCalledWith(-60);
    });

    it('does not fire again while the displacement stays above the threshold', () => {
      const { container, onTrigger } = mountHost(halfway);

      wheel(container, 10_000);
      wheel(container, 10_000);
      wheel(container, 10_000);

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('does not fire again within a second, even after dropping below the threshold', () => {
      const { container, onTrigger, amount } = mountHost(halfway);

      wheel(container, 10_000); // fires
      wheel(container, -300); // back down to 15px, below the threshold, re-arming the latch
      expect(amount.value).toBeCloseTo(15);
      wheel(container, 10_000); // crosses again, but too soon

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('fires again once a second has passed and the threshold is crossed anew', () => {
      const { container, onTrigger } = mountHost(halfway);

      wheel(container, 10_000); // fires
      wheel(container, -300); // re-arms the latch
      vi.advanceTimersByTime(1_000);
      wheel(container, 10_000);

      expect(onTrigger).toHaveBeenCalledTimes(2);
    });

    it('re-arms the latch while the displacement decays past the threshold', () => {
      const { container, onTrigger } = mountHost(halfway);

      wheel(container, 10_000); // fires at 60px
      vi.advanceTimersByTime(IDLE_MS);
      runFrame(1_000); // decay starts from 60px
      runFrame(1_200); // decay complete, displacement back to 0 — below the threshold

      vi.advanceTimersByTime(1_000);
      wheel(container, 10_000);

      expect(onTrigger).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  describe('decay', () => {
    it('does not decay while the user keeps scrolling', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 100);
      vi.advanceTimersByTime(IDLE_MS - 1);

      expect(pendingFrames).toHaveLength(0);
      expect(amount.value).toBeCloseTo(15);
    });

    it('animates back to zero over 200ms once the gesture ends', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 400); // 60px
      vi.advanceTimersByTime(IDLE_MS);

      runFrame(1_000); // first frame only establishes the start timestamp
      expect(amount.value).toBeCloseTo(60);

      runFrame(1_100); // halfway through the 200ms animation
      expect(amount.value).toBeCloseTo(30);

      runFrame(1_200);
      expect(amount.value).toBe(0);
      expect(pendingFrames).toHaveLength(0);
    });

    it('restarts the idle countdown on every wheel event', () => {
      const { container } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 100);
      vi.advanceTimersByTime(150);
      wheel(container, 100); // resets the countdown
      vi.advanceTimersByTime(150);
      expect(pendingFrames).toHaveLength(0);

      vi.advanceTimersByTime(50);
      expect(pendingFrames).toHaveLength(1);
    });

    it('cancels an in-flight decay when the user scrolls again', () => {
      const { container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 400);
      vi.advanceTimersByTime(IDLE_MS);
      runFrame(1_000);
      runFrame(1_100); // down to 30px, another frame pending

      wheel(container, 100);

      expect(cancelFrameSpy).toHaveBeenCalled();
      expect(pendingFrames).toHaveLength(0);
      // The new gesture picks up from wherever the decay had got to.
      expect(amount.value).toBeCloseTo(45);
    });
  });

  // -------------------------------------------------------------------------
  describe('cleanup on unmount', () => {
    it('stops responding to wheel events', () => {
      const { wrapper, container, amount } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wrapper.unmount();
      wheel(container, 100);

      expect(amount.value).toBe(0);
    });

    it('drops the pending idle timer, so no decay starts afterwards', () => {
      const { wrapper, container } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 100);
      wrapper.unmount();
      vi.advanceTimersByTime(IDLE_MS);

      expect(pendingFrames).toHaveLength(0);
    });

    it('cancels a decay that is still in flight', () => {
      const { wrapper, container } = mountHost({ scrollDetails: scrollPositions.atBottom });

      wheel(container, 400);
      vi.advanceTimersByTime(IDLE_MS);
      expect(pendingFrames).toHaveLength(1);

      wrapper.unmount();

      expect(cancelFrameSpy).toHaveBeenCalled();
      expect(pendingFrames).toHaveLength(0);
    });
  });
});
