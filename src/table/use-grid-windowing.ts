/**
 * @file use-grid-windowing.ts
 *
 * Row virtualization for the shared body grid. Only records within (and a small buffer around)
 * the visible scroll viewport are mounted; the rest are represented by two spacer elements
 * (before/after the mounted window) whose `min-height` stands in for the height the un-mounted
 * records would have occupied.
 *
 * Height accounting is deliberately simple: a per-record measured-height map (keyed by
 * `keyField`, since sort/filter can reorder `records` — an index-keyed map would go stale the
 * moment the order changes), falling back to `estimatedRowHeight` for anything not yet
 * mounted/measured. No running average, no outlier detection — that responsibility is the
 * consuming app's: it can read `rowHeights` (exposed read-only) and adjust `estimatedRowHeight`
 * itself if it wants something smarter than a fixed estimate.
 *
 * Grid *placement* (`--row-base`) does not depend on any of this: a grid line number is ordinal,
 * not a pixel offset, so `recordIndex * rowsPerRecord` is correct regardless of which rows are
 * actually mounted. Only the spacers' `min-height` needs the height accounting above.
 */
import { computed, ComputedRef, reactive, Ref, ref } from 'vue';

import { RowValue } from './cell-renderers';

export interface GridWindowingOptions {
  records: ComputedRef<RowValue[]>;
  keyField: string;
  estimatedRowHeight: ComputedRef<number>;
  bodyEl: Ref<HTMLElement | null>;
  /** Extra records mounted above/below the strictly-visible range, for smoother scrolling. */
  buffer: number;
}

export function useGridWindowing(options: GridWindowingOptions) {
  const rowHeights = reactive(new Map<unknown, number>());

  function heightOf(key: unknown): number {
    return rowHeights.get(key) ?? options.estimatedRowHeight.value;
  }

  function setMeasured(key: unknown, height: number) {
    if (height > 0 && rowHeights.get(key) !== height) rowHeights.set(key, height);
  }

  const start = ref(0);
  const end = ref(0); // exclusive

  function recompute() {
    const el = options.bodyEl.value;
    const records = options.records.value;
    if (!el || records.length === 0) {
      start.value = 0;
      end.value = 0;
      return;
    }

    const viewTop = el.scrollTop;
    const viewBottom = viewTop + el.clientHeight;

    let offset = 0;
    let firstVisible = -1;
    let lastVisible = -1;
    for (let i = 0; i < records.length; i++) {
      const h = heightOf(records[i][options.keyField]);
      if (offset + h > viewTop && offset < viewBottom) {
        if (firstVisible === -1) firstVisible = i;
        lastVisible = i;
      }
      offset += h;
      if (offset >= viewBottom && firstVisible !== -1) break;
    }

    if (firstVisible === -1) {
      // Nothing intersects the viewport (e.g. scrolled past a shrinking dataset) — clamp to the
      // end so the next real scroll/update recovers rather than mounting nothing forever.
      start.value = Math.max(0, records.length - options.buffer);
      end.value = records.length;
      return;
    }
    start.value = Math.max(0, firstVisible - options.buffer);
    end.value = Math.min(records.length, lastVisible + 1 + options.buffer);
  }

  function sumHeights(records: RowValue[], from: number, to: number): number {
    let sum = 0;
    for (let i = from; i < to; i++) sum += heightOf(records[i][options.keyField]);
    return sum;
  }

  const topSpacerHeight = computed(() => sumHeights(options.records.value, 0, start.value));
  const bottomSpacerHeight = computed(() => sumHeights(options.records.value, end.value, options.records.value.length));
  const totalHeight = computed(() => sumHeights(options.records.value, 0, options.records.value.length));

  return {
    start,
    end,
    recompute,
    setMeasured,
    topSpacerHeight,
    bottomSpacerHeight,
    totalHeight,
    /** Read-only view for a consuming app that wants to build a smarter height estimate. */
    rowHeights: rowHeights as ReadonlyMap<unknown, number>,
  };
}
