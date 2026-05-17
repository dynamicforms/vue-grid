import { RowValue } from './cell-renderers';
import { type ResponsiveColumnDefinitions } from './columns';
import { FilterState, GridFilterEvent } from './columns-filtering';
import { GridSortEvent, SortState } from './columns-sorting';
import { GridClickEvent } from './df-grid-mouse-events';

export interface GridProps {
  /**
   * Column layout definitions. Can be a flat `ColumnDefinitionsList` or a `ResponsiveColumnDefinition[]` array for
   * responsive layouts.
   */
  columns: ResponsiveColumnDefinitions;

  /**
   * Name of the currently active responsive layout (matches `cssClass` of a `ResponsiveColumnDefinition`). Use with
   * `v-model:activeColumns`.
   */
  activeColumns?: string;

  /** Array of row data objects. Each item must contain at least the property named by `keyField`. */
  records: RowValue[];

  /** Name of the property used as a unique row identifier (like a primary key). */
  keyField: string;

  /**
   * Number of rows rendered in the main shadow grid for column width measurement. The primary shadow grid is
   * responsible for real-time column width measuring so that all cells are rendered within correct boundaries and
   * available space is optimised for the content
   * @default 500
   */
  mainShadowCount?: number;

  /**
   * Number of rows rendered in secondary shadow grids (one per responsive layout).
   * The secondary shadow grids are used for measuring required widths for responsive layouts. The measurements will be
   * used for determining when a different layout should be used because the browser window had resized
   * @default 30
   */
  secondaryShadowCount?: number;

  /** External sort state. Use with `v-model:sortState` for controlled sorting. When omitted the grid sorts locally. */
  sortState?: SortState;

  /**
   * External filter state. Use with `v-model:filterState` for controlled filtering. When omitted the grid filters
   * locally.
   */
  filterState?: FilterState;

  /** Show the filter input row below the column headers. @default false */
  showFilterRow?: boolean;

  /**
   * Show the status bar below the filter row (displays active filter count).
   * @default false
   */
  showStatusBar?: boolean;

  /**
   * Returns CSS classes applied to each data row card. Receives the row data object and its 0-based index.
   * Return type matches Vue's `:class` binding — a string, an array of strings, or an object `{ className: boolean }`.
   *
   * When omitted, defaults to zebra striping: even rows get `'even'`, odd rows get `'odd'`.
   * Providing your own function replaces the default entirely.
   *
   * @example
   * // Highlight negative amounts, keep zebra striping elsewhere
   * :row-class="(item, index) => item.amount < 0 ? 'negative' : (index % 2 === 0 ? 'even' : 'odd')"
   *
   * @example
   * // Data-driven class stored in the record
   * :row-class="(item) => item.cssClass"
   */
  rowClass?: (item: RowValue, index: number) => string | string[] | Record<string, boolean>;
}

export type RowIndex = number | 'header';

export interface GridEmits {
  click: [data: GridClickEvent];
  dblclick: [data: GridClickEvent];
  sort: [data: GridSortEvent];
  filter: [data: GridFilterEvent];
  'update:activeColumns': [newValue: string];
  'update:filterState': [newValue: FilterState];
  'update:sortState': [newValue: SortState];
}

export type GridEmit = <K extends keyof GridEmits>(
  event: K,
  ...args: GridEmits[K]
) => void;
