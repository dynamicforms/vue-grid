# Built-in Renderers

Every built-in renderer, three rows each. Each cell is outlined, so the grid area it fills is visible: every cell fills
its grid area, and a swatch, a link or the framed `null` keeps its own size inside it. See
[Cell Renderers](/reference/renderers) for what each renderer does.

## Text, numbers and dates

<TableBuiltInRenderers :renderers="['plain', 'md', 'checkbox', 'int', 'float', 'decimal']"/>

<TableBuiltInRenderers :renderers="['date', 'time', 'datetime']"/>

<TableBuiltInRenderers :renderers="['ip4', 'ip6', 'ip']"/>

## Colour and `null`

`null-empty`, `null-null` and `null-null-fast` are given `null` in every row. `null-null-fast` frames the whole cell.

<TableBuiltInRenderers :renderers="['color', 'null-empty', 'null-null', 'null-null-fast']"/>

## Links

The third `link` value has a `javascript:` URL and renders as text; the third `file` value is empty. In `link`,
`email` and `file` the link is as wide as its text, and a click beside it reaches the row. In the `-fast` variants the
link is the whole cell, and a click anywhere in a `file-fast` cell does not reach the row. The line below the grid
shows the key of the last row clicked.

<TableBuiltInRenderers :renderers="['link', 'link-fast', 'email', 'email-fast', 'file', 'file-fast']" clicks/>

<script setup>
import TableBuiltInRenderers from '../components/table-built-in-renderers.vue';
</script>
