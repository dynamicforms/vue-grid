# Accessibility

`df-grid` exposes its content to assistive technology as a table: column headers, rows and cells, the position of
each row in the whole data set and the sort state. The attributes are set on the grid's existing elements; the
layout and the visual result are the same with or without a screen reader.

## Accessible name

A grid is accessible only with a name. Give it one of the two props:

| Prop | Rendered as | Use |
|------|-------------|-----|
| `ariaLabel` | `aria-label` | The name as text. |
| `ariaLabelledby` | `aria-labelledby` | The `id` of a visible element (usually a heading) that names the grid. |

`ariaDescribedby` (rendered as `aria-describedby`) points to an element with a longer description.

```vue
<template>
  <h2 id="departures-title">Departures</h2>
  <p id="departures-help">Times are local. Sort by any column.</p>
  <df-grid
    :columns="columns"
    :records="records"
    key-field="id"
    aria-labelledby="departures-title"
    aria-describedby="departures-help"
  />
</template>
```

## What a screen reader gets

- **Table.** The grid is one table with the accessible name above. It contains, in reading order, the header row,
  the filter row (when shown), the records and the summary row.
- **Column headers.** Every cell is announced with the header of its column. A header in the default header row is
  named by its column text alone; its sort button has its own name. This holds in every responsive layout,
  whatever position the layout gives the cell on screen.
- **Row count and position.** `aria-rowcount` is the number of header rows (1, or 2 with the filter row) plus the
  record count the status bar shows: `recordCount.matching` when the application passes
  [`recordCount`](/reference/df-grid), otherwise the number of records left after local filtering, otherwise the
  number of loaded records, plus the summary row while it is shown as a row. Each rendered row carries its
  `aria-rowindex` in the whole data set, so a screen reader announces "row 412 of 5000" although the grid renders
  only the rows in view. A record that spans several grid lines (`rowsPerRecord > 1`) is one row.
- **Sort state.** In the default header, the header of the primary sort column carries `aria-sort` (`ascending` or
  `descending`); the other sortable headers carry `aria-sort="none"`. Secondary columns of a multi-column sort carry
  no `aria-sort`.
- **Filters.** Each filter input is named after its column ("Filter Line"). A boolean filter's name starts with its
  visible label, the `placeholder` ("Late only, Filter Late").
- **Selection.** While selection mode is active, each record row carries `aria-selected="true"` or `"false"`.
- **Loading and no data.** The summary bar is one row with one cell spanning all columns, so "Loading…" and
  "No data" are read as part of the table.

Labels such as "Sort by Departure" and "Filter Line" come from the library's translatable strings and follow the
application's translations (`translateStrings`).

## Announcements need the status bar

The status bar has `role="status"` with `aria-atomic="false"`. A screen reader politely announces the text that
changes: the number of active filters, the record count and, in selection mode, the selection count. The buttons in
the bar are not announced with it. The grid has no other live region.

An application whose users should hear the result of sorting, filtering or selecting therefore shows the status bar:

```vue
<df-grid :columns="columns" :records="records" key-field="id" aria-label="Departures" show-status-bar />
```

The recently-added and recently-updated row states and the incoming arcs are visual only; the grid does not announce
them.

## Keyboard

| Key | Where | Action |
|-----|-------|--------|
| <kbd>Tab</kbd> | | Moves focus through the sort buttons of the sortable column headers, the filter inputs, the selection bar buttons and the record list, in document order. |
| <kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>Page Up</kbd> / <kbd>Page Down</kbd> / <kbd>Home</kbd> / <kbd>End</kbd> | Record list | Scrolls the records. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Sort button | Sorts by the column, as a click on the header cell does. |
| <kbd>Shift</kbd>+<kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Space</kbd> | Sort button | Adds the column to a multi-column sort, as Shift+click does. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | "Cancel selection mode" button | Leaves selection mode and clears the selection. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | "Invert selection" button | Switches between `'selection'` and `'exclusion'` mode. |

The sort indicator of each sortable column is the sort button (`role="button"`, named "Sort by &lt;column&gt;").
The record list (the body rowgroup, the grid's scroll container) is focusable, so it scrolls from the keyboard. Rows
themselves are not focusable: selecting rows is a mouse and touch interaction (click, Shift+click, long press).

## Keyboard selection

An application that needs keyboard selection renders a checkbox column bound to the selection. The checkbox is a
native control, so it is focusable and toggles with <kbd>Space</kbd>; `stopPropagation()` keeps the click from also
reaching the grid's row handler.

```typescript
import { ref } from 'vue';
import { RenderableValue, SimpleComponentDef } from '@dynamicforms/vuetify-inputs';
import { createColumn, SelectionMode } from '@dynamicforms/vue-grid';

const selectionMode = ref<SelectionMode>('selection');
const selectionKeys = ref(new Set<number>());

function toggle(id: number) {
  const keys = new Set(selectionKeys.value);
  if (keys.has(id)) keys.delete(id);
  else keys.add(id);
  selectionKeys.value = keys;
}

const selectColumn = createColumn('select', 'Select', 'plain', {
  sortable: false,
  filterable: false,
  rendererOptions: {
    postRender: (_value, row) => new RenderableValue({
      componentName: 'input',
      componentProps: {
        type: 'checkbox',
        checked: selectionKeys.value.has(row.id),
        'aria-label': `Select ${row.name}`,
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          toggle(row.id);
        },
      },
    } as SimpleComponentDef),
  },
});
```

```vue
<df-grid
  v-model:selection-mode="selectionMode"
  v-model:selection-keys="selectionKeys"
  :columns="[selectColumn, ...columns]"
  :records="records"
  key-field="id"
  aria-label="Departures"
/>
```

See [Selection](/reference/selection) for the selection modes and the controlled `selectionKeys`.

## Custom `#item` and `#header` slots

The slots replace elements that carry table roles, so their slot props carry the attributes the application binds on
the elements it renders.

### `#item`

The record wrapper outside the slot keeps `role="row"`, `aria-rowindex` and `aria-selected`. The slot props add
`cellAttrs` (`{ role: 'cell' }`): bind it on every cell element. An element between the row and its cells takes
`role="none"`.

```vue
<df-grid :columns="columns" :records="records" key-field="id" aria-label="Departures">
  <template #item="{ item, cellAttrs }">
    <div class="df-grid card my-row" role="none">
      <div v-bind="cellAttrs">{{ item.line }}</div>
      <div v-bind="cellAttrs">{{ item.departure }}</div>
    </div>
  </template>
</df-grid>
```

### `#header`

The slot replaces the header row element itself. The slot props add `rowAttrs` (`id`, `role`, `aria-rowindex`) for
the application's row element and `cellAttrs` (`{ role: 'columnheader' }`) for each header cell. The table refers to
the header row by its `id`, so `rowAttrs` goes on the slot's root element. The slot's cells get no `aria-sort` and no
sort button: an application that renders a sortable header sets `aria-sort` on each header cell itself from the grid's
`sortState`.

```vue
<df-grid :columns="columns" :records="records" key-field="id" aria-label="Departures">
  <template #header="{ item, rowAttrs, cellAttrs }">
    <div class="my-header" v-bind="rowAttrs">
      <div v-for="(label, fieldName) in item" :key="fieldName" v-bind="cellAttrs">{{ label }}</div>
    </div>
  </template>
</df-grid>
```

A screen reader pairs a cell with a header by position: render the cells of both slots in the order of the
`columns` prop.

## Reduced motion

With `prefers-reduced-motion: reduce`, the grid's own animations are switched off: the incoming arcs, the loading
spinner and the header's transitions.
