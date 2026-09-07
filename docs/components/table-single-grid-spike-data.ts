// Data and column definitions for the single-grid column-sizing spike. Reuses the real data
// generator and column factory rather than inventing simplified stand-ins, so measured layout
// cost reflects realistic cell content (variable-length strings, variable-length arrays for
// genres/moods).
import { createColumn, filterColumns } from '../../src';
import { generateMusicLibrary, languagesMap } from './data-generator';

export function makeSpikeRecords(count: number) {
  return generateMusicLibrary(count);
}

// All columns use the 'plain' renderer, including numeric fields. The 'int' renderer needs each
// column registered into a per-grid `measurements` map via `gridColumnCreate` (see
// df-grid.vue's `columnRendererOptionsInternal`) for decimal-alignment bookkeeping unrelated to
// what this spike measures — reproducing that registration/cleanup lifecycle here would add real
// complexity for a renderer detail this spike doesn't care about, so numeric columns render as
// plain text instead (same realistic width, no alignment logic).
const allColumns = [
  createColumn('id', 'Id', 'plain', { cssClass: 'text-right' }),
  createColumn('title', 'Title', 'plain'),
  createColumn('artist', 'Artist', 'plain'),
  createColumn('year', 'Year', 'plain', { cssClass: 'text-right' }),
  createColumn('duration', 'Duration', 'plain', { cssClass: 'text-right' }),
  createColumn('genres', 'Genres', 'plain'),
  createColumn('rating', 'Rating', 'plain', { cssClass: 'text-right' }),
  createColumn('play_count', 'Play count', 'plain', { cssClass: 'text-right' }),
  createColumn('moods', 'Moods', 'plain'),
  createColumn('language', 'Languages', 'plain'),
];

// Every renderer (including 'plain') goes through `wrapWithPrePost`, which dereferences
// `options.preRender`/`options.postRender` without an optional-chain guard — production always
// normalizes `rendererOptions` to at least `{}` before a column reaches grid-card
// (df-grid.vue's `columnRendererOptionsInternal`); replicate that normalization here.
const normalizedColumns = allColumns.map((c) => ({ ...c, rendererOptions: c.rendererOptions ?? {} }));

// Uniform layout: 10 columns, single row per record, no cross-row spanning — matches
// table-basic.vue's `single-line` shape (selection/actions columns dropped, out of scope here).
export const uniformColumns = normalizedColumns;

// Wrapping layout: a self-contained 3-row-per-record card, built for this spike rather than a
// literal port of table-basic.vue's `three-row` set (which pulls in selection/action-icon logic
// unrelated to column sizing). Same structural pattern — some cells span multiple columns and are
// placed on a specific row of the card — which is what exercises the `--row-base` relative
// placement this spike is testing. Every cell gets an explicit row (see
// table-single-grid-spike-candidate.vue): title/artist/year/duration on row 1, genres/rating on
// row 2, moods on row 3.
export const wrappingColumns = filterColumns(normalizedColumns, ['title', 'artist', 'year', 'duration', 'genres', 'rating', 'moods']);

export { languagesMap };
