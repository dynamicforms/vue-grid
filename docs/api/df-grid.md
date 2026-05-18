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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ResponsiveColumnDefinitions` | — | Column layout definitions. Can be a flat list or a responsive array. See [Column Definitions](./columns). |
| `records` | `RowValue[]` | — | Array of row data objects. Each item should contain at least the `keyField` property. |
| `keyField` | `string` | — | Name of the property used as a unique row identifier (like a primary key). |
| `activeColumns` | `string` | — | Name of the currently active responsive layout (matches `cssClass` of a `ResponsiveColumnDefinition`). Supports `v-model`. |
| `sortState` | `SortState` | — | External sort state. Use with `v-model:sortState` for controlled sorting. When omitted the grid sorts internally. |
| `filterState` | `FilterState` | — | External filter state. Use with `v-model:filterState` for controlled filtering. When omitted the grid filters internally. |
| `showFilterRow` | `boolean` | `false` | Show the filter input row below the column headers. |
| `showStatusBar` | `boolean` | `false` | Show the status bar below the filter row (displays active filter count). |
| `mainShadowCount` | `number` | `500` | Number of rows rendered in the main shadow grid used for column width measurement. Rarely needs changing. |
| `secondaryShadowCount` | `number` | `30` | Number of rows rendered in secondary shadow grids (one per responsive layout). Rarely needs changing. |
| `rowClass` | `(item: RowValue, index: number) => string \| string[] \| Record<string, boolean>` | zebra striping (`'even'`/`'odd'`) | Returns CSS classes applied to each data row card. Receives the row data object and its 0-based index. Return type matches Vue's `:class` binding — a string, an array, or an object. Overriding this prop replaces the default even/odd zebra striping entirely; include the logic yourself if you still want it. |
| `selectionMode` | `SelectionMode` | `null` | Active selection mode (`null`, `'selection'`, or `'exclusion'`). Use with `v-model:selectionMode` for controlled selection. See [Selection](./selection). |
| `selectionKeys` | `Set<any>` | — | Set of selected (or excluded) row keys. Use with `v-model:selectionKeys`. See [Selection](./selection). |

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `GridClickEvent` | Fired on single click on a data row **when selection mode is inactive**. Not fired while selection is active (clicks toggle selection instead). Header clicks always fire. |
| `dblclick` | `GridClickEvent` | Fired on double click. |
| `sort` | `GridSortEvent` | Fired when the user interacts with a sortable column header. |
| `filter` | `GridFilterEvent` | Fired when any filter value changes. |
| `update:activeColumns` | `string` | Fired when the grid's ResizeObserver selects a different responsive layout. |
| `update:sortState` | `SortState` | Fired together with `sort` when sort state changes internally. |
| `update:filterState` | `FilterState` | Fired together with `filter` when filter state changes internally. |
| `update:selectionMode` | `SelectionMode` | Fired when selection mode changes. Use with `v-model:selectionMode`. |
| `update:selectionKeys` | `Set<any>, SelectionAction, key?` | Fired when the selected key set changes. `action` is `'add'`, `'remove'`, or `'clear'`. |

### `GridClickEvent`

```typescript
interface GridClickEvent {
  rowId: number | 'header';  // row index (0-based) or 'header'
  key: any;                  // value of keyField for this row, or 'header'
  rowData: RowValue | undefined;
  columnClasses: string[];   // CSS classes of the clicked cell (fieldName + custom cssClass, grid internals stripped)
  columnName?: string;       // fieldName of the clicked column
  event: MouseEvent | TouchEvent;
}
```

### `GridSortEvent`

See [Sorting → GridSortEvent](./sorting#gridsortevent).

### `GridFilterEvent`

See [Filtering → GridFilterEvent](./filtering#gridfilterevent).

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `toolbar-start` | — | Rendered at the left side of the toolbar bar above the header. The toolbar wrapper (`div.df-grid-toolbar`) is only rendered when at least one toolbar slot is provided. |
| `toolbar-end` | — | Rendered at the right side of the toolbar. |
| `header` | `{ column, sortState, filterState, ... }` | Overrides the default header cell rendering. Passed through to `<DfGridHeader>`. |
| `statusBar` | `{ filterState }` | Overrides the default status bar content (filter count). Only visible when `showStatusBar` is `true` and selection mode is inactive. |
| `groupActions` | — | Rendered on the right side of the selection status bar. Only visible while selection mode is active. Use it for batch actions (delete, export, …). |
| `item` | `{ item, index, active }` | Overrides the default `<GridCard>` row rendering. Receives the raw row object, its index, and the virtual scroller's `active` flag. |
| `footer-start` | — | Rendered at the left side of the footer bar below the scroller. The footer wrapper (`div.df-grid-footer`) is only rendered when at least one footer slot is provided. |
| `footer-end` | — | Rendered at the right side of the footer. |

### Toolbar and footer layout

```
┌─────────────────────────────────────┐
│  toolbar-start    │    toolbar-end  │  ← div.df-grid-toolbar (flex, space-between)
├─────────────────────────────────────┤
│           column headers            │
├─────────────────────────────────────┤
│           filter row                │
├─────────────────────────────────────┤
│           data rows                 │
├─────────────────────────────────────┤
│  footer-start     │    footer-end   │  ← div.df-grid-footer (flex, space-between)
└─────────────────────────────────────┘
```

Both wrappers use `display: flex; justify-content: space-between` and are only mounted when at least one of their two slots has content.

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
