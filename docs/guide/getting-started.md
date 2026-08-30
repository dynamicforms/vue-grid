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

If you prefer to register `<DfGrid>` locally in individual components:

```typescript
import { DfGrid } from '@dynamicforms/vue-grid';
```

Local registration covers the component only — the `v-longpress` directive comes from the plugin, so install the
plugin as well if you want long-press selection.

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

The grid measures column widths for you and publishes them on the container as the `--grid-template-columns` custom
property, which every rendered row applies with `grid-template-columns: var(--grid-template-columns) !important`. The
card's grid itself comes from your stylesheet — make `.df-grid.card` a grid and give it a base track list, one track
per column:

```css
.df-grid.card {
  display:               grid;
  grid-template-columns: minmax(2em, 4em) 1fr 1fr;
  gap:                   0.25em;
  padding:               0.35em 0.5em;
}
```

Each cell carries its column's `fieldName` as a CSS class, plus the column's `cssClass` when one is set, so individual
columns can be placed and styled by name:

```css
.df-grid.cell.id { text-align: right; }
```

## Grid structure

The grid is composed of named sections — toolbar, header, filter row, status bar, body, summary bar, and footer. Each section carries
a `data-section` HTML attribute, which you can use for CSS targeting or custom event handling. 
See [Grid structure](/api/df-grid#grid-structure) for the full layout diagram and attribute values.

## Sorting

Add `sortable: true` (or a `SortConfig` object) to any column. The grid manages sort state internally; use 
`v-model:sortState` if you want to control it externally or pre-sort the grid:

```vue
<df-grid
  v-model:sortState="sortState"
  :columns="columns"
  :records="records"
  key-field="id"
/>
```

```typescript
import type { SortState } from '@dynamicforms/vue-grid';
const sortState = ref<SortState>([{ columnName: 'name', direction: 'asc' }]);
```

See [Sorting](/api/sorting) for the full configuration reference.

## Filtering

Add `filterable: true` (or a `FilterConfig` object) to any column and set `:show-filter-row="true"` on the grid:

```vue
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
  :show-filter-row="true"
/>
```

See [Filtering](/api/filtering) for the full configuration reference.

## Responsive layouts

Define multiple column sets and the grid will switch between them automatically as the container is resized:

```typescript
import { createColumn, filterColumns } from '@dynamicforms/vue-grid';
import type { ResponsiveColumnDefinitions } from '@dynamicforms/vue-grid';

const allColumns = [
  createColumn('id',      'ID',      'int'),
  createColumn('name',    'Name',    'plain'),
  createColumn('country', 'Country', 'plain'),
  createColumn('email',   'Email',   'email'),
];

const columns: ResponsiveColumnDefinitions = [
  { cssClass: 'wide',   columns: allColumns },
  { cssClass: 'medium', columns: filterColumns(allColumns, ['id', 'name', 'email']) },
  { cssClass: 'narrow', columns: filterColumns(allColumns, ['name']) },
];
```

```vue
<df-grid
  v-model:active-columns="activeLayout"
  :columns="columns"
  :records="records"
  key-field="id"
/>
```

See [Column Definitions](/api/columns) for more details.

## Row selection

The grid has built-in multi-row selection. Shift+click works however the component is registered; long-press
additionally needs the `v-longpress` directive, which the plugin registers globally when installed as
`app.use(DynamicFormsVueGrid, { registerComponents: true })`.

**Activating selection** (user gestures, no props needed):
- **Shift+click** a data row → enters selection mode and toggles that row
- **Long-press** a data row → enters selection mode. The long-press fires while the button is still held, and the
  click produced on release toggles the row a second time, so the row ends up in the state it started in
- **Click** while selection is active → toggles the clicked row
- The status bar appears automatically with a cancel button, an item count, and an invert button

**Selection modes** — controlled via `v-model:selectionMode`:

| Mode | Meaning |
|------|---------|
| `null` | Inactive — normal click events fire |
| `'selection'` | Opt-in: only rows in `selectionKeys` are selected |
| `'exclusion'` | Opt-out: all rows *except* those in `selectionKeys` are selected |
| `'non-select'` | Gestures disabled — mode can only be changed programmatically |

**CSS classes** — the grid adds these automatically, no JavaScript needed:
- Container: `selection` (active), `exclusion` (exclusion mode)
- Each row card: `selected` or `unselected` (only while selection is active)

```css
.df-grid.container.selection .df-grid.card.selected { outline: 2px solid blue; }
.df-grid.container.selection .df-grid.card.unselected { opacity: 0.5; }
```

**Batch actions** — use the `#groupActions` slot to add buttons to the selection status bar:

```vue
<df-grid
  v-model:selection-mode="selectionMode"
  v-model:selection-keys="selectedKeys"
  :columns="columns"
  :records="records"
  key-field="id"
>
  <template #groupActions>
    <button @click="deleteSelected">Delete {{ selectedKeys.size }} items</button>
  </template>
</df-grid>
```

See [Selection](/api/selection) for the full API reference, including uncontrolled vs. controlled mode and reading the key set, and the [Cookbook](/guide/cookbook) for a dedicated selection-checkbox-column recipe.
