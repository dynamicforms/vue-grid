/**
 * @file use-row-placement.ts
 *
 * CSS custom-property math for placing a record's cells on a shared grid. Once every row's cells
 * are direct items of one grid (instead of each row being its own independent grid), plain CSS
 * auto-placement has no notion of "record boundaries" — a record's cells have to be placed on
 * grid rows explicitly, relative to a record's position *within the mounted window* and how many
 * grid rows its layout's card occupies (`rowsPerRecord`, from `ResponsiveColumnDefinition.rows`).
 *
 * `--row-base` is deliberately a row *line number offset*, not a pixel offset — CSS grid line
 * numbers are ordinal, so this placement doesn't depend on knowing any row's rendered height.
 *
 * `windowIndex` is a record's position within the currently-mounted window (0 for the first
 * mounted record), not its absolute index in the full dataset — using the absolute index directly
 * would need as many grid row lines as `records.length * rowsPerRecord`, and Firefox stops
 * generating further implicit grid tracks past roughly 10,000 of them, silently collapsing every
 * row beyond that onto the same line. Windowing already mounts only a small slice of the dataset
 * at a time (see `use-grid-windowing.ts`), so line numbers derived from a record's position in
 * that slice — plus `lineOffset` for the one-row top spacer standing in for everything scrolled
 * past above it — stay small regardless of the dataset's total size.
 */

export function rowBaseVars(windowIndex: number, rowsPerRecord: number, lineOffset = 0): Record<string, string> {
  return {
    '--row-base': String(windowIndex * rowsPerRecord + lineOffset),
    '--rows-per-record': String(rowsPerRecord),
  };
}

export function headerRowBaseVars(rowsPerRecord: number): Record<string, string> {
  return rowBaseVars(0, rowsPerRecord);
}
