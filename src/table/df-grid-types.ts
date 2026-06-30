import { RowValue } from './cell-renderers';
import { type ResponsiveColumnDefinitions } from './columns';
import { FilterState, GridFilterEvent } from './columns-filtering';
import { GridSortEvent, SortState } from './columns-sorting';
import { GridClickEvent } from './df-grid-mouse-events';
import { SelectionEmits, SelectionProps } from './selection';

export interface GridProps extends SelectionProps {
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
   * Show the summary bar below the data rows. The bar also appears automatically when `loading` is
   * `true` or when `records` is empty.
   * @default false
   */
  showSummaryBar?: boolean;

  /**
   * Indicates that data is being fetched. When `true` the default summary bar shows a loading
   * spinner; the no-data indicator is suppressed even when `records` is empty.
   * @default false
   */
  loading?: boolean;

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

  /**
   * Percentage (0–100) of the maximum overscroll displacement (60 px) at which the
   * `excessive-scroll` event fires. For example, `80` means the event fires once the user has
   * scrolled 48 px past the edge of the list.
   *
   * When omitted or `undefined`, the event is never emitted and only the visual overscroll
   * indicator is shown.
   *
   * After firing, the event will not fire again until **both** conditions are met:
   * - at least 1 second has elapsed since the last firing, **and**
   * - the overscroll displacement has dropped back below the threshold.
   *
   * Use together with the `excessive-scroll` event to implement pull-to-refresh or
   * pull-to-load-more patterns.
   */
  excessiveScrollThreshold?: number;
}

export type RowIndex = number | 'header';

export interface GridEmits extends SelectionEmits {
  /**
   * Fired on a single click on a data row **when selection mode is inactive**. Not fired while
   * selection is active — clicks toggle row selection instead. Header clicks always fire regardless
   * of selection mode.
   */
  click: [data: GridClickEvent];

  /**
   * Fired on a double click anywhere in the grid (header or data rows).
   */
  dblclick: [data: GridClickEvent];

  /**
   * Fired when the user interacts with a sortable column header (single or shift-click).
   * `suggestedSort` is the sort state the grid would apply if sorting locally — use it as-is or
   * modify it before storing (e.g. to enforce a fixed primary sort key).
   * On columns marked with `sortExternal`, the grid never reorders `records` itself regardless.
   */
  sort: [data: GridSortEvent];

  /**
   * Fired on every change to any filter input (keystroke, clear, selection change).
   * `filterValues` is a plain `{ fieldName: value }` map ready to forward to a backend query.
   * On columns marked with `filterExternal`, the grid never applies a local predicate regardless.
   */
  filter: [data: GridFilterEvent];

  /**
   * Fired when the user scrolls within `loadDistance` px (default 200) of the end of the list
   * **and** `loading` is `false`. Use this to fetch and append the next page of records.
   * Setting `:loading="true"` while fetching suppresses duplicate events until the fetch completes.
   * Proxied directly from the underlying virtual-scroll `load` event.
   */
  load: [direction: 'vertical' | 'horizontal'];

  /**
   * Fired when the user overscrolls past the `excessiveScrollThreshold` percentage of the maximum
   * displacement (60 px). The payload is the signed overscroll amount in pixels at the moment of
   * firing: **positive** values indicate a downward overscroll (past the bottom of the list),
   * **negative** values indicate an upward overscroll (past the top).
   *
   * The event fires at most once per threshold crossing. To fire again, at least 1 second must
   * have elapsed **and** the overscroll must have fallen back below the threshold first.
   *
   * Requires `excessiveScrollThreshold` to be set; when omitted the event is never emitted.
   *
   * The visual overscroll indicator is always rendered regardless of this event.
   */
  'excessive-scroll': [amount: number];

  /**
   * Fired when the grid's `ResizeObserver` determines that a different responsive column layout
   * fits the available width. Use with `v-model:activeColumns`.
   */
  'update:activeColumns': [newValue: string];

  /**
   * Fired together with `filter` when the internal filter state changes. Use with
   * `v-model:filterState` for controlled filtering.
   */
  'update:filterState': [newValue: FilterState];

  /**
   * Fired together with `sort` when the internal sort state changes. Use with
   * `v-model:sortState` for controlled sorting.
   */
  'update:sortState': [newValue: SortState];

  /**
   * Fired when selection mode changes (e.g. user long-presses a row to start selection, or
   * cancels via the status bar). Use with `v-model:selectionMode`.
   * Inherited from `SelectionEmits`.
   */
  'update:selectionMode': [mode: import('./selection').SelectionMode];

  /**
   * Fired when the set of selected (or excluded) row keys changes. `action` describes what
   * changed: `'add'` — key added, `'remove'` — key removed, `'clear'` — entire set cleared.
   * Use with `v-model:selectionKeys`.
   * Inherited from `SelectionEmits`.
   */
  'update:selectionKeys': [keys: Set<any>, action: import('./selection').SelectionAction, key?: any];
}

export type GridEmit = <K extends keyof GridEmits>(
  event: K,
  ...args: GridEmits[K]
) => void;
