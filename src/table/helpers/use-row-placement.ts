/**
 * @file use-row-placement.ts
 *
 * CSS custom-property math for placing a record's cells on a shared grid. Once every row's cells
 * are direct items of one grid (instead of each row being its own independent grid), plain CSS
 * auto-placement has no notion of "record boundaries" — a record's cells have to be placed on
 * grid rows explicitly, relative to the record's own index and how many grid rows its layout's
 * card occupies (`rowsPerRecord`, from `ResponsiveColumnDefinition.rows`).
 *
 * `--row-base` is deliberately a row *line number offset*, not a pixel offset — CSS grid line
 * numbers are ordinal, so this placement doesn't depend on knowing any row's rendered height.
 */

export function rowBaseVars(recordIndex: number, rowsPerRecord: number): Record<string, string> {
  return {
    '--row-base': String(recordIndex * rowsPerRecord),
    '--rows-per-record': String(rowsPerRecord),
  };
}

export function headerRowBaseVars(rowsPerRecord: number): Record<string, string> {
  return rowBaseVars(0, rowsPerRecord);
}
