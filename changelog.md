# Changelog

All notable changes to `@dynamicforms/vue-grid` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-09-07

### Changed

- Every row is now a direct item of one shared `display: grid` instead of being its own
  independent grid, and column widths are resolved by the browser natively instead of being
  measured on a hidden shadow-grid copy and broadcast via a CSS variable. Consuming CSS that
  declared `.df-grid.card { display: grid; grid-template-columns: ...; }` must move that
  declaration to `.df-record-grid` instead — the marker every place that lays out a record's
  fields carries (the real scrolling body, the header, and the filter row alike), so one
  declaration covers all three instead of just the body. `.df-grid.card` is now the row-anchor: a
  styleable but otherwise empty box, not a grid container. Every layout, including a plain single
  row per record, must now give each cell an explicit `grid-row: calc(var(--row-base) + N)` rather
  than an absolute row number or none at all — plain CSS auto-placement has no notion of record
  boundaries once rows share a grid, so an unplaced cell's `grid-row: auto` keeps advancing across
  the whole grid instead of restarting per record. A layout with more than one row of fields per
  record must additionally declare `rows` on its `ResponsiveColumnDefinition`. See
  [Card layout CSS](https://dynamicforms.github.io/vue-grid/reference/df-grid#card-layout-css) and
  the [Cookbook](https://dynamicforms.github.io/vue-grid/guide/cookbook#a-responsive-multi-row-card-layout).
- Row virtualization no longer depends on `@pdanpdan/virtual-scroll` (dropped as a peer
  dependency); windowing is now a small internal composable with the same externally-visible
  behaviour (`load`, `recentlyAdded`'s viewport signal, the scrollbar-width measurement).

### Fixed

- The secondary shadow grids used to pick which responsive layout is active could report a
  layout's required width as far wider than it actually needs, whenever that layout's columns
  have no fixed upper bound (e.g. free-text fields laid out with `auto` or `fr` tracks): the
  measurement was always taken at each field's natural, single-line width, so one long sampled
  value could make an otherwise-comfortable layout look too wide to pick, falling back to a
  narrower one than necessary. Each candidate is now also measured with every field forced to wrap
  at every opportunity, and the median number of lines the sample actually wraps into — not the
  worst case — shrinks the reported width back down for fields whose typical content wraps
  comfortably, so a rare long outlier no longer forces the whole layout to look wider than it
  needs to be. No API changed; layouts using unbounded `auto`/`fr` tracks for free-text columns
  are simply picked more accurately.
- A record's `--row-base` and the windowing spacers' `grid-row` were computed from the record's
  absolute index in the full dataset (`recordIndex * rows`), so the number of CSS grid row lines
  actually referenced grew with the dataset's total size rather than with how many rows were
  mounted. Firefox stops generating further implicit grid row tracks past roughly 10,000 of them,
  silently collapsing every row beyond that onto the same line — on a large enough dataset (around
  3,300 records for a three-row layout, fewer for a layout with more rows per record), every row
  scrolled past that point rendered on top of the last working one. `--row-base` is now computed
  from a record's position within the currently-mounted window instead, which keeps the grid lines
  actually used bounded by `minRenderedRows` regardless of the dataset's total size. Chromium was
  not observed to have this limit, so this was invisible there.
- A single-row layout that relies on plain CSS column auto-placement (no explicit `grid-column` on
  any cell) had every cell overflow into newly-created implicit columns instead of the declared
  track list: the row-anchor (`.df-grid.card`, spanning the full row for zebra/border/selection
  styling) occupied every column of its row for auto-placement purposes, leaving no free cell for
  a real cell to land in, and the hidden header-measurement clone competed with whichever record
  was first in the mounted window for the same reason. The row-anchor is now `position: absolute`
  (still filling its grid area via `inset: 0`), removing it from auto-placement bookkeeping
  entirely; the clone gets its own permanently-reserved rows instead of sharing one with a real
  record, collapsed to zero height/padding/border so the reservation stays invisible.
- The row-anchor (`.df-grid.card`) intercepted clicks meant for cell content underneath it: being
  `position: absolute`, it is a stacking-context participant painted above its static in-flow
  siblings by default, and nothing pulled it back behind them. The body grid now sets `isolation:
  isolate` and the row-anchor `z-index: -1`, scoped to that grid's own children so it doesn't
  affect stacking decisions further up the page.
- `windowing.recompute()` could mount the wrong end of the dataset on first render: called before
  the body grid has a real measured height, it read that as "scrolled past every record" and
  clamped the window to the last `buffer` records instead of the first ones a fresh mount actually
  needs, visible as the grid appearing to load already scrolled to the bottom until the user
  scrolled or resized. It now mounts a `buffer`-sized window from the current scroll position
  (usually still `0` this early) instead.
- The header/filter row's cached height (`min-height`, used so it isn't left at `auto` and
  resized by every scroll-driven reflow) could lock in a value taller than the header actually
  needs and never correct itself: nothing re-measured it once the body grid's real column widths
  arrived later, and a measurement taken while a filter-row input was still mid-layout could read
  too tall in the first place. It now re-measures when column widths change and retries across a
  few animation frames until two consecutive readings agree.
- The hidden header-measurement clone's reserved rows showed as a visible blank gap above the
  first real row, growing with how many rows a layout stacks per record (barely noticeable for a
  single-row layout, over a centimetre for one stacking many fields into a single column): the
  clone's own height collapses to zero, but the consumer's own `row-gap` still applied between
  each reserved track and before the first real row. The body scroller is now shifted up and
  grown by that same measured amount, clipping the reservation away without losing any scrollable
  height at the bottom.
- The summary bar (loading, no-data, or a consumer's own `showSummaryBar` content) could render
  entirely outside the visible, clipped area: `.df-grid-body`'s scroller was `height: 100%`,
  claiming the whole of `.df-grid-body`'s own box in plain block flow and leaving the summary bar
  — its sibling — no room to render in, invisible in every state that shows it rather than just a
  layout tight on space. `.df-grid-body` is now a flex column so the two share its height
  properly, the scroller shrinking to make room instead of always claiming all of it. With no
  records at all, the bar also now renders where a row would — right below the header — instead
  of at the bottom of the empty scroller with nothing visually anchoring it there; loading a
  further page of an already-populated grid keeps its default position at the bottom, where the
  new rows are about to arrive.

### Added

- `estimatedRowHeight` prop: row height, in pixels, assumed for a not-yet-rendered record —
  used to size the placeholder standing in for windowed-out rows. Default `30`; pick something
  close to your actual row height, since the grid does not average measured heights to refine
  this for you.
- `minRenderedRows` prop: minimum number of records kept mounted on each side of the visible
  range. Default `100`, replacing the removed `mainShadowCount`.
- `rows` field on `ResponsiveColumnDefinition`: declares how many grid rows that layout's card
  occupies per record (default `1`), needed for the relative `--row-base` cell placement above.
- `topInsertedPks` on `UseRecentlyAdded` (`useRecentlyAdded`'s return value): the grid now shifts
  `scrollTop` by the height (plus the surrounding `row-gap`) of records that land above the
  visible viewport, so rows already on screen stay in place instead of visually sliding down when
  content is prepended above them.

### Removed

- `mainShadowCount` prop — the primary shadow grid it configured no longer exists; column widths
  are now resolved natively rather than measured on a hidden copy.

## [0.4.1] - 2026-09-06

### Added

- `<DfGrid>` exposes `reMeasure()` on its template ref: re-measures column widths off the shadow
  grid and copies them onto the container, for layout changes the grid cannot detect on its own -
  for example a column's rendered content changing width without the container itself resizing.
  Returns a promise that resolves once the new widths have actually reached the container.

### Fixed

- The shadow grid's column-width measurement no longer briefly reads `grid-template-columns` as
  `"none"` and copies that onto the container, collapsing the row layout for a frame. That value
  is what the property reads back as in the gap between the shadow grid's element existing in the
  DOM and the stylesheet rule that makes it a grid taking effect; it is now retried on the next
  animation frame instead.

## [0.4.0] - 2026-09-01

### Added

- Every user-facing string the grid draws itself is translatable through `translatableStrings`/`translateStrings`,
  from `@dynamicforms/translatable`: the loading and no-data indicators, the filter row's default placeholder, the
  selection status bar's cancel/invert tooltips and item count, the active-filter count, and the placeholder text
  a cell with a `null` value renders. Reading a key inside a template or a `computed` subscribes to it, so a later
  `translateStrings` call reaches what's already on screen.

### Changed

- Bumps the `@dynamicforms/vue-forms` peer range to `^1.0.0` and `@dynamicforms/vuetify-inputs` to `^0.11.0`, and
  adds `@dynamicforms/translatable` (`^0.1.0`) as a peer dependency.

## [0.3.3] - 2026-08-28

### Fixed
- A column's sort indicator no longer disappears when its `sortable` config sets `key` (or `nulls`,
  `compare`, `locale`) without an explicit `direction` - e.g. a compound-key column such as
  `sortable: { key: ['width', 'height'] }`. The header computed whether to draw the indicator from
  the raw `sortable.direction` field instead of `getSortConfig()`, which defaults `direction` to
  `'both'` for such columns; clicking the header already sorted correctly through `getSortConfig`,
  only the indicator was suppressed.

## [0.3.2] - 2026-08-27

### Fixed
- A column's header no longer draws sort-direction arrows when its `sortable` is `false`.
  `SortingIndicator` read `direction` and `index` but never `sortable`, so every header drew the
  asc/desc chevrons regardless of whether clicking them did anything - indistinguishable from an
  actually-sortable, currently-unsorted column.
- The sort indicator is toned down to `opacity: .55` so it no longer reads as bolder than the
  column label it sits next to, and the header label no longer stretches to push the indicator to
  the cell's far edge - it now sits right next to the label, so neighbouring columns' labels and
  indicators don't run together across the gap between them.

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
