/**
 * @file use-recently-added.spec.ts
 *
 * Tests for `useRecentlyAdded` (use-recently-added.ts), the composable behind the grid's
 * "records just arrived" affordances.
 *
 * It answers three questions for the grid:
 *
 *  - **which rows are new** (`isPendingAdd` / `timeSinceAdded`), so a row can be animated in.
 *    `timeSinceAdded` is a plain function over a Map, so it is re-evaluated on a rAF ticker —
 *    the tests check that the ticker really is a reactive dependency, because without it a
 *    computed reading it would cache its first value and the animation would freeze.
 *
 *  - **whether the user could see them arrive** (`topArcFlashTick` / `bottomArcFlashTick`).
 *    The visible range is captured when the records are added, not when the check runs a tick
 *    later, because by then the virtual scroller may have shifted it. The index lookup, on the
 *    other hand, must happen after the tick, when `records` includes the new rows. Several
 *    tests below pin that ordering down.
 *
 *  - **whether a click should be believed** (`isAdding`), which suppresses taps for 300 ms
 *    while the content shifts under the user's finger.
 *
 * Timers and requestAnimationFrame are faked: the composable's whole contract is about when
 * things happen, and a real 250 ms would be 250 ms of test.
 */
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
import type { Ref } from 'vue';

import type { RowValue } from './cell-renderers';
import { useRecentlyAdded } from './use-recently-added';
import type { UseRecentlyAdded } from './use-recently-added';

// ---------------------------------------------------------------------------
// requestAnimationFrame stub
//
// The ticker re-schedules itself for as long as entries are pending, so the frames have to be
// pumped by hand — a passthrough to a timer would run away.
// ---------------------------------------------------------------------------

let rafQueue: Map<number, FrameRequestCallback>;
let rafNextId: number;
let rafCancelled: number[];

function flushFrames(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = [...rafQueue.entries()];
    rafQueue.clear();
    pending.forEach(([, cb]) => cb(i));
  }
}

// ---------------------------------------------------------------------------
// Mounting
// ---------------------------------------------------------------------------

interface Harness {
  api: UseRecentlyAdded;
  records: Ref<RowValue[]>;
  unmount: () => void;
}

function mountComposable(initialRecords: RowValue[] = [], keyField: string | Ref<string> = 'id'): Harness {
  const records = ref<RowValue[]>(initialRecords);
  let api: UseRecentlyAdded;

  // onUnmounted only runs inside a component instance, so the composable needs a host.
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useRecentlyAdded(records, keyField);
        return () => h('div');
      },
    }),
  );

  return { api: api!, records, unmount: () => wrapper.unmount() };
}

const rows = (count: number) => Array.from({ length: count }, (_, i) => ({ id: i, name: `Row ${i}` }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRecentlyAdded', () => {
  beforeEach(() => {
    rafQueue = new Map();
    rafNextId = 1;
    rafCancelled = [];

    // Fake the clock but not the frames: sinon's fake rAF fires on its own 16ms cadence when
    // timers are advanced, which would tick the composable's ticker behind the tests' back.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = rafNextId++;
      rafQueue.set(id, cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCancelled.push(id);
      rafQueue.delete(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  describe('pending entries', () => {
    it('marks added pks as pending', () => {
      const { api } = mountComposable(rows(3));

      expect(api.isPendingAdd(1)).toBe(false);
      api.addRecentlyAdded([1]);
      expect(api.isPendingAdd(1)).toBe(true);
    });

    it('forgets them after the default 250ms', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      vi.advanceTimersByTime(249);
      expect(api.isPendingAdd(1)).toBe(true);

      vi.advanceTimersByTime(1);
      expect(api.isPendingAdd(1)).toBe(false);
    });

    it('honours a caller-supplied timeout', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1], 1_000);

      vi.advanceTimersByTime(250);
      expect(api.isPendingAdd(1)).toBe(true);

      vi.advanceTimersByTime(750);
      expect(api.isPendingAdd(1)).toBe(false);
    });

    it('expires each pk on its own schedule', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);
      vi.advanceTimersByTime(100);
      api.addRecentlyAdded([2]);

      vi.advanceTimersByTime(150); // 250ms for pk 1, only 150ms for pk 2
      expect(api.isPendingAdd(1)).toBe(false);
      expect(api.isPendingAdd(2)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('timeSinceAdded', () => {
    it('reports the age of a pending entry', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      vi.advanceTimersByTime(120);

      expect(api.timeSinceAdded(1)).toBe(120);
    });

    it('returns null for a pk that was never added', () => {
      const { api } = mountComposable(rows(3));

      expect(api.timeSinceAdded(99)).toBeNull();
    });

    it('returns null once the entry has expired', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      vi.advanceTimersByTime(250);

      expect(api.timeSinceAdded(1)).toBeNull();
    });

    it('re-evaluates in a computed as frames tick, so animations keep moving', () => {
      const { api } = mountComposable(rows(3));
      const age = computed(() => api.timeSinceAdded(1));

      api.addRecentlyAdded([1]);
      expect(age.value).toBe(0);

      // Without the ticker dependency the computed would keep serving this first value.
      vi.advanceTimersByTime(50);
      flushFrames();

      expect(age.value).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  describe('rAF ticker', () => {
    it('keeps requesting frames while entries are pending', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      expect(rafQueue.size).toBe(1);
      flushFrames();
      expect(rafQueue.size).toBe(1); // rescheduled itself
    });

    it('stops requesting frames once the last entry expires', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      vi.advanceTimersByTime(250);
      flushFrames();

      expect(rafQueue.size).toBe(0);
    });

    it('does not start a second ticker for a second add', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);
      api.addRecentlyAdded([2]);

      expect(rafQueue.size).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('isAdding', () => {
    it('is raised for the duration of the content shift', () => {
      const { api } = mountComposable(rows(3));

      expect(api.isAdding.value).toBe(false);
      api.addRecentlyAdded([1]);
      expect(api.isAdding.value).toBe(true);

      vi.advanceTimersByTime(300);
      expect(api.isAdding.value).toBe(false);
    });

    it('is extended by a follow-up add rather than expiring on the first schedule', () => {
      const { api } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      vi.advanceTimersByTime(200);
      api.addRecentlyAdded([2]);
      vi.advanceTimersByTime(200); // 400ms since the first add, 200ms since the second

      expect(api.isAdding.value).toBe(true);

      vi.advanceTimersByTime(100);
      expect(api.isAdding.value).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('arc flashes', () => {
    it('flashes the top arc for a record that landed above the viewport', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 4, end: 8 });

      api.addRecentlyAdded([2]); // index 2 < start
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(1);
      expect(api.bottomArcFlashTick.value).toBe(0);
    });

    it('flashes the bottom arc for a record that landed below the viewport', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 0, end: 4 });

      api.addRecentlyAdded([7]); // index 7 >= end
      await nextTick();

      expect(api.bottomArcFlashTick.value).toBe(1);
      expect(api.topArcFlashTick.value).toBe(0);
    });

    it('stays quiet for a record the user can already see', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 0, end: 6 });

      api.addRecentlyAdded([3]);
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(0);
      expect(api.bottomArcFlashTick.value).toBe(0);
    });

    it('flashes both arcs when records landed on either side', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 4, end: 6 });

      api.addRecentlyAdded([1, 8]);
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(1);
      expect(api.bottomArcFlashTick.value).toBe(1);
    });

    it('flashes once per side, however many records landed there', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 5, end: 8 });

      api.addRecentlyAdded([0, 1, 2]);
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(1);
    });

    it('ignores a pk that is not in the records at all', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 4, end: 8 });

      api.addRecentlyAdded([999]);
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(0);
      expect(api.bottomArcFlashTick.value).toBe(0);
    });

    it('ignores a pk whose entry expired before the check ran', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 4, end: 8 });

      api.addRecentlyAdded([2], 0);
      vi.advanceTimersByTime(1); // expiry timer runs before the nextTick microtask below
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(0);
    });

    it('judges by the range that was visible when the records arrived', async () => {
      const { api } = mountComposable(rows(10));
      api.setVisibleRange({ start: 4, end: 8 });

      api.addRecentlyAdded([2]);
      // The scroller reports a new range before the check runs - as it does when the added
      // records shift the viewport. The decision must still use the range from arrival time.
      api.setVisibleRange({ start: 0, end: 4 });
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(1);
    });

    it('finds records that only entered the list after the add', async () => {
      const { api, records } = mountComposable(rows(3));
      api.setVisibleRange({ start: 1, end: 3 });

      records.value = [{ id: 42, name: 'new' }, ...rows(3)]; // pk 42 lands at index 0
      api.addRecentlyAdded([42]);
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(1);
    });

    it('resolves pks through a keyField given as a ref', async () => {
      const keyField = ref('name');
      const { api } = mountComposable(rows(10), keyField);
      api.setVisibleRange({ start: 4, end: 8 });

      api.addRecentlyAdded(['Row 1']);
      await nextTick();

      expect(api.topArcFlashTick.value).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('manual triggers', () => {
    it('triggerTopArc / triggerBottomArc flash without any records changing', () => {
      const { api } = mountComposable(rows(3));

      api.triggerTopArc();
      api.triggerBottomArc();
      api.triggerBottomArc();

      expect(api.topArcFlashTick.value).toBe(1);
      expect(api.bottomArcFlashTick.value).toBe(2);
    });

    it('exposes the visible range the grid last reported', () => {
      const { api } = mountComposable(rows(3));

      api.setVisibleRange({ start: 2, end: 9 });

      expect(api.visibleRange.value).toEqual({ start: 2, end: 9 });
    });
  });

  // -------------------------------------------------------------------------
  describe('teardown', () => {
    it('cancels the pending frame on unmount', () => {
      const { api, unmount } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);
      const pendingFrame = [...rafQueue.keys()][0];

      unmount();

      expect(rafCancelled).toContain(pendingFrame);
    });

    it('drops the isAdding timer on unmount, so nothing writes to a dead component', () => {
      const { api, unmount } = mountComposable(rows(3));
      api.addRecentlyAdded([1]);

      unmount();
      vi.advanceTimersByTime(300);

      // The timer never fired: isAdding is still raised rather than having been reset.
      expect(api.isAdding.value).toBe(true);
    });

    it('unmounts cleanly when nothing was ever added', () => {
      const { unmount } = mountComposable(rows(3));

      expect(() => unmount()).not.toThrow();
      expect(rafCancelled).toHaveLength(0);
    });
  });
});
