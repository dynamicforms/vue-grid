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

// registerComponents: true makes DfGrid available globally as a component
app.use(DynamicFormsVueGrid, { registerComponents: true });
```

If you prefer to register `<DfGrid>` locally in individual components instead of the `app.use(DynamicFormsVueGrid,
{ registerComponents: true })` call above:

```typescript
import { DfGrid } from '@dynamicforms/vue-grid';
```

Local registration covers the component only. The `v-longpress` directive (needed for long-press selection — see
[Selection](/reference/selection#activating-selection)) is registered by that same `app.use(DynamicFormsVueGrid, {
registerComponents: true })` call and by nothing else, so call it as well if you want long-press selection, even
if you also import `DfGrid` locally elsewhere — the two don't conflict, and there is no way to register the
directive on its own.

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
```

## Card layout CSS

The card's grid comes from your own stylesheet — make `.df-grid.card` a grid and give it a base track list, one
track per column; the grid measures and republishes the actual widths for you:

```css
.df-grid.card {
  display:               grid;
  grid-template-columns: minmax(2em, 4em) 1fr 1fr;
  gap:                   0.25em;
  padding:               0.35em 0.5em;
}
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
