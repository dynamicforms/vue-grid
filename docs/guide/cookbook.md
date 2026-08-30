# Cookbook

Short, standalone recipes for tasks that come up once you go past a plain data column. Each recipe assumes you
already know [`createColumn()`](/reference/columns) and the [`preRender`/`postRender` options](/reference/renderers#interactive-content-via-prerender-postrender)
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
to a real field. Give it a [custom renderer function](/reference/columns#custom-renderer-functions) instead of a registry
name; the function owns the cell's entire content, so there's no field value to point it at and nothing to fake:

```typescript
createColumn('actions', 'Delete', (_value, row) => new RenderableValue({
  componentName: 'CachedIcon',
  componentProps: {
    name: 'mdi-delete',
    onClick: (e: MouseEvent) => { e.stopPropagation(); deleteRow(row.id); },
  },
} as SimpleComponentDef), { sortable: false, filterable: false });
```

Reach for this instead of packing the action into the `preRender`/`postRender` of some other, data-bearing column —
that couples UI that has nothing to do with the bound field to that field's column identity, and breaks the moment
the field is removed or reordered.

## A dedicated selection checkbox column

The [CSS classes](/reference/selection#css-classes) approach (`selected`/`unselected` on the row card) styles the whole
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
`v-model:selection-mode`/`v-model:selection-keys` in [controlled mode](/reference/selection#controlled-mode-external-state),
or mirrors of the grid's internal state kept via the `update:selection-*` events. The column's own click handler
toggles the row directly instead of relying on the grid's built-in click-to-toggle gesture, which is what lets the
checkbox and a plain click anywhere else in the row behave independently.

This one stays on `postRender` rather than a [custom renderer function](/reference/columns#custom-renderer-functions) on
purpose: a function renderer always returns a `RenderableValue`, so it has no equivalent to `postRender` returning
`null` — it would have to construct an empty placeholder for every row while selection is inactive, leaving the CSS
above to hide a checkbox component that was still created rather than never created at all.

A dedicated column is one of several ways to show selection state — the [Full-featured Demo](/examples/table) runs
all three side by side across its responsive layouts: `single-line` uses this dedicated column, `three-row` combines
the checkbox with a row action in the same cell (see [Custom cell content beyond a single
icon](#custom-cell-content-beyond-a-single-icon) below), and `single-column` marks selected rows with a background
colour using only the [CSS classes](/reference/selection#css-classes) approach, no extra column at all.

## Custom cell content beyond a single icon

The [action-only column](#an-action-only-column-with-no-bound-field) recipe above generalises past a single icon:
`componentName` names any component you've registered, and `componentProps` carries whatever props that component
declares — the technique is the same whether the cell hosts one icon, several, or something else entirely, such as
a chart or a badge. A column needing more than one action is just that technique with a component built to lay out
several of them, rather than reaching for `preRender`/`postRender` — those are two independently flexed zones with
no shared container between them, so nothing coordinates the spacing of more than one small icon on either side.

`DfActions` (from `@dynamicforms/vuetify-inputs`, already a peer dependency of this package) is one such component,
built specifically to lay out a group of actions. It takes an `Action` (from `@dynamicforms/vue-forms`) per action,
each holding an icon/label and an `ExecuteAction` that runs on click:

```typescript
import { Action, ExecuteAction, RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';
import { createColumn } from '@dynamicforms/vue-grid';

function actionsFor(row: RowValue): Action[] {
  const actions = [
    new Action({
      value: { icon: 'mdi-delete' },
      actions: [new ExecuteAction(() => deleteRow(row.id))],
    }),
  ];
  if (selectionMode.value !== null) {
    actions.push(new Action({
      value: { icon: isSelected(row.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' },
      actions: [new ExecuteAction(() => toggleSelection(row.id))],
    }));
  }
  return actions;
}

const combinedActionsCol = createColumn('actions', 'Actions', (_value, row) => new RenderableValue({
  componentName: 'DfActions',
  componentProps: { actions: actionsFor(row) },
} as SimpleComponentDef), { filterable: false, sortable: false });
```

Clicking a `DfActions` action does not bubble to the row the way a plain element's click does — no
`stopPropagation()` needed here, unlike the `CachedIcon`-based recipes above. Registering `DfActions` (via
`app.use(DynamicFormsInputs, { registerComponents: true })`) and constructing `Action`/`ExecuteAction` correctly is
`@dynamicforms/vuetify-inputs` and `@dynamicforms/vue-forms` territory — see their own documentation for the full
`Action` API. Nothing about it is specific to this recipe: any component that accepts props and handles its own
clicks can stand in for `DfActions` here.

Use this column in place of a plain content column in the layout that needs it; a wider responsive layout can use
the two single-purpose columns from the recipes above instead.

## A responsive multi-row card layout

[Responsive column layouts](/reference/columns#responsive-layouts) let the grid pick which *columns* are active at a given
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
([Card layout CSS](/reference/df-grid#card-layout-css)): the grid measures each layout's shadow copy and republishes a
pixel track list over whatever `grid-template-columns` you wrote, but it publishes exactly as many tracks as your
CSS declared — `narrow`'s single `auto` track is what turns that measurement into "one column, one row per cell."
Declaring the track *count* and *cell placement* stays entirely your responsibility; the grid only refines the
widths.

See `table-basic.vue`'s `three-row` layout, linked from the [Full-featured Demo](/examples/table), for a worked
example that pins several fields into a compact three-row card the same way.

## Pull-to-refresh at the top

You want the classic mobile gesture: pull past the top of the list to refresh it. The grid already detects the
overscroll gesture and exposes it as the `excessive-scroll` event — see
[Pull to refresh](/reference/df-grid#pull-to-refresh) for the firing conditions and payload — you just act on it:

```vue
<template>
  <df-grid
    :columns="columns"
    :records="records"
    key-field="id"
    :loading="loading"
    :excessive-scroll-threshold="80"
    @excessive-scroll="onExcessiveScroll"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

const loading = ref(false);
const records = ref([]);

async function onExcessiveScroll(amount: number) {
  if (amount < 0 && !loading.value) {
    // Negative amount = user pulled past the top → refresh
    loading.value = true;
    records.value = await fetchRecords();
    loading.value = false;
  }
}
</script>
```

`:loading="true"` while the fetch is in flight both shows the built-in spinner and, since the event is silenced
until the overscroll falls back below the threshold, keeps a slow refresh from re-triggering itself.

## Delegating sorting, filtering, and pagination to a server

For a large dataset you want the backend to sort, filter, and page through records — the grid should only manage UI
state and fire events, never touch `records` on its own. Mark the relevant columns with the
[`sortExternal`](/reference/sorting#sortexternal) and [`filterExternal`](/reference/filtering#filterexternal)
sentinels, and wire up `@sort`, `@filter`, and `@load`:

```typescript
import { sortExternal, filterExternal, createColumn } from '@dynamicforms/vue-grid';
import type { GridSortEvent, GridFilterEvent } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('title', 'Title', 'plain', {
    sortable: { key: sortExternal },
    filterable: { key: filterExternal },
  }),
];

const sortState = ref<SortState>([]);
const currentFilters = ref<Record<string, any>>({});
const loading = ref(false);
const records = ref([]);

function onSort({ suggestedSort }: GridSortEvent) {
  sortState.value = suggestedSort;
  reload();
}

function onFilter({ filterValues }: GridFilterEvent) {
  currentFilters.value = filterValues;
  reload();
}

async function reload() {
  loading.value = true;
  records.value = await fetchPage(0, sortState.value, currentFilters.value);
  loading.value = false;
}

async function loadNextPage() {
  loading.value = true;
  const page = await fetchPage(records.value.length, sortState.value, currentFilters.value);
  records.value = [...records.value, ...page];
  loading.value = false;
}
```

```vue
<df-grid
  v-model:sortState="sortState"
  :columns="columns"
  :records="records"
  :loading="loading"
  key-field="id"
  show-filter-row
  @sort="onSort"
  @filter="onFilter"
  @load="loadNextPage"
/>
```

`@filter` fires on every filter input change, keystrokes included, and the grid does not debounce it — debounce
inside `onFilter` when each change should start a request. `@load` fires when the user scrolls within 200px of the
end **and** `loading` is `false`; keeping `:loading="true"` for the duration of each fetch is what suppresses
duplicate `@load` events while a page is in flight, so `reload()` and `loadNextPage()` don't need to guard against
re-entrancy themselves.
