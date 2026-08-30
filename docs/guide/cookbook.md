# Cookbook

Short, standalone recipes for tasks that come up once you go past a plain data column. Each recipe assumes you
already know [`createColumn()`](/api/columns) and the [`preRender`/`postRender` options](/api/renderers#interactive-content-via-prerender-postrender)
— read those first if the shapes below look unfamiliar.

## A clickable icon in a cell

You want an icon or button inside a cell that runs its own handler — deleting a row, toggling a flag — without the
grid also treating the click as a click on the row.

```typescript
import { RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';
import { createColumn } from '@dynamicforms/vue-grid';

createColumn('actions', 'Delete', 'plain', {
  sortable: false,
  filterable: false,
  rendererOptions: {
    postRender: (_value, row) => new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: {
        name: 'mdi-delete',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          deleteRow(row.id);
        },
      },
    } as SimpleComponentDef),
  },
});
```

`postRender` returns a `RenderableValue` wrapping a real Vue component, not an HTML string — `componentProps` are
passed to it as props/attrs, including event handlers like `onClick`. `componentName` is resolved as the name of a
**globally registered** component (or a native tag like `'div'`); a component only imported locally in your `<script
setup>` will not resolve. `CachedIcon` is registered globally when the plugin is installed with `registerComponents:
true` (see [Getting Started](./getting-started#installation)).

::: warning Always call `stopPropagation()`
`preRender`/`postRender` content sits inside the same row card the grid's own click handler listens on. Without
`e.stopPropagation()`, the click also bubbles up and is interpreted as a click on the row — which, while selection
mode is active, toggles the row's selection instead of (or in addition to) running your handler.
:::

Reaching for a raw HTML string with a `data-action` attribute and delegating clicks yourself from `@click` on
`<df-grid>` works around the same problem the hard way — the grid already gives every `pre`/`post` slot a real
component with its own event handlers.

## A cell that's empty unless a condition holds

You want a column that renders nothing at all for most rows, and something only when a condition is met — for
example, a warning icon only on rows that need attention.

```typescript
createColumn('flag', '', 'plain', {
  rendererOptions: {
    postRender: (_value, row) => {
      if (!row.needsReview) return null;
      return new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: { name: 'mdi-alert', style: { color: 'orange' } },
      } as SimpleComponentDef);
    },
  },
});
```

Returning `null` from `preRender`/`postRender` leaves that zone genuinely absent from the DOM for that row — no
wrapper element is rendered. That is different from returning `''`: an empty string still renders as an (empty)
component in that zone. Reach for a `transform` that returns `''` only when you want an empty *value* rendered by
the normal cell renderer; reach for `null` from `preRender`/`postRender` when you want the zone itself to not exist
for that row.

Note that `has-pre-post` is applied to every cell of a column that has `preRender` or `postRender` **configured**,
regardless of what an individual row's callback returns — the class reflects the column's configuration, not any
single row's content.

## An action-only column with no bound field

Sometimes a column has no data value at all — its whole content is one or two action icons, not a decoration next
to a real field. The main content zone of a cell always goes through the column's declared renderer and `transform`,
which can only ever produce an HTML string (`transform`'s return value is wrapped into `componentVHtml`); it can
never host a component with its own event handlers. `preRender`/`postRender` are the only zones that accept a
`RenderableValue` wrapping a real component, so they are also the only way to put an interactive icon in a cell —
even when that icon is the column's entire purpose, not a side decoration.

Point the column's `fieldName` at a property your records don't have, and leave `renderer` as `'plain'` with no
`transform`. The main zone then renders `undefined`, which comes out empty, and the column's real content lives
entirely in `postRender` (and `preRender`, for a second icon):

```typescript
createColumn('actions', 'Delete', 'plain', {
  sortable: false,
  filterable: false,
  rendererOptions: {
    postRender: (_value, row) => new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: {
        name: 'mdi-delete',
        onClick: (e: MouseEvent) => { e.stopPropagation(); deleteRow(row.id); },
      },
    } as SimpleComponentDef),
  },
});
```

Do not supply a `nullHandler` here — as soon as `rendererOptions` is present, the column loses the implicit
`nullHandler: 'null-null'` default and the `'plain'` renderer receives the `undefined` value directly, rendering it
as an empty cell rather than the literal text `null`. See [`nullHandler`](/api/renderers#common-options-celloptions)
for why that default only applies when `rendererOptions` is entirely absent.

Reach for this instead of splitting one action into `preRender` and packing an unrelated second action into the
`postRender` of some other, data-bearing column — that couples UI that has nothing to do with the bound field to
that field's column identity, and breaks the moment the field is removed or reordered.

## A dedicated selection checkbox column

The [CSS classes](/api/selection#css-classes) approach (`selected`/`unselected` on the row card) styles the whole
row. If you instead want an explicit checkbox that only takes up space while selection is active — appearing and
disappearing as part of the layout rather than as a style change — combine the two recipes above into one column:

```typescript
import { RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';
import { createColumn } from '@dynamicforms/vue-grid';

const selectionCol = createColumn('_selection', '', 'plain', {
  filterable: false,
  sortable: false,
  rendererOptions: {
    postRender: (_value, row) => {
      if (selectionMode.value === null) return null;
      return new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: {
          name: isSelected(row.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            toggleSelection(row.id);
          },
        },
      } as SimpleComponentDef);
    },
  },
});
```

Give the column's cell `display: none` by default and reveal it only while the container carries the `selection`
class, so the column collapses to zero width when selection is inactive:

```css
.df-grid.cell._selection { display: none; }
.df-grid.container.selection .df-grid.cell._selection {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

`selectionMode`, `isSelected()` and `toggleSelection()` here are your own state — either the `ref`s you pass to
`v-model:selection-mode`/`v-model:selection-keys` in [controlled mode](/api/selection#controlled-mode-external-state),
or mirrors of the grid's internal state kept via the `update:selection-*` events. The column's own click handler
toggles the row directly instead of relying on the grid's built-in click-to-toggle gesture, which is what lets the
checkbox and a plain click anywhere else in the row behave independently.

## Two actions sharing one cell

`preRender` and `postRender` can both be set on the same column, each independently returning `null` per row —
useful when a narrow responsive layout needs to fit a delete icon and a selection checkbox into a single cell
instead of two separate columns:

```typescript
const combinedActionsCol = createColumn('actions', 'Actions', 'plain', {
  filterable: false,
  sortable: false,
  rendererOptions: {
    preRender: (_value, row) => new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: {
        name: 'mdi-delete',
        style: { color: 'red' },
        onClick: (e: MouseEvent) => { e.stopPropagation(); deleteRow(row.id); },
      },
    } as SimpleComponentDef),
    postRender: (_value, row) => {
      if (selectionMode.value === null) return null;
      return new RenderableValue({
        componentName: 'CachedIcon',
        componentProps: {
          name: isSelected(row.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline',
          onClick: (e: MouseEvent) => { e.stopPropagation(); toggleSelection(row.id); },
        },
      } as SimpleComponentDef);
    },
  },
});
```

Use this column in place of a plain content column in the layout that needs it; a wider responsive layout can use
the two single-purpose columns from the recipes above instead. See the [Full-featured Demo](/examples/table) for
this exact column used across three responsive layouts at once.

## A responsive multi-row card layout

[Responsive column layouts](/api/columns#responsive-layouts) let the grid pick which *columns* are active at a given
width, but the grid placement of each cell within the card is entirely your own CSS — the library never rearranges
cells for you. A single column list can be reused across layouts; only the `cssClass` differs, and that class is
what your CSS keys off:

```typescript
import { createColumn } from '@dynamicforms/vue-grid';
import type { ResponsiveColumnDefinitions } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('id', 'ID', 'int'),
  createColumn('name', 'Name', 'plain'),
  createColumn('email', 'Email', 'email'),
  createColumn('role', 'Role', 'plain'),
  createColumn('bio', 'Bio', 'plain'),
];

const columnsResponsive: ResponsiveColumnDefinitions = [
  { cssClass: 'wide', columns },
  { cssClass: 'narrow', columns },
];
```

Give the `wide` layout one track per column, and pin `bio` to its own full-width row underneath the rest:

```css
.df-grid.card.wide {
  display: grid;
  grid-template-columns: 3em 1fr 1fr 6em;
  gap: 0.25em;
}
.df-grid.card.wide .df-grid.cell.bio {
  grid-column: 1 / -1;
  grid-row: 2;
}
```

For `narrow`, collapse to a single track and force every cell onto its own row — including `bio`, whose `wide`-layout
span and row have to be cancelled explicitly, since CSS class selectors are additive and both layouts' rules apply
to the same cell elements when `narrow` is active:

```css
.df-grid.card.narrow {
  display: grid;
  grid-template-columns: auto;
}
.df-grid.card.narrow > * {
  grid-column: 1 / 2 !important;
  grid-row: auto !important;
  grid-area: auto !important;
}
```

The `!important` on the reset (and on `bio`'s `wide` placement, if another rule could otherwise outweigh it) matters
for the same reason `--grid-template-columns` itself is applied with `!important`
([Card layout CSS](/api/df-grid#card-layout-css)): the grid measures each layout's shadow copy and republishes a
pixel track list over whatever `grid-template-columns` you wrote, but it publishes exactly as many tracks as your
CSS declared — `narrow`'s single `auto` track is what turns that measurement into "one column, one row per cell."
Declaring the track *count* and *cell placement* stays entirely your responsibility; the grid only refines the
widths.

See `table-basic.vue`'s `three-row` layout, linked from the [Full-featured Demo](/examples/table), for a worked
example that pins several fields into a compact three-row card the same way.
