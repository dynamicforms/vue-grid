# Column Definitions

Columns are defined using `createColumn()` and passed to `<DfGrid>` via the `columns` prop. The grid supports both flat (single-layout) and responsive (multi-layout) column definitions.

## `createColumn()`

```typescript
function createColumn<R extends keyof RendererOptionsMap>(
  fieldName: string,
  label: string,
  renderer?: R,
  otherOptions?: Omit<ColumnDefinition, 'fieldName' | 'label' | 'renderer'>,
): ColumnDefinition<R>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fieldName` | `string` | Property name on the row data object. Also used as a CSS class on cells. |
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

### Example

```typescript
import { createColumn } from '@dynamicforms/vue-grid';

const columns = [
  createColumn('id', 'ID', 'int', { cssClass: 'text-right' }),
  createColumn('title', 'Title', 'plain', { sortable: true }),
  createColumn('rating', 'Rating', 'float', {
    sortable: { direction: 'desc', nulls: 'last' },
    filterable: { fieldType: 'number' },
    rendererOptions: { decimalPlaces: 1 },
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

The grid's `ResizeObserver` measures shadow grids for each layout and emits `update:activeColumns` with the `cssClass` of the best-fitting layout whenever the container is resized.

```typescript
const columnsResponsive: ResponsiveColumnDefinitions = [
  { cssClass: 'wide',   columns: filterColumns(allColumns, [0, 1, 2, 3, 4, 5]) },
  { cssClass: 'medium', columns: filterColumns(allColumns, [0, 1, 2, 3]) },
  { cssClass: 'narrow', columns: allColumns },
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
- `{ fieldName: occurrence }` — picks the *n-th* column with that `fieldName` (useful when the same `fieldName` appears more than once)
