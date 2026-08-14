# API Reference

This section documents the parts of `@dynamicforms/vue-grid` you use to build a grid: the components, the column,
sorting, filtering and selection APIs, and the built-in cell renderers. The package exports more symbols than are
covered here — the bundled type declarations are the authoritative list.

## Components

| Component | Description |
|-----------|-------------|
| [`<DfGrid>`](./df-grid) | Main grid component |
| `<DfGridHeader>` | Header row, filter row and status bar. Rendered by `<DfGrid>`. |
| `<GridCard>` | Renders one row card from a record and a column list. Used by `<DfGrid>` for each row. |
| `<SortingIndicator>` | The ascending / descending / sort-index glyph drawn in header cells. |
| `<IncomingArc>` | The flash overlay rendered at the top and bottom edge of the body when `recentlyAdded` is supplied. |

## Concepts

| Topic | Description |
|-------|-------------|
| [Column Definitions](./columns) | How to define columns, responsive layouts, and cell renderers |
| [Sorting](./sorting) | Sort configuration, state, and events |
| [Filtering](./filtering) | Filter configuration, state, and events |
| [Selection](./selection) | Row selection, selection modes, and batch actions |
| [Cell Renderers](./renderers) | Built-in renderers and their options |
| [Incoming Records](/examples/incoming) | The `useRecentlyAdded` composable, the `recentlyAdded` prop, and the arc overlays |
