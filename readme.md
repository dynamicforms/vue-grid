# @dynamicforms/vue-grid

A (not so) simple, (but hopefully) fast Vue 3 grid component with virtual scrolling, responsive layouts, and built-in sorting and filtering.

## Introduction

`@dynamicforms/vue-grid` provides a single `<DfGrid>` component that renders large tabular datasets efficiently. Column widths are measured automatically via shadow grids, responsive layouts switch based on container width, and sorting and filtering work out of the box — locally or delegated to a backend.

## Features

- Virtual scrolling via `@pdanpdan/virtual-scroll` — handles large datasets with minimal DOM overhead
- CSS grid layout
- Responsive column layouts — define multiple column sets, the grid activates the best fit based on container width
- Built-in sorting — local multi-column sort with `natural-orderby`; external (server-side) sort supported
- Built-in filtering — local filtering with string/number/boolean/date inputs; external filtering supported
- Per-row CSS classes via `rowClass` callback — data-driven styling or conditional highlighting; defaults to zebra 
  striping
- Flexible cell renderers — plain text, markdown, numbers, dates, links, checkboxes, colors, IP addresses, and more
- `preRender` / `postRender` hooks for adding prefix/suffix content to any cell. Custom cell renderers support
- Toolbar and footer slots for adding UI above and below the grid
- Comprehensive events offer all data necessary to correctly identify the exact target of an event. Built-in event 
  handlers as well as support for handling the events separately
- Overscroll indicator — elastic visual feedback when scrolling past the top or bottom of the content
- Row selection — long-press or Shift+click a row to enter selection mode; `selection`, `exclusion` and `non-select`
  modes; a status bar showing the item count with invert and cancel actions and a `groupActions` slot for batch
  operations
- Loading and empty states — a spinner in the summary bar while `loading` is `true`, a "No data" indicator when
  `records` is empty; both replaceable through the `#loading`, `#no-data` and `#summary-bar` slots
- Localisable — `translateStrings()` replaces every string the grid draws itself: loading/no-data, the filter
  placeholder, the selection status bar, and a `null` cell's placeholder

## Installation

```bash
npm install @dynamicforms/vue-grid
```

The package has no runtime dependencies of its own — everything it needs is declared as a peer dependency. The filter
row is built from `@dynamicforms/vuetify-inputs` controls, which render Vuetify components, so an application that
shows the filter row must also have Vuetify installed and registered.

```typescript
import { DynamicFormsVueGrid } from '@dynamicforms/vue-grid';
import '@dynamicforms/vue-grid/styles.css';

const app = createApp(MyApp);
app.use(DynamicFormsVueGrid, { registerComponents: true });
```

## Basic Usage Example

```vue
<template>
  <df-grid
    :columns="columns"
    :records="records"
    key-field="id"
    :show-filter-row="true"
    v-model:sortState="sortState"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { createColumn, DfGrid } from '@dynamicforms/vue-grid';
import type { SortState } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('id',    'ID',    'int'),
  createColumn('name',  'Name',  'plain', { sortable: true, filterable: true }),
  createColumn('email', 'Email', 'email'),
];

const records = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com' },
];

const sortState = ref<SortState>([]);
</script>
```

## Card layout CSS

The grid measures column widths and publishes them on the container as the `--grid-template-columns` custom property;
every rendered row applies them with `grid-template-columns: var(--grid-template-columns) !important`. The card itself
is a plain `div.df-grid.card` holding one `div.df-grid.cell` per column, so `display: grid` and a base track list come
from your own stylesheet:

```css
.df-grid.card {
  display:               grid;
  grid-template-columns: minmax(2em, 4em) 1fr 1fr;
  gap:                   0.25em;
}
```

Each cell carries its column's `fieldName` as a CSS class, plus the column's `cssClass` when one is set, so individual
columns can be placed and styled by name.

## TypeScript Support

The library is written in TypeScript and provides full type definitions for all props, emits, column definitions, sort/filter state, and renderer options.

## License

MIT
