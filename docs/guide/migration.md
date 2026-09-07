# Migration guide

## 0.4.x → 0.5.0: shared-grid row layout

Every row moved from being its own independent CSS grid to being a direct item of one shared
grid. This changes what your row/card CSS has to target.

### Move the grid declaration off `.df-grid.card`

Before, `.df-grid.card` was itself `display: grid`:

```css
.my-grid .df-grid.card {
  display: grid;
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
}
```

Now the grid lives on `.df-grid.body-grid` — the shared container all rows are items of.
`.df-grid.card` is the row-anchor: a styleable but otherwise-empty box (zebra background, border,
selection highlight), not a grid container.

```css
.my-grid .df-grid.body-grid {
  display: grid;
  grid-template-columns: 3.5em 1fr 1fr 3em;
  gap: 0.1em 0.5em;
}
```

If your layout is responsive, target `.df-grid.body-grid.<layoutCssClass>` the same way you
previously targeted `.df-grid.card.<layoutCssClass>`.

### Multi-row cards need `rows` and relative `grid-row` placement

If a layout places more than one row of fields per record, two things that used to be implicit
now have to be explicit:

1. Declare how many grid rows the layout's card occupies via `rows` on its
   `ResponsiveColumnDefinition` (default `1`):

   ```ts
   const columnsResponsive: ResponsiveColumnDefinitions = [
     { cssClass: 'card', rows: 2, columns },
   ];
   ```

2. Give **every** cell an explicit `grid-row`, relative to `calc(var(--row-base) + N)` rather than
   an absolute row number — including cells that previously relied on implicit auto-placement for
   row 1. With every record's cells sharing one grid, `grid-row: 2` would put every record's
   second row on the very same physical row instead of each record getting its own band:

   ```css
   /* before */
   .df-grid.cell.title  { grid-column: 1 / 3; grid-row: 1; }
   .df-grid.cell.id     { grid-column: 1; grid-row: 2; }

   /* after */
   .df-grid.cell.title  { grid-column: 1 / 3; grid-row: calc(var(--row-base) + 1); }
   .df-grid.cell.id     { grid-column: 1; grid-row: calc(var(--row-base) + 2); }
   ```

`--row-base` (`recordIndex * rows`) is published automatically per record — you read it, you
don't set it. See [Card layout CSS](/reference/df-grid#card-layout-css) and the
[Cookbook](/guide/cookbook#a-responsive-multi-row-card-layout) for a full worked example.

### `mainShadowCount` is gone

It configured the primary shadow grid, which no longer exists — column widths are resolved
natively now. If you had set it, remove it; there's no replacement to configure for the same
purpose.

Two new props take its place for a related but different concern — how many rows stay mounted for
smooth scrolling and for native column auto-sizing to have a representative sample:

- `minRenderedRows` (default `30`) — records kept mounted on each side of the visible range.
- `estimatedRowHeight` (default `30`) — assumed height for a not-yet-rendered record, sizing the
  placeholder standing in for windowed-out rows. Set this close to your actual row height; the
  grid does not average measured heights to refine it for you.

### `@pdanpdan/virtual-scroll` is no longer a peer dependency

If you depended on it only because this package required it as a peer, you can remove it too —
row windowing no longer uses it.
