/**
 * @file incoming-arc.spec.ts
 *
 * Tests for `IncomingArc` (incoming-arc.vue) — the glow the grid flashes at its top or bottom
 * edge when records arrive outside the viewport.
 *
 * The component owns no state the grid can see; everything it does shows up as the opacity of
 * the wave element. Two behaviours are worth protecting:
 *
 *  - **Flash intensity backs off under pressure.** A stream of arrivals less than 1.5 s apart
 *    would otherwise strobe, so each consecutive flash starts dimmer than the last, down to a
 *    floor of 15% of `maxOpacity`. A gap of 1.5 s means the burst is over and the next flash is
 *    at full strength again.
 *
 *  - **Only one fade runs at a time.** Each flash cancels the frame the previous fade was
 *    waiting on, and so does unmounting — a stray callback would write to a ref of a component
 *    that no longer exists.
 *
 * Both clocks are stubs. `Date.now` and `performance.now` read one test-controlled timeline, and
 * `requestAnimationFrame` is a queue the test pumps by hand, so every fade advances exactly as
 * far as a test says it does.
 */
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';

import IncomingArc from './incoming-arc.vue';

// ---------------------------------------------------------------------------
// Clock and animation-frame harness
// ---------------------------------------------------------------------------

/** The one timeline behind both Date.now() and performance.now(), in ms. */
let clock = 10_000;
let pendingFrames: { id: number; cb: FrameRequestCallback }[] = [];
let nextFrameId = 1;
let cancelFrameSpy: ReturnType<typeof vi.fn>;

/** Runs the frame the component is waiting on, at the current point on the timeline. */
function runFrame() {
  const frame = pendingFrames.shift();
  if (!frame) throw new Error('no animation frame was requested');
  frame.cb(clock);
}

/** The fade duration the component animates over. */
const FADE_MS = 800;

/** Reads the rendered opacity of the built-in wave. */
function waveOpacity(wrapper: ReturnType<typeof mountArc>) {
  const style = wrapper.find('.df-incoming-arc__wave').attributes('style') ?? '';
  return Number.parseFloat(style.split(':')[1]);
}

function mountArc(props: { direction?: 'top' | 'bottom'; maxOpacity?: number } = {}, slot?: string) {
  return mount(IncomingArc, {
    props: { trigger: 0, direction: 'top', ...props },
    slots: slot ? { default: slot } : {},
  });
}

/** Bumps the trigger counter the way the grid does when records land off-screen. */
async function flash(wrapper: ReturnType<typeof mountArc>) {
  await wrapper.setProps({ trigger: (wrapper.props('trigger') as number) + 1 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IncomingArc', () => {
  beforeEach(() => {
    clock = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    vi.spyOn(performance, 'now').mockImplementation(() => clock);

    pendingFrames = [];
    nextFrameId = 1;
    cancelFrameSpy = vi.fn((id: number) => { pendingFrames = pendingFrames.filter((f) => f.id !== id); });
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
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('rendering', () => {
    it('marks itself with the direction it belongs to', () => {
      expect(mountArc({ direction: 'top' }).classes()).toContain('df-incoming-arc--top');
      expect(mountArc({ direction: 'bottom' }).classes()).toContain('df-incoming-arc--bottom');
    });

    it('renders the wave invisible and idle until something arrives', () => {
      const wrapper = mountArc();

      expect(waveOpacity(wrapper)).toBe(0);
      expect(pendingFrames).toHaveLength(0);
    });

    it('renders slot content instead of the built-in wave when one is given', () => {
      const wrapper = mountArc({}, '<span class="custom-arc">custom</span>');

      expect(wrapper.find('.custom-arc').exists()).toBe(true);
      expect(wrapper.find('.df-incoming-arc__wave').exists()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('flashing', () => {
    it('flashes at full opacity when the trigger advances', async () => {
      const wrapper = mountArc();

      await flash(wrapper);

      expect(waveOpacity(wrapper)).toBe(1);
      expect(pendingFrames).toHaveLength(1);
    });

    it('caps the flash at maxOpacity', async () => {
      const wrapper = mountArc({ maxOpacity: 0.4 });

      await flash(wrapper);

      expect(waveOpacity(wrapper)).toBeCloseTo(0.4);
    });

    it('stays dark when the trigger is set to the value it already had', async () => {
      const wrapper = mountArc();

      await wrapper.setProps({ trigger: 0 });

      expect(waveOpacity(wrapper)).toBe(0);
      expect(pendingFrames).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('backing off during a burst', () => {
    it('dims each flash that follows within 1.5s of the previous one', async () => {
      const wrapper = mountArc();

      await flash(wrapper);
      expect(waveOpacity(wrapper)).toBe(1);

      clock += 100;
      await flash(wrapper);
      expect(waveOpacity(wrapper)).toBeCloseTo(0.85);

      clock += 100;
      await flash(wrapper);
      expect(waveOpacity(wrapper)).toBeCloseTo(0.7);
    });

    it('never dims below 15% of maxOpacity, however long the burst runs', async () => {
      const wrapper = mountArc();

      /* eslint-disable no-await-in-loop -- each flash must be observed before the next one */
      for (let i = 0; i < 20; i++) {
        clock += 100;
        await flash(wrapper);
      }
      /* eslint-enable no-await-in-loop */

      expect(waveOpacity(wrapper)).toBeCloseTo(0.15);
    });

    it('scales the backed-off flash by maxOpacity as well', async () => {
      const wrapper = mountArc({ maxOpacity: 0.4 });

      await flash(wrapper);
      clock += 100;
      await flash(wrapper);

      expect(waveOpacity(wrapper)).toBeCloseTo(0.34); // 0.4 × 0.85
    });

    it('returns to full opacity once the arrivals are 1.5s apart', async () => {
      const wrapper = mountArc();

      await flash(wrapper);
      clock += 100;
      await flash(wrapper);
      expect(waveOpacity(wrapper)).toBeCloseTo(0.85);

      clock += 1_500;
      await flash(wrapper);

      expect(waveOpacity(wrapper)).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('fading out', () => {
    it('fades to nothing over 800ms', async () => {
      const wrapper = mountArc();
      await flash(wrapper);

      runFrame(); // the first frame lands on the same timestamp the fade started at
      await wrapper.vm.$nextTick();
      expect(waveOpacity(wrapper)).toBe(1);

      clock += FADE_MS / 2;
      runFrame();
      await wrapper.vm.$nextTick();
      expect(waveOpacity(wrapper)).toBeCloseTo(0.5);

      clock += FADE_MS / 2;
      runFrame();
      await wrapper.vm.$nextTick();
      expect(waveOpacity(wrapper)).toBe(0);
    });

    it('stops asking for frames once the fade is done', async () => {
      const wrapper = mountArc();
      await flash(wrapper);

      runFrame();
      clock += FADE_MS;
      runFrame();

      expect(pendingFrames).toHaveLength(0);
    });

    it('fades from the dimmed level when a flash interrupts a fade', async () => {
      const wrapper = mountArc();
      await flash(wrapper);
      runFrame();
      clock += FADE_MS / 2;
      runFrame(); // halfway down

      clock += 100;
      await flash(wrapper);
      expect(cancelFrameSpy).toHaveBeenCalled();
      expect(pendingFrames).toHaveLength(1); // the interrupted fade left nothing behind

      // The new fade starts from the dimmed peak, not from where the old one had got to.
      expect(waveOpacity(wrapper)).toBeCloseTo(0.85);
      clock += FADE_MS;
      runFrame();
      await wrapper.vm.$nextTick();
      expect(waveOpacity(wrapper)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('cleanup on unmount', () => {
    it('cancels a fade that is still running', async () => {
      const wrapper = mountArc();
      await flash(wrapper);
      expect(pendingFrames).toHaveLength(1);

      wrapper.unmount();

      expect(cancelFrameSpy).toHaveBeenCalled();
      expect(pendingFrames).toHaveLength(0);
    });

    it('does not cancel anything when no fade is running', () => {
      mountArc().unmount();

      expect(cancelFrameSpy).not.toHaveBeenCalled();
    });
  });
});
