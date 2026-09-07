# `<DfGrid>` Component

The main grid component. Handles column layout, virtual scrolling, sorting, and filtering.

```vue
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
/>
```

## Props

| Prop | Type | Default |
|------|------|---------|
| `columns` | `ResponsiveColumnDefinitions` | — |
| `records` | `RowValue[]` | — |
| `keyField` | `string` | — |
| `activeColumns` | `string` | first layout |
| `sortState` | `SortState` | — |
| `filterState` | `FilterState` | — |
| `showFilterRow` | `boolean` | `false` |
| `showStatusBar` | `boolean` | `false` |
| `showSummaryBar` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `secondaryShadowCount` | `number` | `30` |
| `rowClass` | `(item: RowValue, index: number) => string \| string[] \| Record<string, boolean>` | zebra striping (`'even'`/`'odd'`) |
| `selectionMode` | `SelectionMode` | `null` |
| `selectionKeys` | `Set<any>` | — |
| `recentlyAdded` | `UseRecentlyAdded` | — |
| `incomingArcMaxOpacity` | `number` | `1` |
| `excessiveScrollThreshold` | `number` | — |

`columns` — column layout definitions. Can be a flat list or a responsive array. See [Column Definitions](./columns).

`records` — array of row data objects. Each item should contain at least the `keyField` property.

`keyField` — name of the property used as a unique row identifier (like a primary key).

`activeColumns` — name of the currently active responsive layout: the `name` of a `ResponsiveColumnDefinition`, or
its `cssClass` when the definition has no `name`. A flat column list forms a single layout named `default`. Supports
`v-model`.

`sortState` — external sort state. Use with `v-model:sortState` for controlled sorting. When omitted the grid sorts
internally.

`filterState` — external filter state. Use with `v-model:filterState` for controlled filtering. When omitted the
grid filters internally.

`showFilterRow` — show the filter input row below the column headers.

`showStatusBar` — show the status bar below the filter row (displays the active filter count). The bar also
appears automatically while selection mode is active, showing the selection controls instead.

`showSummaryBar` — show the summary bar below the data rows. The bar also appears automatically when `loading` is
`true` or when `records` is empty. The automatic appearance is decided from the `records` prop, before filtering,
so a local filter that matches no rows leaves the bar hidden.

`loading` — indicates that data is being fetched. When `true` the default summary bar shows a loading spinner; the
no-data indicator is suppressed even when `records` is empty.

`secondaryShadowCount` — number of rows rendered in secondary shadow grids (one per responsive layout, used to
pre-measure a layout's width before it becomes active so the resize handler can pick the right one). Rarely needs
changing.

`rowClass` — returns CSS classes applied to each data row card. Receives the row data object and its 0-based index.
Return type matches Vue's `:class` binding — a string, an array, or an object. Overriding this prop replaces the
default even/odd zebra striping entirely; include the logic yourself if you still want it.

`selectionMode` — active selection mode (`null`, `'selection'`, `'exclusion'`, or `'non-select'`). Use with
`v-model:selectionMode` for controlled selection. See [Selection](./selection).

`selectionKeys` — set of selected (or excluded) row keys. Use with `v-model:selectionKeys`. See [Selection](./selection).

`recentlyAdded` — composable instance returned by `useRecentlyAdded`. Rows whose key is in the recently-added list
get the `state-adding` CSS class, and flash arc overlays are rendered at the top/bottom edge of the body when newly
added records land outside the visible viewport. The grid keeps the composable's visible range up to date as the
viewport scrolls. See [Incoming Records Indicator](/examples/incoming).

`incomingArcMaxOpacity` — peak opacity (0–1) of the incoming-records arc overlay. Applies to the first flash;
flashes that follow within 1.5 s start progressively dimmer, down to 15 % of this peak.

`excessiveScrollThreshold` — percentage (0–100) of the maximum overscroll displacement (60 px) at which the
`excessive-scroll` event fires. When omitted the event is never emitted. See [Pull to refresh](#pull-to-refresh).

## Emits

| Event | Payload |
|-------|---------|
| `click` | `GridClickEvent` |
| `sort` | `GridSortEvent` |
| `filter` | `GridFilterEvent` |
| `load` | `'vertical' \| 'horizontal'` |
| `excessive-scroll` | `number` |
| `update:activeColumns` | `string` |
| `update:sortState` | `SortState` |
| `update:filterState` | `FilterState` |
| `update:selectionMode` | `SelectionMode` |
| `update:selectionKeys` | `Set<any>, SelectionAction, key?` |

`click` — fired on a click on a data row when `selectionMode` is `null` and Shift is not held, and on every click on
a data row when `selectionMode` is `'non-select'`. In `'selection'` and `'exclusion'` mode the click toggles the row
instead, as does Shift+click while `selectionMode` is anything other than `'non-select'`; no event is emitted in
those cases. Clicks on the header always fire.

`sort` — fired when the user clicks or long-presses a column header cell. The payload carries the clicked column
and the sort state the grid would apply. See [Sorting → User interaction model](./sorting#user-interaction-model).

`filter` — fired when any filter value changes.

`load` — fired when the user scrolls within 200 px of the end of the list and the grid is not in loading state. Use
this to fetch and append the next page. Set `:loading="true"` while fetching to suppress duplicate events.

`excessive-scroll` — fired when the user overscrolls past the `excessiveScrollThreshold`. Payload is the signed
displacement in pixels: positive = past the bottom, negative = past the top. Re-fires only after 1 second has
elapsed **and** the overscroll has fallen back below the threshold. Requires `excessiveScrollThreshold` to be set.

`update:activeColumns` — fired when the grid's ResizeObserver selects a different responsive layout.

`update:sortState` — fired immediately after every `sort` event, carrying the same `suggestedSort` array. Use with
`v-model:sortState`.

`update:filterState` — fired together with `filter` when filter state changes internally.

`update:selectionMode` — fired when selection mode changes. Use with `v-model:selectionMode`.

`update:selectionKeys` — fired when the selected key set changes. `action` is `'add'`, `'remove'`, or `'clear'`.

### `GridClickEvent`

```typescript
interface GridClickEvent {
  rowId: number | 'header';  // 0-based position of the row in the displayed list, i.e. after
                             // filtering and sorting — or 'header' for a header cell
  key: any;                  // value of keyField for this row, or 'header'
  rowData: RowValue | undefined;  // the record displayed in that row
  columnClasses: string[];   // classes of the clicked cell — fieldName, the column's cssClass and any renderer
                             // classes such as 'has-pre-post'; 'df-grid', 'cell' and 'df-header-cell' are stripped
  columnName?: string;       // fieldName of the clicked column
  event: MouseEvent | TouchEvent;
}
```

### `GridSortEvent`

See [Sorting → GridSortEvent](./sorting#gridsortevent).

### `GridFilterEvent`

See [Filtering → GridFilterEvent](./filtering#gridfilterevent).

## Exposed methods

Access these through a template ref on `<df-grid>`.

| Method | Returns | Description |
|--------|---------|-------------|
| `reMeasure()` | `Promise<void>` | Re-measures column widths off the shadow grid and copies them onto the container. |

`reMeasure()` — forces the same column-width measurement a container resize triggers automatically,
for layout changes the grid has no way to detect on its own — for example a column's rendered
content changing width without the container itself resizing. The returned promise resolves once
the new widths have actually reached the container, not merely once they were measured.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DfGrid } from '@dynamicforms/vue-grid';

const gridRef = ref<InstanceType<typeof DfGrid>>();

async function onContentResized() {
  await gridRef.value?.reMeasure();
}
</script>

<template>
  <df-grid ref="gridRef" :columns="columns" :records="records" key-field="id" />
</template>
```

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `toolbar-start` | — | Rendered at the left side of the toolbar bar above the header. The toolbar wrapper (`div.df-grid-toolbar`) is only rendered when at least one toolbar slot is provided. |
| `toolbar-end` | — | Rendered at the right side of the toolbar. |
| `header` | `{ item }` | Replaces the entire header row. `item` is a `{ fieldName: label }` map of the active columns. Forwarded to `<DfGridHeader>`. |
| `statusBar` | `{ filterState }` | Overrides the default status bar content (filter count). Only visible when `showStatusBar` is `true` and selection mode is inactive. |
| `groupActions` | — | Rendered on the right side of the selection status bar. Only visible while selection mode is active. Use it for batch actions (delete, export, …). |
| `item` | `{ item, index, active }` | Replaces the default `<GridCard>` row rendering. `item` is the raw row object, `index` its 0-based position in the filtered and sorted list, `active` is always `true`. |
| `summary-bar` | — | Replaces the entire summary bar content. The summary bar is visible when `showSummaryBar` is `true`, `loading` is `true`, or `records` is empty. |
| `loading` | — | Replaces the default loading indicator (spinning icon + "Loading…" text) inside the summary bar. Only rendered when `loading` is `true`. |
| `no-data` | — | Replaces the default no-data indicator (database-off icon + "No data" text) inside the summary bar. Only rendered when `loading` is `false` and `records` is empty. |
| `incoming-arc-top` | — | Replaces the default wave of the top incoming-records arc. Rendered only when the `recentlyAdded` prop is supplied. |
| `incoming-arc-bottom` | — | Replaces the default wave of the bottom incoming-records arc. Rendered only when the `recentlyAdded` prop is supplied. |
| `footer-start` | — | Rendered at the left side of the footer bar below the scroller. The footer wrapper (`div.df-grid-footer`) is only rendered when at least one footer slot is provided. |
| `footer-end` | — | Rendered at the right side of the footer. |

### Example

```vue
<df-grid :columns="columns" :records="records" key-field="id">
  <template #toolbar-start>
    <h2>My Grid</h2>
  </template>
  <template #toolbar-end>
    <button @click="addRow">Add row</button>
  </template>
  <template #footer-start>
    <span>{{ records.length }} records</span>
  </template>
  <template #footer-end>
    <span>Page 1 of 10</span>
  </template>
</df-grid>
```

### Grid structure

The grid renders the following layers from top to bottom. Each section carries a `data-section` attribute so you can target it from CSS or event handlers without relying on internal class names.

```
┌─────────────────────────────────────┐  data-section="toolbar"
│  toolbar-start    │    toolbar-end  │  div.df-grid-toolbar  (only when a slot has content)
├─────────────────────────────────────┤  data-section="header"
│           column headers            │  df-grid-header component root
├─────────────────────────────────────┤  data-section="filter"   (inside header, when showFilterRow)
│           filter row                │
├─────────────────────────────────────┤  data-section="status-bar" (inside header, when visible)
│           status bar                │
├─────────────────────────────────────┤  data-section="body"
│           data rows                 │  div.df-grid.body-grid (the shared grid)
├─────────────────────────────────────┤  data-section="summary-bar" (when visible)
│           summary bar               │  div.df-summary-bar
├─────────────────────────────────────┤  data-section="footer"
│  footer-start     │    footer-end   │  div.df-grid-footer   (only when a slot has content)
└─────────────────────────────────────┘
```

`data-section` values:

| Value | Element | Notes |
|-------|---------|-------|
| `toolbar` | `div.df-grid-toolbar` | Present only when `toolbar-start` or `toolbar-end` slot has content |
| `header` | `df-grid-header` root | Always present |
| `filter` | Filter row `div` inside header | Present only when `showFilterRow` is `true` |
| `status-bar` | Status bar `div` inside header | Present when `showStatusBar` is `true` or selection mode is active |
| `body` | Virtual scroll container | Always present |
| `summary-bar` | `div.df-summary-bar` | Present when `showSummaryBar` is `true`, `loading` is `true`, or `records` is empty. Rendered at the end of the scrolled content, after the last row |
| `footer` | `div.df-grid-footer` | Present only when `footer-start` or `footer-end` slot has content |

The grid's own mouse event handler (`processMouse`) reads `data-section` first and immediately ignores clicks that originate in `toolbar`, `filter`, `status-bar`, and `footer` — those sections never trigger row interactions or selection.

Both `div.df-grid-toolbar` and `div.df-grid-footer` use `display: flex; justify-content: space-between` and are only mounted when at least one of their two slots has content.

### Row attributes

Every row card carries two more attributes that identify the row it renders:

| Attribute | Value |
|-----------|-------|
| `data-pk` | The row's `keyField` value. On the header card it is the literal string `header`. |
| `data-idx` | The row's 0-based position in the filtered and sorted list. On the header card it is the literal string `header`. |

The grid's mouse event handler reads `data-idx` off the nearest ancestor that carries it (the row's cells are
children of a wrapper element, not of the row card itself — see below) to work out which row was clicked. The same
attributes on the row card itself let you address a row from CSS or find its element from your own code, for
example `grid.querySelector('.df-grid.card[data-pk="42"]')`.

## Card layout CSS

Every row is a direct item of one shared grid, `.df-grid.body-grid` (a sibling of the grid container's other
children, carrying the active responsive layout's `cssClass`) — not its own independent grid the way it was before.
Your stylesheet makes `.df-grid.body-grid` a grid and gives it a base track template; the grid reads the resulting
natively-resolved column widths off it, publishes them as the `--grid-template-columns` custom property on the grid
container, and applies them to the header (which sits outside the body grid and can't itself be a native item of
it) with `grid-template-columns: var(--grid-template-columns) !important`.

```css
.my-grid .df-grid.body-grid {
  display: grid;
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
}
```

`.df-grid.card` — the row-anchor — is what's left for you to style per row: it's an otherwise-empty box spanning
the record's full column and row span, there for zebra striping, borders, and selection highlight, and for
`data-pk`/`data-idx`. It carries no cell content itself, so padding on it does not inset anything; style `.df-grid
.cell` for that.

If a layout places more than one row per record (a card with several stacked rows of fields), declare how many via
`rows` on that `ResponsiveColumnDefinition` (default `1`) — see [Column Definitions](./columns) — and give every
cell an explicit `grid-row` relative to `calc(var(--row-base) + N)` rather than an absolute row number: with every
record's cells on the same shared grid, `grid-row: 2` would put every record's second row on the very same physical
row instead of each record getting its own band. `--row-base` (`recordIndex * rows`) is published per record
automatically; you don't set it yourself.

### CSS custom properties

Both properties are set on the grid container (`.df-grid.container`) and can be read from your own rules.

| Property | Value |
|----------|-------|
| `--grid-template-columns` | The body grid's own natively-resolved track list, in pixels, copied onto the header with `grid-template-columns: var(--grid-template-columns) !important`. |
| `--row-base` | Set per record (and on the hidden header clone that feeds column widths) on an ancestor of that record's cells; `recordIndex * rows`. Read it in your own `grid-row` rules for multi-row layouts — see above. |
| `--df-grid-scrollbar-width` | The width, in pixels, that the body scroller actually reserves for its vertical scrollbar — measured as the scroller's `offsetWidth` minus its `clientWidth`, and re-measured on every container resize. It is `0` on platforms with overlay scrollbars. The header pads itself by this amount so its columns stay aligned with the body columns they label. |

## Row CSS classes

The `rowClass` prop lets you attach per-row CSS classes based on row data or position. It receives the raw row object and its 0-based index, and its return value is passed directly to Vue's `:class` binding.

```vue
<!-- Highlight negative amounts in red, keep zebra striping for the rest -->
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
  :row-class="(item, index) => item.amount < 0 ? 'negative' : (index % 2 === 0 ? 'even' : 'odd')"
/>
```

```vue
<!-- Data-driven classes stored in the record itself -->
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
  :row-class="(item) => item.cssClass"
/>
```

When `rowClass` is omitted the default is `(item, index) => index % 2 === 0 ? 'even' : 'odd'`, which produces the standard zebra striping. Providing your own function replaces this default entirely.

## Pull to refresh

The grid detects overscroll gestures (scrolling past the top or bottom edge) and exposes them
through the `excessive-scroll` event. The consumer is responsible for acting on the event —
the grid only detects the gesture and emits the notification.

Set `excessiveScrollThreshold` to the percentage of the maximum overscroll displacement (60 px)
that should trigger the event. A value of `80` fires when the user has scrolled 48 px past the
edge. The visual overscroll indicator (a blue gradient) is always rendered regardless of whether
the event is listened to.

### Firing conditions

The event fires immediately when the threshold is first crossed. After firing it is **silenced**
until **both** of the following are true:

1. At least **1 second** has elapsed since the last firing.
2. The overscroll displacement has **fallen back below the threshold** (the user released the
   gesture or stopped scrolling).

This prevents repeated rapid firings while the user holds the scroll position above the threshold.

### Payload

| Value | Meaning |
|-------|---------|
| positive (`amount > 0`) | Overscroll past the **bottom** of the list (pull-to-load-more) |
| negative (`amount < 0`) | Overscroll past the **top** of the list (pull-to-refresh) |

See [Pull-to-refresh at the top](/guide/cookbook#pull-to-refresh-at-the-top) in the Cookbook for a worked example.
