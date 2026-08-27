/**
 * @file longpress.spec.ts
 *
 * Tests for the `v-longpress` Vue directive (longpress.ts).
 *
 * The directive registers `mousedown` / `touchstart` listeners on the host element and
 * fires the bound callback if the pointer remains pressed for the configured duration
 * (default 1 000 ms, override via directive `arg`).  The timer is cancelled by any of
 * `click`, `mouseout`, `touchend`, or `touchcancel`.
 *
 * What this file tests
 * --------------------
 * 1. **Fires after timeout** — callback is invoked once the full duration elapses after
 *    `mousedown` (using fake timers so tests don't take a real second).
 *
 * 2. **Cancelled by early release** — callback is NOT invoked when:
 *      - `mouseout` fires before the timeout
 *      - `click` fires before the timeout (the user released the button)
 *      - `touchend` fires before the timeout
 *      - `touchcancel` fires before the timeout
 *
 * 3. **Custom duration** — the directive `arg` overrides the default 1 000 ms threshold.
 *
 * 4. **Primary button only** — non-primary mouse buttons (right-click = button 2,
 *    middle-click = button 1) do NOT start the timer.
 *
 * 5. **Non-function binding** — when the bound value is not a function, the directive
 *    mounts without error and no listeners are added (so events are silently ignored).
 *
 * 6. **Cleanup on unmount** — after `unmounted` is called, events on the element no longer
 *    trigger the callback.
 */
import { vi } from 'vitest';

import { longpress } from './longpress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mounts the directive on a freshly created <div> with the given binding value and
 * optional arg (custom duration in ms as a string, matching Vue's directive arg type).
 */
function mountDirective(callback: (e: MouseEvent | TouchEvent) => void, arg?: string): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  longpress.mounted!(el, { value: callback, arg } as any, null as any, null as any);
  return el;
}

/** Fires `mousedown` with the given button index (0 = primary). */
function fireMouseDown(el: HTMLElement, button = 0) {
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button }));
}

/** Fires `touchstart` with a single active touch. */
function fireTouchStart(el: HTMLElement) {
  el.dispatchEvent(
    new TouchEvent('touchstart', {
      bubbles: true,
      touches: [{ identifier: 1, target: el } as unknown as Touch],
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('longpress directive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Remove any lingering elements added by tests
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  describe('fires callback after the configured timeout', () => {
    it('fires after default 1 000 ms on mousedown (primary button)', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireMouseDown(el);
      vi.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('fires after a custom duration specified via directive arg', () => {
      const cb = vi.fn();
      const el = mountDirective(cb, '300');

      fireMouseDown(el);
      vi.advanceTimersByTime(299);
      expect(cb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('fires after default 1 000 ms on touchstart', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireTouchStart(el);
      vi.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('passes the original event to the callback', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireMouseDown(el);
      vi.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledWith(expect.any(MouseEvent));
    });
  });

  // -------------------------------------------------------------------------
  describe('does NOT fire when cancelled before the timeout', () => {
    it('cancels on mouseout before timeout elapses', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireMouseDown(el);
      vi.advanceTimersByTime(500);
      el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      vi.advanceTimersByTime(600);

      expect(cb).not.toHaveBeenCalled();
    });

    it('cancels on click before timeout elapses (user released button)', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireMouseDown(el);
      vi.advanceTimersByTime(500);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(600);

      expect(cb).not.toHaveBeenCalled();
    });

    it('cancels on touchend before timeout elapses', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireTouchStart(el);
      vi.advanceTimersByTime(500);
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
      vi.advanceTimersByTime(600);

      expect(cb).not.toHaveBeenCalled();
    });

    it('cancels on touchcancel before timeout elapses', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireTouchStart(el);
      vi.advanceTimersByTime(500);
      el.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }));
      vi.advanceTimersByTime(600);

      expect(cb).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('ignores non-primary mouse buttons', () => {
    it('does not start the timer on right-click (button 2)', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireMouseDown(el, 2); // right-click
      vi.advanceTimersByTime(1500);

      expect(cb).not.toHaveBeenCalled();
    });

    it('does not start the timer on middle-click (button 1)', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      fireMouseDown(el, 1); // middle-click
      vi.advanceTimersByTime(1500);

      expect(cb).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('non-function binding value', () => {
    it('mounts without throwing when binding value is not a function', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      expect(() => {
        longpress.mounted!(el, { value: 'not-a-function' } as any, null as any, null as any);
      }).not.toThrow();
    });

    it('dispatching events after non-function binding does not throw', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      longpress.mounted!(el, { value: null } as any, null as any, null as any);

      expect(() => {
        fireMouseDown(el);
        vi.advanceTimersByTime(1500);
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe('cleanup on unmount', () => {
    it('callback is no longer triggered after unmounted() is called', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      longpress.unmounted!(el, null as any, null as any, null as any);

      fireMouseDown(el);
      vi.advanceTimersByTime(1500);

      expect(cb).not.toHaveBeenCalled();
    });

    it('unmounted does not throw on elements without attached state', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      // Mount then unmount cleanly
      longpress.mounted!(el, { value: vi.fn() } as any, null as any, null as any);

      expect(() => {
        longpress.unmounted!(el, null as any, null as any, null as any);
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    it('does not fire multiple times if mousedown is called repeatedly while timer runs', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      // First mousedown starts the timer; second while timer is running is a no-op
      fireMouseDown(el);
      fireMouseDown(el);
      vi.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not throw when a cancel event fires with no active timer', () => {
      const cb = vi.fn();
      const el = mountDirective(cb);

      // Fire cancel events without any prior mousedown — pressTimer is null, end() is a no-op
      expect(() => {
        el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
      }).not.toThrow();

      vi.advanceTimersByTime(1000);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
