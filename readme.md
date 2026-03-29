# @dynamicforms/vue-grid

A (not so) simple, (but hopefully) fast Vue 3 grid component with virtual scrolling, responsive layouts, and built-in sorting and filtering.

## Introduction

`@dynamicforms/vue-grid` provides a single `<DfGrid>` component that renders large tabular datasets efficiently. Column widths are measured automatically via shadow grids, responsive layouts switch based on container width, and sorting and filtering work out of the box — locally or delegated to a backend.

## Features

- Virtual scrolling via `vue-virtual-scroller` — handles large datasets with minimal DOM overhead
- Responsive column layouts — define multiple column sets, the grid activates the best fit based on container width
- Built-in sorting — local multi-column sort with `natural-orderby`; external (server-side) sort supported
- Built-in filtering — local filtering with string/number/boolean/date inputs; external filtering supported
- Flexible cell renderers — plain text, markdown, numbers, dates, links, checkboxes, colors, IP addresses, and more
- `preRender` / `postRender` hooks for adding prefix/suffix content to any cell
- Toolbar and footer slots for adding UI above and below the grid

## Installation

```bash
npm install @dynamicforms/vue-grid
```

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

## TypeScript Support

The library is written in TypeScript and provides full type definitions for all props, emits, column definitions, sort/filter state, and renderer options.

## License

MIT
