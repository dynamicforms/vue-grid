# Getting Started

## Installation

```bash
npm install @dynamicforms/vue-grid
```

In your `main.ts`:
```typescript
import { DynamicFormsVueGrid } from '@dynamicforms/vue-grid';
import '@dynamicforms/vue-grid/styles.css';

const app = createApp(MyApp);
app.use(router);
app.use(vuetify);

// makes <DfGrid> available globally
app.use(DynamicFormsVueGrid, { registerComponents: true });
// skip global component registration; still registers v-longpress
// app.use(DynamicFormsVueGrid);
```

If you prefer to register `<DfGrid>` locally in individual components:

```typescript
import { DfGrid } from '@dynamicforms/vue-grid';
```

See [`DynamicFormsVueGridOptions`](/reference/index#plugin-options) for the full set of install options.

## Basic Usage

```vue
<template>
  <df-grid
    :columns="columns"
    :records="records"
    key-field="id"
  />
</template>

<script setup lang="ts">
import { createColumn, DfGrid } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('id',    'ID',    'int'),
  createColumn('name',  'Name',  'plain', { sortable: true }),
  createColumn('email', 'Email', 'email'),
];

const records = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com' },
];
</script>

<style>
.df-grid.card {
  display:               grid;
  grid-template-columns: minmax(2em, 4em) 1fr 1fr;
  gap:                   0.25em;
  padding:               0.35em 0.5em;
}
</style>
```

::: warning The `<style>` block above is required, not optional polish
The template and script alone render every cell stacked on its own line, one per row of text, not a table — the
grid has no fallback layout of its own. `.df-grid.card` has to be `display: grid` with a track per column before
anything lines up. See [Card layout CSS](#card-layout-css) below for why.
:::

## Card layout CSS

The card's grid comes from your own stylesheet, as set above — make `.df-grid.card` a grid and give it a base track
list, one track per column; the grid measures and republishes the actual widths for you. Each cell carries its
column's `fieldName` as a CSS class, so you can target individual columns by name once the base grid is in place:

```css
.df-grid.cell.id { text-align: right; }
```

See [Card layout CSS](/reference/df-grid#card-layout-css) for how column widths are measured and published, and
[Grid structure](/reference/df-grid#grid-structure) for the full section layout diagram.

## Next steps

The example above covers a plain, read-only grid. From here:

- **[Sorting](/reference/sorting)** — `sortable: true` on any column
- **[Filtering](/reference/filtering)** — `filterable: true` on a column, `:show-filter-row="true"` on the grid
- **[Responsive layouts](/reference/columns#responsive-layouts)** — multiple column sets that switch automatically with container width
- **[Row selection](/reference/selection)** — shift+click, long-press, and `#groupActions` batch actions, built in

The **[Cookbook](/guide/cookbook)** has copy-pasteable recipes for common tasks beyond a plain data column — clickable
action icons, a dedicated selection checkbox column, responsive card layouts, and more.
