# Migration guide

## 0.5.x → 0.6.0: vue-forms 2.0

0.6.0 requires `@dynamicforms/vue-forms` 2.0 and `@dynamicforms/vuetify-inputs` 0.12. Upgrade the
three together, and work through the
[vue-forms](https://docs.velis.si/dynamicforms/vue-forms/guide/migration) and
[vuetify-inputs](https://docs.velis.si/dynamicforms/vuetify-inputs/guide/migration) migration
guides first: they cover what changes in forms and inputs. This section covers what changes in the
grid's filtering on top of them. Both changes are silent - code keeps compiling and behaves
differently.

```bash
npm install @dynamicforms/vue-forms@^2.0.0 @dynamicforms/vuetify-inputs@^0.12.0 @dynamicforms/vue-grid@^0.6.0
```

### A hidden filter field does not filter

`FilterState` is a vue-forms `Group`, and in vue-forms 2.0 a member's `visibility` decides what it
contributes to the group's value. A filter field set to `HIDDEN` reads `null` in `filterValues`
whatever it holds, and one set to `SUPPRESS` is left out, the way a disabled one already was:

```typescript
filterState.fields.status.value = 'open';
filterState.fields.status.visibility = DisplayMode.HIDDEN;
// filterValues: before { …, status: 'open' }   after { …, status: null }
// local filtering: before only 'open' rows     after every row
```

Neither filters locally, neither counts in the status bar's active-filter count, and a server
receives `null` or no key for it. An application that hid a filter input to apply a fixed filter
the user cannot change loses that filter; apply the fixed condition to the records passed to the
grid, or to the server request, instead.

A `filterExternal` column whose field is disabled or `SUPPRESS`ed is left out as well, so while every
external column's field is in that state the grid goes back to filtering locally.

### `filter` is emitted when the filter state becomes empty

A `Group` whose members are all left out reads `{}` in vue-forms 2.0, where it read `null`. The grid
emits `update:filterState` and `filter` for that change as for any other, with `filterValues: {}`:

```typescript
Object.values(filterState.fields).forEach((field) => (field.enabled = false));
// before: no event, filterValues stayed what they were last sent
// after:  @filter with filterValues {}
```

The same happens when a `filterState` without filterable columns is passed in. An `@filter` handler
that fetches filtered records now also runs with no filters at all and should fetch the unfiltered
set; a handler that assumed at least one key in `filterValues` needs to accept an empty object.

## 0.4.x → 0.5.0: shared-grid row layout

Every row moved from being its own independent CSS grid to being a direct item of one shared
grid. This changes what your row/card CSS has to target.

### Move the grid declaration off `.df-grid.card`, onto `.df-record-grid`

Before, `.df-grid.card` was itself `display: grid`:

```css
.my-grid .df-grid.card {
  display: grid;
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
}
```

Now the grid lives on `.df-record-grid` — the marker every place that lays out a record's fields
carries: the real scrolling body, the header, and the filter row alike. `.df-grid.card` is the
row-anchor: a styleable but otherwise-empty box (zebra background, border, selection highlight),
not a grid container.

```css
.my-grid .df-record-grid {
  display: grid;
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
}
```

`.df-grid.body-grid` still exists — it's the real scrolling body specifically, not a synonym for
`.df-record-grid` — but a rule written only against it, for something that should look the same
everywhere (the track template, `gap`, `font-size`), is exactly how the header and filter row end
up silently out of step with the body: they sit outside the body's own scroller and can never be
native items of it, so they need the identical declaration on their own, separate boxes. Reach for
`.df-grid.body-grid` only when a rule is meant for the real scrolling body and nowhere else — a
responsive layout's own per-record cell-placement rules are the main example, since the header and
filter row use a different, offset placement scheme (see
[Card layout CSS](/reference/df-grid#card-layout-css) for the `df-anchored`/`df-unanchored` detail).

If your layout is responsive, target `.df-record-grid.<layoutCssClass>` the same way you
previously targeted `.df-grid.card.<layoutCssClass>`.

### `.df-grid.card` is a sibling of its cells now, not their ancestor

If you had your own click handling that walked up from a clicked cell with something like
`event.target.closest('.df-grid.card')` to work out which row was clicked — rather than using the
grid's own `click` event or `rowClass` — it will now silently return `null`. A record's cells are
children of a `display: contents` wrapper next to the row-anchor, not inside it; `.closest()` from
a cell can only reach the row through that wrapper. Use `.closest('[data-idx]')` (or `[data-pk]`)
instead — the wrapper carries both, same as the row-anchor does. See
[Row attributes](/reference/df-grid#row-attributes).

The same no-longer-an-ancestor change means any padding you had on `.df-grid.card` to inset cell
content is dead now, silently — `.df-grid.card` no longer wraps the cells, so padding on it
doesn't reach them. Move it onto `.df-grid.cell` instead, or, if your layout gives every cell an
explicit `grid-column`, opt `.df-grid.card` back into a real, in-flow box via `--card-position` —
see [Row-anchor position](/reference/df-grid#row-anchor-position) for what that buys you and what
it requires.

### Multi-row layouts need an explicit `grid-row` per field

Plain CSS auto-placement has no notion of "record boundaries": once every record's cells are items
of the *same* shared grid, an unplaced cell's `grid-row: auto` keeps advancing across the whole
grid rather than restarting for each record. `.df-grid.cell` defaults to
`grid-row: calc(var(--row-base) + 1)`, correct for a plain single row per record — nothing to add
there. A layout that places more than one row of fields per record needs more, two things that
used to be implicit now explicit:

::: tip Briefly stricter in 0.5.0–0.5.1
Those two versions required *every* cell, including a plain single row per record, to declare
`grid-row: calc(var(--row-base) + 1)` itself — 0.5.2 made that the library's own default, closing
the gap. See [Card layout CSS](/reference/df-grid#card-layout-css).
:::

1. Declare how many grid rows the layout's card occupies via `rows` on its
   `ResponsiveColumnDefinition` (default `1`):

   ```ts
   const columnsResponsive: ResponsiveColumnDefinitions = [
     { cssClass: 'card', rows: 2, columns },
   ];
   ```

2. Give **every** cell its own explicit `grid-row`, relative to `calc(var(--row-base) + N)` rather
   than an absolute row number. With every record's cells sharing one grid, `grid-row: 2` would put
   every record's second row on the very same physical row instead of each record getting its own
   band:

   ```css
   /* before */
   .df-grid.cell.title  { grid-column: 1 / 3; grid-row: 1; }
   .df-grid.cell.id     { grid-column: 1; grid-row: 2; }

   /* after */
   .df-grid.cell.title  { grid-column: 1 / 3; grid-row: calc(var(--row-base) + 1); }
   .df-grid.cell.id     { grid-column: 1; grid-row: calc(var(--row-base) + 2); }
   ```

`--row-base` is published automatically per record — you read it, you don't set it. It advances by
`rows` from one mounted record to the next; it is not the record's own index in your dataset (see
[Card layout CSS](/reference/df-grid#card-layout-css) for why), so don't compute or compare it
yourself. See the [Cookbook](/guide/cookbook#a-responsive-multi-row-card-layout) for a full worked
example.

### `mainShadowCount` is gone

It configured the primary shadow grid, which no longer exists — column widths are resolved
natively now. If you had set it, remove it; there's no replacement to configure for the same
purpose.

Two new props take its place for a related but different concern — how many rows stay mounted for
smooth scrolling and for native column auto-sizing to have a representative sample:

- `minRenderedRows` (default `100`) — records kept mounted on each side of the visible range.
- `estimatedRowHeight` (default `30`) — assumed height for a not-yet-rendered record, sizing the
  placeholder standing in for windowed-out rows. Set this close to your actual row height; the
  grid does not average measured heights to refine it for you.

### `@pdanpdan/virtual-scroll` is no longer a peer dependency

If you depended on it only because this package required it as a peer, you can remove it too —
row windowing no longer uses it.
