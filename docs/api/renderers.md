# Cell Renderers

Every column has a `renderer` that determines how its value is displayed. Renderers are specified by name in `createColumn()` and can be customised via `rendererOptions`.

## Built-in renderers

| Renderer | Input type | Description |
|----------|------------|-------------|
| `plain` | any | Renders the value as a plain string via `.toString()`. |
| `int` | number | Integer. Supports locale-aware formatting. |
| `float` | number | Floating-point number. Configurable decimal places. |
| `decimal` | number | Like `float` but aligned for tabular display. |
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
| `null-empty` | any | Renders `null`/`undefined` as an empty string. |
| `null-null` | any | Renders `null`/`undefined` as the string `"null"`. |
| `header` | — | Internal renderer for header cells. Not for data columns. |

## Common options (`CellOptions`)

All renderers accept these base options via `rendererOptions`:

```typescript
interface CellOptions {
  nullHandler?: string;                                                    // renderer key to use when value is null/undefined
  transform?: (value: any, row: RowValue) => any;                         // transform value before rendering
  preRender?: (value: any, row: RowValue) => RenderableValue | string | null;  // content rendered before (left of) the cell value
  postRender?: (value: any, row: RowValue) => RenderableValue | string | null; // content rendered after (right of) the cell value
}
```

The `transform` function receives the raw cell value and the full row object, and returns the value that will actually be rendered.

`preRender` and `postRender` allow injecting additional content to the left or right of the main cell value. When either is set, the cell switches to a flex layout with three zones: `pre`, `content`, and `post`.

## Numeric options (`int`, `float`, `decimal`)

```typescript
interface LocaleWithOptions {
  locale?: string;                        // BCP 47 locale string (e.g. 'sl-SI')
  localeOptions?: Intl.NumberFormatOptions; // passed directly to Intl.NumberFormat
}

interface IntOptions extends CellOptions {
  locale?: string | LocaleWithOptions;  // formatting locale; defaults to browser locale
  padToLength?: number | 'auto';        // pad integer part to N digits; 'auto' tracks
                                        // the widest value in the column and pads all to match
}
```

`padToLength: 'auto'` is useful for keeping numbers visually aligned when the column width varies by content — the grid measures the longest integer encountered and pads shorter values with dim leading zeros.

## Date/time options (`date`, `time`, `datetime`)

```typescript
interface DateTimeOptions extends CellOptions {
  format?: string;          // date-fns format string; defaults to locale-aware
                            // 'P' (date), 'p' (time), or 'P p' (datetime)
  parseISOPrefix?: string;  // string prepended to the raw value before ISO parsing
                            // (e.g. to attach a fixed timezone offset like '+02:00')
}
```

## Custom renderers

Register a custom renderer globally with `setCellRenderer()`:

```typescript
import { setCellRenderer } from '@dynamicforms/vue-grid';

setCellRenderer('plain', (value, rowValue, options) => {
  return value ?? '—';
});
```

Or replace any built-in renderer. The transformer receives:
- `value` — the (possibly transformed) cell value
- `rowValue` — the full row object
- `options` — the merged `CellOptionsInternal` for this column

The return value must be a string, number, boolean, or a VNode.

## `RowValue`

```typescript
type RowValue = Record<string | symbol, any>;
```

Each item in the `records` prop must satisfy this type. The `keyField` prop names the property used as a unique row identifier.
