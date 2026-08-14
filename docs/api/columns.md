# Column Definitions

Columns are defined using `createColumn()` and passed to `<DfGrid>` via the `columns` prop. The grid supports both flat (single-layout) and responsive (multi-layout) column definitions.

## `createColumn()`

```typescript
function createColumn<R extends keyof RendererOptionsMap>(
  fieldName: string,
  label: string,
  renderer?: R,
  otherOptions?: Omit<ColumnDefinition<R>, 'fieldName' | 'label' | 'renderer'>,
): ColumnDefinition<R>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fieldName` | `string` | Property name on the row data object, read as a direct property access — dotted paths are not resolved. Also used as a CSS class on cells. |
| `label` | `string` | Column header label. |
| `renderer` | `keyof RendererOptionsMap` | Cell renderer to use. Defaults to `'plain'`. See [Cell Renderers](./renderers). |
| `otherOptions` | `object` | Additional column options (see `ColumnDefinition` below). |

### `ColumnDefinition`

```typescript
interface ColumnDefinition<R extends keyof RendererOptionsMap = 'plain'> {
  fieldName: string;
  label: string;
  renderer?: R;
  rendererOptions?: RendererOptionsMap[R]; // renderer-specific options
  sortable?: Sortable;                     // see Sorting
  filterable?: Filterable;                 // see Filtering
  cssClass?: string;                       // additional CSS class(es) on cells
}
```

`createColumn()` sets `sortable: true` on the column it builds; a `sortable` key in `otherOptions` overrides it. A `ColumnDefinition` written as a plain object literal has no such default, and a column without `sortable` cannot be sorted.

### Example

```typescript
import { createColumn } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('id', 'ID', 'int', { cssClass: 'text-right' }),
  createColumn('title', 'Title', 'plain', { sortable: true }),
  createColumn('rating', 'Rating', 'float', {
    sortable: { direction: 'desc', nulls: 'last' },
    filterable: { fieldType: 'number' },
    rendererOptions: { locale: { locale: 'en-US', localeOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 } } },
  }),
];
```

## Responsive layouts

To define multiple layouts that activate at different container widths, pass an array of `ResponsiveColumnDefinition` objects:

```typescript
interface ResponsiveColumnDefinition {
  name?: string;     // optional name; defaults to cssClass value
  cssClass: string;  // CSS class applied to each row card in this layout
  columns: ColumnDefinitionsList;
}

type ResponsiveColumnDefinitions = ColumnDefinitionsList | ResponsiveColumnDefinition[];
```

The grid decides whether the array is responsive by looking at its first element: an element carrying `name` or `cssClass` together with `columns` marks the whole array as a list of layouts. Every entry must end up with a non-empty name — `name`, or `cssClass` when `name` is omitted — otherwise the grid throws `column definition <idx> must have a name or cssClasses assigned and non-empty`.

The grid renders a hidden shadow grid for each layout and records the width that layout needs. When the container is resized, it emits `update:activeColumns` with the *name* of the widest layout whose recorded width still fits the container. If no layout fits, the active layout stays as it is.

The value of `activeColumns` is matched against the layout name — `name` when given, otherwise `cssClass`. When `activeColumns` is unset, or names no existing layout, the first layout in the array is used. A flat column list is treated as a single layout named `default` with an empty `cssClass`.

```typescript
import { createColumn, filterColumns } from '@dynamicforms/vue-grid';
import type { ResponsiveColumnDefinitions } from '@dynamicforms/vue-grid';

const allColumns = [
  createColumn('id',      'ID',      'int'),
  createColumn('name',    'Name',    'plain'),
  createColumn('country', 'Country', 'plain'),
  createColumn('email',   'Email',   'email'),
];

const columnsResponsive: ResponsiveColumnDefinitions = [
  { cssClass: 'wide',   columns: allColumns },
  { cssClass: 'medium', columns: filterColumns(allColumns, [0, 1, 3]) },
  { cssClass: 'narrow', columns: filterColumns(allColumns, [1]) },
];
```

```vue
<df-grid
  v-model:active-columns="activeLayout"
  :columns="columnsResponsive"
  :records="records"
  key-field="id"
/>
```

## `filterColumns()`

A helper to select a subset of columns by index or field name:

```typescript
function filterColumns(
  columns: ColumnDefinitionsList,
  selectors: (number | string | { [fieldName: string]: number })[],
): ColumnDefinitionsList
```

Selectors can be:
- `number` — picks column at that index
- `string` — picks the first column with that `fieldName`
- `{ fieldName: occurrence }` — picks the column with that `fieldName` at index `occurrence` (0-based) among all columns sharing the name; only the first entry of the object is read

The returned list follows the order of the selectors, not the order of the columns. A column selected twice appears twice, and a selector that matches nothing is dropped.

## `useColumns()`

```typescript
function useColumns(props: GridProps, gridId: symbol)
```

The composable `<DfGrid>` uses to resolve the `columns` prop down to a single active layout. `gridId` is a symbol identifying the grid instance; it is what the numeric renderers register their per-column formatting state under, and what releases it when the grid unmounts. The returned members are all computed refs:

| Member | Description |
|--------|-------------|
| `active` | Name of the active layout: the `activeColumns` prop, or the first layout's name when the prop is unset. |
| `builtColumns` | All layouts, each carrying `name`, `cssClass` and `columns`. |
| `activeColumnsDefinition` | The entry of `builtColumns` that is currently active. |
| `name` | `name` of the active layout. |
| `cssClass` | `cssClass` of the active layout; `''` for a flat column list. |
| `columns` | The active layout's column list. |
