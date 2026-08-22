# Changelog

All notable changes to `@dynamicforms/vue-grid` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-08-22

### Changed
- The peer range on `@dynamicforms/vuetify-inputs` moves to `^0.10.0`. That release rebuilds
  `<df-rtf-editor>` on TipTap instead of CKEditor 5, so the VitePress SSR plugin that stubbed out
  CKEditor's browser-only modules during pre-rendering (`docs/.vitepress/ssr-ckeditor-stub.ts`) has
  nothing left to stub and is removed along with its wiring in `docs/.vitepress/config.ts`.

## [0.3.0] - 2026-08-22

### Changed
- The peer ranges move to `@dynamicforms/vue-forms@^0.17.1` and `@dynamicforms/vuetify-inputs@^0.9.2`, and `vue`
  rises to `^3.5.2` with `engines.node` at `>=22`. The last two are floors the peer libraries themselves impose:
  the type declarations vue-tsc emits for `MessagesWidget` take a `DefineComponent` with 20 type arguments, and
  that shape is only available from Vue 3.5.2. The docs workspace carries the same floors, plus `vuetify@^3.9` as
  stated by vuetify-inputs 0.9.
- Filter state construction follows `Field.create()` being removed from vue-forms 0.6.0: `createFilterState()`
  now builds fields with `new Field()`. A field built with `value: null` reads back `null` instead of `undefined`,
  so `GridFilterEvent.filterValues` carries a `null` entry for a filterable column with no filter set, rather than
  omitting the key. Local filtering and the active-filter count treat both the same way, so what the grid filters
  is unchanged - only the documented shape of `filterValues` reflects the `null`.

## [0.2.0] - 2026-08-14

### Added
- Statement coverage raised from 74.94% to 95% with new specs for `use-excessive-scroll.ts`, `use-recently-added.ts`,
  `incoming-arc.vue`, `header-renderers.ts` and grid lifecycle behaviour (visible-range reporting, overflow
  learning, teardown), plus a dedicated auto-sizing spec and Playwright regression tests covering overlay and
  classic scrollbars.

### Fixed
- The grid no longer overflows its container in a Vuetify app. Column widths are measured on a hidden shadow
  grid, absolutely positioned against `.df-grid.container`; without `position: relative` on that container the
  shadow stretched to whatever ancestor happened to be positioned instead - `.v-application__wrap`, the full page
  width - and the widths measured there were copied onto rows that were only as wide as the actual container.
- Header column widths account for the scrollbar gutter correctly on both overlay and classic scrollbars. The
  scroller declared `scrollbar-gutter: stable`, but the reservation it gets does not match what the surrounding
  layout reserves: Chromium with overlay scrollbars still reserves roughly 15px for the gutter while the
  container around it reserves nothing, leaving the header short of the tracks it was given; Firefox reserves
  nothing for either. The scrollbar width is now measured directly off the scroller
  (`offsetWidth - clientWidth`), published as `--df-grid-scrollbar-width`, and consumed by the header as
  padding - re-measured on mount, on container resize, and whenever rows update, since incoming rows can make
  the scrollbar appear without a resize event.
- A row click or long-press resolves against the displayed (sorted and filtered) record list instead of the raw
  `records` prop. Rows carry their position in the displayed list as `data-idx`, but the mouse-event handler
  looked that position up in `records`; under any active sort or filter this pointed at the wrong record, so a
  click or long-press could select a different row than the one the pointer landed on.
- Selecting a row no longer forces every visible card to remount. Each column's render options carried a fresh
  `Symbol` keyed to the current selection mode, so toggling selection produced a new options object for every
  column on every card, even ones unaffected by the change.

## [0.1.8] - 2026-08-13

### Added
- `types` and `module` export conditions on the package manifest. Without `types`, TypeScript could not resolve
  `dist/index.d.ts` through the `.` export, so consumers got implicit `any` for the whole grid; `module` points
  bundlers that still read it at the ESM build instead of the UMD one.
- A GitHub Actions CI workflow: lint, test, build and docs build on two Node versions, incremental coverage
  reporting on pull requests, and a second job running the Playwright e2e suite against the docs dev server.

## [0.1.7] - 2026-08-01

### Added
- Column sorting: clicking a header cycles a column through ascending, descending and unsorted (skipping
  descending where a column disallows it), multiple columns can be sorted at once, and sort state can be used
  either as an uncontrolled internal state or as a `v-model:sortState` bound by the consumer. A `sort` event
  reports the clicked column and the suggested resulting sort state.
- Column filtering: any column can be marked `filterable` (a boolean for a plain string filter, or a
  `FilterConfig` choosing the field type - `string`, `number`, `boolean` or `date` - a list of choices, or a
  placeholder). Filter state is a vue-forms `Group` of `Field`s keyed by column name. A filter can be marked to
  be resolved on the backend instead of locally, in which case the grid emits the filter state for the consumer
  to act on rather than filtering the displayed rows itself.
- Row selection via `useSelection`, with four modes: `null` (selection inactive), `'selection'` (`selectionKeys`
  holds the selected keys), `'exclusion'` (`selectionKeys` holds the keys excluded from an otherwise
  all-selected set), and `'non-select'` (selection disabled). Selection works both controlled, through
  `selectionMode`/`selectionKeys` props and their `update:*` events, and uncontrolled, with the grid managing
  its own state.
- Toolbar and footer slots (`toolbar-start`, `toolbar-end` above the header; `footer-start`, `footer-end` below
  the scroller) for placing custom content around the grid.
- Pre- and post-render hooks on a column's renderer options (`preRender`, `postRender`) for wrapping a cell's
  rendered value with additional content, such as an icon or action button, without replacing the renderer
  itself.
- A summary bar below the data rows, shown automatically when `loading` is `true` or `records` is empty, and
  configurable to show at other times. While `loading` is `true` the bar shows a spinner and the no-data state
  is suppressed even when `records` is empty.
- A `load` event (`direction: 'vertical' | 'horizontal'`), proxied from the underlying virtual-scroll `load`
  event and fired when the user scrolls within `loadDistance` px (default 200) of the end of the list while
  `loading` is `false`. Use it to fetch and append the next page of records; setting `loading` to `true` while a
  fetch is in flight suppresses duplicate events until it completes.
- An overscroll indicator and `excessive-scroll` event: scrolling past either end of the list accumulates a
  visible overscroll displacement (up to 60px), and when `excessiveScrollThreshold` is set, crossing that
  percentage of the maximum fires an `excessive-scroll` event with the signed displacement - positive past the
  bottom, negative past the top. The event fires at most once per crossing, gated by a 1-second minimum interval
  and requiring the displacement to fall back under the threshold first. The visual indicator itself is always
  shown regardless of whether the event is wired up.
- Pull-to-refresh, built on the same overscroll tracking used for the excessive-scroll indicator.
- An incoming-records indicator (`recentlyAdded`, via `useRecentlyAdded`): rows added to the data set flash, and
  an arc overlay flashes at the top or bottom edge of the viewport when a newly added row is currently scrolled
  out of view. The grid calls `setVisibleRange()` on the composable automatically as the viewport scrolls;
  `incomingArcMaxOpacity` controls the peak opacity of the arc, with rapid repeated flashes decaying toward a
  lower opacity automatically.

### Changed
- The sort indicator direction is inverted: an ascending sort now shows the indicator that previously meant
  descending, since watching a descending-looking indicator while data was actually sorted ascending read as
  backwards.
- Column render options no longer collide across grid instances: each column's options are stamped with the
  owning grid's id and column identity internally.

### Fixed
- The published CSS path in the package manifest now points at `dist/dynamicforms-vue-grid.css`, matching the
  file the build actually emits, instead of the stale `dist/style.css`.
- Row selection survives a reflow of the underlying data (sort, filter, or the record list changing shape)
  without losing or misattributing which rows are selected.
- Column width measurement stays correct when selection mode is switched on or off, rather than leaving the
  shadow grid's measurements out of sync with the visible one.

## [0.1.6] - 2025-09-07

### Added
- Mouse handling on the grid: `click` and `dblclick` events report the row index, key, row data and the CSS
  classes of the clicked column.
- A dedicated header component (`df-grid-header.vue`), with grid layout, mouse-event handling and per-column
  measurement logic factored out of the main grid component into their own modules.
- Dynamic column configuration: columns are declared as data (field name, renderer, renderer options, CSS
  class) via `createColumn()` rather than being derived implicitly from the data shape, and header cells render
  from the same column definitions.
- Column width is now measured against the header row as well as the data rows, so header content that is wider
  than any cell in a column no longer gets clipped.

### Changed
- Responsive layout rendering is optimised to avoid redundant measurement passes.

## [0.1.4] - 2025-09-07

### Fixed
- The shadow grid used for measuring column widths renders with the same markup as the visible grid again, after
  drifting out of sync with it.

## [0.1.3] - 2025-09-06

### Added
- A cell renderer system: a `CellRendererTransformer` function per data type (`plain`, `md`, `color`, `checkbox`,
  `link`, `email`, `file`, `ip4`, `ip6`, `ip`, `date`, `time`, `datetime`, `int`, `float`, `decimal`), registered
  in a `DefaultRenderers` map that a consumer can extend via `setCellRenderer()`.
- `createColumn()` and `ColumnDefinition` for declaring a column's field name, renderer, renderer options and
  CSS class.

### Changed
- The card-based row rendering (`df-table.vue`) is replaced by `df-grid.vue`, rendering rows through the new cell
  renderer system instead of dumping raw field values.

## [0.1.0] - 2025-08-30

### Added
- Initial release: a virtual-scrolling data grid for Vue 3, built on `vue-virtual-scroller`, rendering
  arbitrary records as user-supplied row cards with a shadow grid used to measure column widths for CSS grid
  layout.
