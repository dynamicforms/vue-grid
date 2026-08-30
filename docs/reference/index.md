# Reference

This section documents the parts of `@dynamicforms/vue-grid` you use to build a grid: the components, the column,
sorting, filtering and selection APIs, and the built-in cell renderers. The package exports more symbols than are
covered here — the bundled type declarations are the authoritative list.

This is reference material — types, props, and the rules the grid follows — not a tutorial. For task-oriented
recipes ("how do I put a clickable icon in a cell", "how do I build a responsive card layout"), see the
[Cookbook](/guide/cookbook).

## Components

| Component | Description |
|-----------|-------------|
| [`<DfGrid>`](./df-grid) | Main grid component |
| `<DfGridHeader>` | Header row, filter row and status bar. Rendered by `<DfGrid>`. |
| `<GridCard>` | Renders one row card from a record and a column list. Used by `<DfGrid>` for each row. |
| `<SortingIndicator>` | The ascending / descending / sort-index glyph drawn in header cells. |
| `<IncomingArc>` | The flash overlay rendered at the top and bottom edge of the body when `recentlyAdded` is supplied. |

## Plugin options

```typescript
interface DynamicFormsVueGridOptions {
  registerComponents: boolean;  // globally registers every component (<DfGrid> included). Default: false.
  registerDirectives: boolean;  // globally registers the v-longpress directive. Default: true.
}
```

`app.use(DynamicFormsVueGrid, options)` accepts these independently — `registerComponents` and `registerDirectives`
each control exactly one thing and don't affect each other. `registerDirectives` defaults to `true` regardless of
`registerComponents`, so installing the plugin at all (even with no options, or with `registerComponents: false`)
registers `v-longpress`; pass `registerDirectives: false` to opt out. `<DfGrid>` itself is unaffected by either
option when imported and used directly, without `app.use(DynamicFormsVueGrid, ...)` at all — see [Column
Definitions](./columns) and [`<DfGrid>`](./df-grid) for the component itself.

## Concepts

| Topic | Description |
|-------|-------------|
| [Column Definitions](./columns) | How to define columns, responsive layouts, and cell renderers |
| [Sorting](./sorting) | Sort configuration, state, and events |
| [Filtering](./filtering) | Filter configuration, state, and events |
| [Selection](./selection) | Row selection, selection modes, and batch actions |
| [Cell Renderers](./renderers) | Built-in renderers and their options |
| [Incoming Records](/examples/incoming) | The `useRecentlyAdded` composable, the `recentlyAdded` prop, and the arc overlays |
