# Cell Renderers

Every column has a `renderer` that determines how its value is displayed. Renderers are specified by name in `createColumn()` and can be customised via `rendererOptions`.

## Built-in renderers

| Renderer | Input type | Description |
|----------|------------|-------------|
| `plain` | any | Renders the value inside a `div` as HTML, so markup in the value is interpreted. |
| `int` | number | Integer. Supports locale-aware formatting. |
| `float` | number | Floating-point number, formatted with `Intl.NumberFormat`. Fraction digits are controlled through `locale.localeOptions`. |
| `decimal` | number | Identical to `float`: same formatting, same options. |
| `date` | string \| Date | Formats a date value. |
| `time` | string \| Date | Formats a time value. |
| `datetime` | string \| Date | Formats a date+time value. |
| `checkbox` | boolean | Renders a checked/unchecked indicator. |
| `md` | string | Renders Markdown content. |
| `color` | string | Renders a colour swatch. |
| `link` | string | Renders a hyperlink. |
| `email` | string | Renders a `mailto:` link. |
| `file` | string | Renders a file download link. |
| `ip4` | string | IPv4 address. |
| `ip6` | string | IPv6 address. |
| `ip` | string | Auto-detects IPv4 or IPv6. |
| `null-empty` | any | Renders an empty cell. It does not look at the value; it exists to be named as a `nullHandler`. |
| `null-null` | any | Renders the text `null` inside a `div` with the CSS class `df-cell-null`. It does not look at the value; it exists to be named as a `nullHandler`. |
| `header` | — | Internal renderer for header cells. Not for data columns. |

## Common options (`CellOptions`)

Renderers accept these base options via `rendererOptions`. `null-empty`, `null-null` and `header` ignore `transform`; every other renderer applies it.

```typescript
interface CellOptions {
  nullHandler?: string;                                                    // renderer key to use when value is null/undefined
  transform?: (value: any, row: RowValue) => any;                         // transform value before rendering
  preRender?: (value: any, row: RowValue) => RenderableValue | string | null;  // content rendered before (left of) the cell value
  postRender?: (value: any, row: RowValue) => RenderableValue | string | null; // content rendered after (right of) the cell value
}
```

The `transform` function receives the raw cell value and the full row object, and returns the value that will actually be rendered.

A column that specifies no `rendererOptions` at all is given `{ nullHandler: 'null-null' }`, so its `null` and `undefined` cells are rendered by `null-null`. As soon as you supply a `rendererOptions` object, that default is gone: without a `nullHandler` key the column's own renderer receives the `null`. The choice is made on the raw record value, before `transform` runs.

`preRender` and `postRender` allow injecting additional content to the left or right of the main cell value. When either is set, the cell switches to a flex layout with three zones: `pre`, `content`, and `post`. Such cells carry the extra CSS class `has-pre-post`, which is what the flex layout is attached to. `has-pre-post` is applied whenever the column has `preRender`/`postRender` configured, regardless of what an individual row's callback returns.

### Interactive content via preRender/postRender

Unlike `transform` — whose return value always ends up wrapped in an HTML string (`componentVHtml`) — `preRender`
and `postRender` can return a `RenderableValue` wrapping a real Vue component, which is what makes them the only way
to put an interactive element (an icon with its own click handler, say) inside a cell.

```typescript
import { RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

createColumn('favorite', 'Favorite', 'checkbox', {
  rendererOptions: {
    postRender: (value, row) => new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: {
        name: 'mdi-shuffle',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          row.favorite = !row.favorite;
        },
      },
    } as SimpleComponentDef),
  },
})
```

`SimpleComponentDef` (from `@dynamicforms/vue-forms`) is what both `preRender`/`postRender` and `setCellRenderer()` build:

```typescript
interface SimpleComponentDef {
  componentName: string;              // name of a globally registered component, or a native tag like 'div'
  componentProps?: Record<any, any>;  // props/attrs/event handlers passed to the component
  componentVHtml?: string;            // raw HTML rendered via v-html; mutually exclusive in practice with componentProps' children
}
```

`componentName` is resolved as a **globally registered** component name — a component only imported locally in your
`<script setup>` will not resolve. `CachedIcon`, used above, is registered globally by the plugin when installed with
`registerComponents: true` (see [Getting Started](/guide/getting-started#installation)).

::: warning Always call `stopPropagation()`
`preRender`/`postRender` content sits inside the same row card the grid's own click handler listens on. Without
`e.stopPropagation()` in the component's own handler, the click also bubbles up and is interpreted as a click on the
row — which, while selection mode is active, toggles the row's selection instead of (or in addition to) running your
handler.
:::

Returning `null` leaves that zone genuinely absent from the DOM for that row; returning `''` (a plain renderer's
default when `transform` yields an empty string) still renders as an empty component. See the
[Cookbook](/guide/cookbook) for the conditionally-empty-cell, action-only-column, and selection-checkbox-column
patterns built on top of this.

## Numeric options (`int`, `float`, `decimal`)

```typescript
interface LocaleWithOptions {
  locale?: string;                        // BCP 47 locale string (e.g. 'sl-SI')
  localeOptions?: Intl.NumberFormatOptions; // passed directly to Intl.NumberFormat
}

interface IntOptions extends CellOptions {
  locale?: string | LocaleWithOptions;  // formatting locale; defaults to browser locale
  padToLength?: number | 'auto';        // pad the integer part to N digits, or 'auto'
}
```

A numeric `padToLength` keeps values vertically aligned: the integer part is padded to that many digits, and the padding zeros are rendered at half opacity, as are the trailing zeros of the fraction.

`padToLength: 'auto'` picks the width instead of taking it from you. The column keeps track of the longest integer part and the longest fraction it has formatted so far; whenever a value exceeds either, the column's formatter is rebuilt with the new minimum digit counts and the column is redrawn, so all its cells pad to the same width. The padding is rendered at half opacity exactly as with a numeric value. Because the measurement only ever grows, the width tracks the widest value the column has actually rendered.

`localeOptions` defaults to `{ useGrouping: false }`, so grouping separators are off unless you ask for them, and `maximumFractionDigits` is set to 20 whenever you do not supply it, so fractions are not rounded by default.

The object form of `locale` is recognised only when the object contains a `locale` key; an object carrying only `localeOptions` is ignored and the defaults apply.

`int` formats the value like `float` and then cuts the fractional part off, so it truncates rather than rounds.

## Date/time options (`date`, `time`, `datetime`)

```typescript
interface DateTimeOptions extends CellOptions {
  format?: string;          // date-fns format string; defaults to 'P' (date), 'p' (time),
                            // or 'P p' (datetime), resolved against date-fns' default
                            // locale (change it globally with date-fns' setDefaultOptions)
  parseISOPrefix?: string;  // string prepended to the raw value before ISO parsing
                            // (e.g. '2000-01-01T' to make a time-only value parseable)
}
```

A `Date` instance is formatted as-is and `parseISOPrefix` is not applied to it. Any other value is parsed with date-fns' `parseISO` first, after `parseISOPrefix` has been prepended; a value `parseISO` cannot read makes formatting throw a `RangeError`.

## Custom renderers

`setCellRenderer()` replaces one of the built-in renderers **application-wide**. For a renderer scoped to a single
column instead, pass the same kind of function directly as that column's `renderer` — see
[Custom renderer functions](./columns#custom-renderer-functions).

`setCellRenderer()` replaces one of the built-in renderers:

```typescript
function setCellRenderer(
  dataType: keyof RendererOptionsMap,
  transform: CellRendererTransformer,
): void
```

`dataType` must be one of the renderer names listed above; new names cannot be added. The replacement is global — every grid in the application renders with it from that point on. Capture the current implementation with `getCellRenderers()` first if you need to keep it.

```typescript
import { RenderableValue } from '@dynamicforms/vue-forms';
import { setCellRenderer } from '@dynamicforms/vue-grid';

setCellRenderer('plain', (value, rowValue, options) => new RenderableValue({
  componentName: 'div',
  componentVHtml: value ?? '—',
}));
```

The transformer receives:
- `value` — the (possibly transformed) cell value
- `rowValue` — the full row object
- `options` — the column's `rendererOptions` object, with internal per-grid/per-column state stamped onto it under symbol keys

The return value must be a `RenderableValue` (from `@dynamicforms/vue-forms`). Its `classes` are combined with the column's `fieldName` and `cssClass` when the cell is built.

## `getCellRenderers()`

```typescript
function getCellRenderers(): RenderersMap
```

`getCellRenderers()` returns a copy of the registry as it stands at the moment of the call. Use it to wrap an existing renderer:

```typescript
import { getCellRenderers, setCellRenderer } from '@dynamicforms/vue-grid';

const original = getCellRenderers().int;
setCellRenderer('int', (value, rowValue, options) => original(value, rowValue, options));
```

## `RowValue`

```typescript
type RowValue = Record<string | symbol, any>;
```

Each item in the `records` prop must satisfy this type. The `keyField` prop names the property used as a unique row identifier.
