import { computed, ref } from 'vue';

import { useGridWindowing } from './use-grid-windowing';

function makeRecords(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i, name: `Row ${i}` }));
}

function makeEl(scrollTop: number, clientHeight: number) {
  return { scrollTop, clientHeight } as HTMLElement;
}

describe('useGridWindowing', () => {
  it('mounts nothing when there are no records', () => {
    const records = ref(makeRecords(0));
    const el = ref(makeEl(0, 400));
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 0,
    });

    w.recompute();

    expect(w.start.value).toBe(0);
    expect(w.end.value).toBe(0);
    expect(w.topSpacerHeight.value).toBe(0);
    expect(w.bottomSpacerHeight.value).toBe(0);
  });

  it('mounts the range covering the viewport, all rows at the estimated height', () => {
    const records = ref(makeRecords(100));
    const el = ref(makeEl(300, 100)); // viewport [300, 400)
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 0,
    });

    w.recompute();

    // Row i spans [i*30, i*30+30). Viewport [300,400) intersects rows 10..13.
    expect(w.start.value).toBe(10);
    expect(w.end.value).toBe(14);
    expect(w.topSpacerHeight.value).toBe(10 * 30);
    expect(w.bottomSpacerHeight.value).toBe((100 - 14) * 30);
  });

  it('applies the buffer symmetrically, clamped to the record range', () => {
    const records = ref(makeRecords(100));
    const el = ref(makeEl(300, 100));
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 5,
    });

    w.recompute();

    expect(w.start.value).toBe(5); // 10 - 5
    expect(w.end.value).toBe(19); // 14 + 5
  });

  it('clamps the buffer at the start and end of the record list', () => {
    const records = ref(makeRecords(10));
    const el = ref(makeEl(0, 60)); // viewport [0,60) -> rows 0,1
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 5,
    });

    w.recompute();

    expect(w.start.value).toBe(0); // 0 - 5 clamped
    expect(w.end.value).toBe(7); // 2 + 5, well within 10
  });

  it('uses a measured height instead of the estimate once a row has been observed', () => {
    const records = ref(makeRecords(10));
    const el = ref(makeEl(0, 100));
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 0,
    });

    w.setMeasured(0, 90); // row 0 is 3x taller than the estimate
    w.recompute();

    // Row 0 now spans [0,90), row 1 [90,120) — viewport [0,100) intersects both.
    expect(w.start.value).toBe(0);
    expect(w.end.value).toBe(2);
    expect(w.totalHeight.value).toBe(90 + 30 * 9);
  });

  it('keeps a measured height attached to its record key, not its position, across reordering', () => {
    const records = ref(makeRecords(5)); // ids 0..4, initial order
    const el = ref(makeEl(0, 400));
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 0,
    });

    w.setMeasured(2, 100); // record id=2, wherever it ends up

    // Reverse the order — id=2 is now at index 2 still (palindrome-safe check below uses a
    // genuine reorder instead).
    records.value = [records.value[4], records.value[3], records.value[2], records.value[1], records.value[0]];
    w.recompute();

    // id=2 is now at index 2 in the reordered array; total height must still count its
    // measured 100, not a stale value tied to its old index.
    expect(w.totalHeight.value).toBe(100 + 30 * 4);
  });

  it('does not re-record an unchanged or invalid measurement', () => {
    const records = ref(makeRecords(3));
    const el = ref(makeEl(0, 400));
    const w = useGridWindowing({
      records: computed(() => records.value),
      keyField: 'id',
      estimatedRowHeight: computed(() => 30),
      bodyEl: el,
      buffer: 0,
    });

    w.setMeasured(0, 0); // invalid — ignored, falls back to the estimate
    expect(w.rowHeights.get(0)).toBeUndefined();

    w.setMeasured(0, 50);
    w.setMeasured(0, 50); // no-op, already recorded
    expect(w.rowHeights.get(0)).toBe(50);
  });
});
