/**
 * @file longpress.ts
 *
 * Vue directive `v-longpress` for detecting long-press gestures on HTML elements.
 *
 * The directive fires the bound callback after the pointer has been held for 1 000 ms
 * (or a custom duration via the directive `arg`, e.g. `v-longpress:500` for 500 ms).
 *
 * Timer lifecycle:
 *  - Starts on `mousedown` (primary button only) or `touchstart`
 *  - Cancelled on `mouseup`, `click`, `mouseout`, `touchend`, or `touchcancel`
 *  - A `mousedown` within `COMPAT_MOUSE_MS` of a `touchend` is the browser's compatibility event for that tap and
 *    does not start the timer; a child that stops the tap's `click` would otherwise leave that timer running.
 *
 * All registered event listeners are cleaned up in the `unmounted` hook to prevent memory
 * leaks. Non-primary mouse buttons (right-click, middle-click, etc.) are ignored.
 */
import type { ObjectDirective, DirectiveBinding } from 'vue';

type LongPressElement = HTMLElement & {
  $longpress$: { start: (e: TouchEvent | MouseEvent) => void; end: () => void; touchEnd: () => void };
};

/** How long after a `touchend` a `mousedown` is taken as the compatibility event of that tap. */
export const COMPAT_MOUSE_MS = 800;

export const longpress: ObjectDirective<HTMLElement, (event: TouchEvent | MouseEvent) => void> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<(event: TouchEvent | MouseEvent) => void>) {
    if (typeof binding.value !== 'function') return;

    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTouchEnd = Number.NEGATIVE_INFINITY;

    const start = (e: TouchEvent | MouseEvent) => {
      if (e instanceof MouseEvent && e.button !== 0) return; // Ignore all buttons but primary
      if (e.type === 'mousedown' && Date.now() - lastTouchEnd < COMPAT_MOUSE_MS) return;

      if (pressTimer == null) {
        // default 1000ms before long-press is triggered
        pressTimer = setTimeout(() => binding.value(e), Number(binding.arg) || 1000);
      }
    };

    const end = () => {
      if (pressTimer != null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const touchEnd = () => {
      lastTouchEnd = Date.now();
      end();
    };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('click', end);
    el.addEventListener('mouseout', end);
    el.addEventListener('touchend', touchEnd);
    el.addEventListener('touchcancel', end);

    (<LongPressElement>el).$longpress$ = { start, end, touchEnd };
  },

  unmounted(el: HTMLElement) {
    const lp = (<LongPressElement>el).$longpress$;
    el.removeEventListener('mousedown', lp.start);
    el.removeEventListener('touchstart', lp.start);
    el.removeEventListener('mouseup', lp.end);
    el.removeEventListener('click', lp.end);
    el.removeEventListener('mouseout', lp.end);
    el.removeEventListener('touchend', lp.touchEnd);
    el.removeEventListener('touchcancel', lp.end);
  },
};

declare module 'vue' {
  interface ComponentCustomProperties {
    vLongpress: typeof longpress;
  }
}
