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

## Translation

The grid draws a small number of English strings of its own, each under a key naming what it says rather than
its English text. The library never picks a locale itself — call `translateStrings` once per locale to supply
translations for as many of them as you have.

The authoritative list is
[`src/table/translations.ts`](https://github.com/dynamicforms/vue-grid/blob/main/src/table/translations.ts) - the
object passed to `createTranslatable` there is the whole catalogue. As of this writing it holds:

| Key | English default | Where it appears |
|-----|-----------------|-------------------|
| `Loading` | `Loading…` | Summary bar, while `loading` is `true` |
| `NoData` | `No data` | Summary bar, when `records` is empty |
| `FilterColumn` | `Filter {column}...` | Filter row's default placeholder, when a filterable column has none of its own |
| `CancelSelectionMode` | `Cancel selection mode` | Selection status bar's cancel icon tooltip |
| `InvertSelection` | `Invert selection` | Selection status bar's invert icon tooltip |
| `SelectionCountSelected` | `{count} items selected` | Selection status bar, in `'selection'` mode |
| `SelectionCountExcluded` | `{count} items excluded` | Selection status bar, in `'exclusion'` mode |
| `ActiveFilters` | `Active filters: {count}` | Status bar's default `statusBar` slot content |
| `NullValue` | `null` | A cell's content when its value is `null`/`undefined` and no `nullHandler` says otherwise |

A translation keeps a message's `{name}` placeholders as they stand — they are substituted after translation.

```typescript
import { translateStrings } from '@dynamicforms/vue-grid';

function applyLocale(locale: string) {
  const dictionary = translations[locale]; // however your app keeps its translations
  translateStrings((key, defaultValue) => dictionary[key] ?? defaultValue);
}
```

The callback receives the key and its English default, and returns the translation for the current locale, or
`null`/`undefined` to leave the English default in place. Reading a translated key inside a template or a
`computed` subscribes to it, so a grid already on screen picks up a later `translateStrings` call on its own.

## Next steps

The example above covers a plain, read-only grid. From here:

- **[Sorting](/reference/sorting)** — `sortable: true` on any column
- **[Filtering](/reference/filtering)** — `filterable: true` on a column, `:show-filter-row="true"` on the grid
- **[Responsive layouts](/reference/columns#responsive-layouts)** — multiple column sets that switch automatically with container width
- **[Row selection](/reference/selection)** — shift+click, long-press, and `#groupActions` batch actions, built in

The **[Cookbook](/guide/cookbook)** has copy-pasteable recipes for common tasks beyond a plain data column — clickable
action icons, a dedicated selection checkbox column, responsive card layouts, and more.
