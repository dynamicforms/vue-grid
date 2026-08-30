# Cell Renderers

Every column has a `renderer` (defaults to `'plain'`). Four `rendererOptions` — `transform`, `nullHandler`,
`preRender`, and `postRender` — let you customise any renderer without writing a custom one; see
[Cell Renderers](/reference/renderers) for what each one does and the [Cookbook](/guide/cookbook) for applied
recipes (clickable action icons, conditionally-empty cells, action-only columns).

## Live demo

The grid below combines all four options: a coloured status dot injected with `preRender`, a currency `transform` falling back to `null-empty` for the missing salaries, a percentage `transform` with a bar appended by `postRender`, the `date` renderer with a custom `format` string (`MMM d, yyyy`), and the `checkbox` renderer.

The grid below combines all four options: a coloured status dot injected with `preRender`, a currency `transform` falling back to `null-empty` for the missing salaries, a percentage `transform` with a bar appended by `postRender`, the `date` renderer with a custom `format` string (`MMM d, yyyy`), and the `checkbox` renderer.

<table-renderers/>

<script setup>
import TableRenderers from '../components/table-renderers.vue';
</script>
