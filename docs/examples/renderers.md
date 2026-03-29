# Cell Renderers

Every column has a `renderer` (defaults to `'plain'`). Three `rendererOptions` — `transform`, `preRender`, and `postRender` — let you customise any renderer without writing a custom one.

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

When the (possibly transformed) value is `null` or `undefined`, the cell falls back to this renderer instead. Useful to keep a column's type-specific formatting while gracefully handling missing data.

```typescript
createColumn('salary', 'Salary', 'plain', {
  rendererOptions: { nullHandler: 'null-empty' },
})
```

## `preRender` / `postRender`

Inject additional content to the left or right of the main cell value. When either is set the cell switches to a flex layout with three zones: `pre · content · post`. Return a plain HTML string or a `RenderableValue` for Vue components.

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

<table-renderers/>

<script setup>
import TableRenderers from '../components/table-renderers.vue';
</script>
