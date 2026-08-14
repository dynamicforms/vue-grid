# Cell Renderers

Every column has a `renderer` (defaults to `'plain'`). Four `rendererOptions` — `transform`, `nullHandler`, `preRender`, and `postRender` — let you customise any renderer without writing a custom one.

## `transform`

Converts the raw cell value before it reaches the renderer. Receives the raw value and the full row object.

```typescript
createColumn('salary', 'Salary', 'plain', {
  rendererOptions: {
    transform: (value) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
  },
})
```

## `nullHandler`

When the value read from the record is `null` or `undefined`, the cell is rendered by this renderer instead. The check runs on the raw value, before `transform`. Useful to keep a column's type-specific formatting while gracefully handling missing data.

```typescript
createColumn('salary', 'Salary', 'plain', {
  rendererOptions: { nullHandler: 'null-empty' },
})
```

A column that declares no `rendererOptions` at all is given `nullHandler: 'null-null'`, so empty cells show the text `null` in a bordered chip (`div.df-cell-null`). Supplying a `rendererOptions` object without a `nullHandler` key removes that default and lets the column's own renderer receive the `null` value; set `'null-empty'` for a blank cell instead.

## `preRender` / `postRender`

Inject additional content to the left or right of the main cell value. When either is set the cell switches to a flex layout with three zones: `pre · content · post`, and the cell gains the class `has-pre-post`. Both hooks receive the raw record value and the row object — `transform` applies only to the content zone. Return a plain HTML string, a `RenderableValue` for Vue components, or `null` to leave that zone out.

```typescript
createColumn('name', 'Name', 'plain', {
  rendererOptions: {
    preRender: (_value, row) =>
      `<span style="width:8px;height:8px;border-radius:50%;background:${row.active ? 'green' : '#aaa'}"></span>`,
  },
})
```

```typescript
createColumn('score', 'Score', 'plain', {
  rendererOptions: {
    transform: (value) => `${(value * 100).toFixed(1)} %`,
    postRender: (value) =>
      `<span style="width:${(value * 60).toFixed(0)}px;height:6px;background:#4caf50"></span>`,
  },
})
```

## Live demo

The grid below combines all four options: a coloured status dot injected with `preRender`, a currency `transform` falling back to `null-empty` for the missing salaries, a percentage `transform` with a bar appended by `postRender`, the `date` renderer with a custom `format` string (`MMM d, yyyy`), and the `checkbox` renderer.

<table-renderers/>

<script setup>
import TableRenderers from '../components/table-renderers.vue';
</script>
