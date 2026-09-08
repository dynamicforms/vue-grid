export interface ShadowGridMeasurements {
  totalWidth: number;
  columnWidths: string;
  // Present when the shadow was measured with `sizeTo="max-content"` (the default): each field's
  // own rendered width, unwrapped — every sampled row shares this width, since a grid track's
  // resolved size is uniform across its items.
  fieldMaxWidths?: Record<string, number>;
  // Present when the shadow was measured with `sizeTo="min-content"`: each field's narrowest
  // possible width (again uniform across rows) plus the median number of lines the sampled rows
  // wrapped into at that width — the typical-content signal `computeLayoutTargetWidth` uses.
  fieldCompactMetrics?: Record<string, { minContentWidth: number; medianLines: number }>;
}
