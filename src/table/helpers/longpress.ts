import type { Directive, DirectiveBinding } from 'vue'

type LongPressElement = HTMLElement & { $longpress$: { start: (e: TouchEvent | MouseEvent) => void; end: () => void } };

// eslint-disable-next-line import/prefer-default-export
export const longpress: Directive<HTMLElement, (event: Event) => void> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<(event: Event) => void>) {
    if (typeof binding.value !== 'function') return;

    let pressTimer: ReturnType<typeof setTimeout> | null = null;

    const start = (e: TouchEvent | MouseEvent) => {
      if (e instanceof MouseEvent && e.button !== 0) return; // Ignore all buttons but primary

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

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start);
    el.addEventListener('click', end);
    el.addEventListener('mouseout', end);
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);

    (<LongPressElement> el).$longpress$ = { start, end };
  },

  unmounted(el: HTMLElement) {
    const lp = (<LongPressElement> el).$longpress$;
    el.removeEventListener('mousedown', lp.start);
    el.removeEventListener('touchstart', lp.start);
    el.removeEventListener('click', lp.end);
    el.removeEventListener('mouseout', lp.end);
    el.removeEventListener('touchend', lp.end);
    el.removeEventListener('touchcancel', lp.end);
  },
};

declare module 'vue' {
  interface ComponentCustomProperties {
    vLongpress: typeof longpress
  }
}
