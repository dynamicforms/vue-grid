/**
 * @file shadow-metrics.ts
 *
 * Pure math behind the secondary shadow grid's per-field target width, kept separate from
 * shadow-grid.vue and df-grid.vue so it can be unit-tested without mounting a component or
 * faking layout geometry.
 *
 * A field's natural (max-content, unwrapped) width can be far wider than the field's *typical*
 * content needs, when a rare sample happens to be unusually long — an `auto` grid track sizes to
 * the widest max-content contribution among all sampled rows, so one outlier drags every row's
 * column width up with it. `fieldTargetWidth` instead asks how many lines the *typical* (median)
 * sample wraps into at the field's min-content width, and grows the target width from there, with
 * diminishing returns as that typical line count increases — a field whose median content already
 * fits on one line stays near its min-content width even if a rare sample wraps into ten lines;
 * a field whose typical content is itself consistently dense gets more room, but doubling how
 * dense the typical content is does not double the width demanded.
 */

export function median(values: number[]): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function lineCountFromHeights(scrollHeight: number, lineHeightPx: number): number {
  if (lineHeightPx <= 0) return 1;
  return Math.max(1, Math.round(scrollHeight / lineHeightPx));
}

export function computeLineHeightPx(el: Element): number {
  const style = window.getComputedStyle(el);
  const parsed = Number.parseFloat(style.getPropertyValue('line-height'));
  if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  const fontSize = Number.parseFloat(style.getPropertyValue('font-size'));
  return (Number.isNaN(fontSize) ? 16 : fontSize) * 1.2;
}

export function fieldTargetWidth(minContentWidth: number, maxContentWidth: number, medianLines: number): number {
  if (maxContentWidth <= minContentWidth) return maxContentWidth;
  const raw = minContentWidth * (1 + Math.log2(Math.max(medianLines, 1)));
  return Math.min(maxContentWidth, Math.max(minContentWidth, raw));
}

export type ShadowFieldMaxWidths = Record<string, number>;
export type ShadowFieldCompactMetrics = Record<string, { minContentWidth: number; medianLines: number }>;

// Rather than reconstruct a layout's total width from scratch (gaps, fixed-width tracks, column
// spans — all already correctly baked into the max-content measurement), this subtracts each
// field's own computed saving from that known-correct total. Fields present in only one of the
// two passes (a timing edge case) contribute no saving and are left at their max-content width.
export function computeLayoutTargetWidth(
  maxTotalWidth: number,
  compactTotalWidth: number,
  fieldMaxWidths: ShadowFieldMaxWidths,
  fieldCompactMetrics: ShadowFieldCompactMetrics,
): number {
  let savings = 0;
  for (const field of Object.keys(fieldMaxWidths)) {
    const compact = fieldCompactMetrics[field];
    if (!compact) continue;
    const target = fieldTargetWidth(compact.minContentWidth, fieldMaxWidths[field], compact.medianLines);
    savings += fieldMaxWidths[field] - target;
  }
  // Never adjust below what the fully-wrapped pass itself measured — that is the layout's own
  // floor, whatever gaps or fixed columns beyond individual fields it includes.
  return Math.max(compactTotalWidth, Math.ceil(maxTotalWidth - savings));
}
