# Built-in Renderers

Every built-in renderer, three rows each. Each cell is outlined, so the grid area it fills is visible: every cell fills
its grid area, and a swatch, a link or the framed `null` keeps its own size inside it. See
[Cell Renderers](/reference/renderers) for what each renderer does.

## Text, numbers and dates

<TableBuiltInRenderers :columns="['plain', 'md', 'checkbox', 'int', 'float', 'decimal']"/>

<TableBuiltInRenderers :columns="['date', 'time', 'datetime', 'color']"/>

<TableBuiltInRenderers :columns="['ip4', 'ip6', 'ip']"/>

## `null` values

The same `int` column, with a `null` in the second row, rendered with each `nullHandler`. The first column has no
`rendererOptions`, so the grid renders its `null` with `null-null`. `null-null` frames the text, `null-null-fast` frames
the whole cell.

<TableBuiltInRenderers :columns="['int:default', 'int:null-empty', 'int:null-null', 'int:null-null-fast']"/>

## Links

Each link has a tinted background, so its box is visible. In `link`, `email` and `file` the link is as wide as its text,
and a click beside it reaches the row. In the `-fast` variants the link is the whole cell, and a click anywhere in a
`file-fast` cell does not reach the row. The line below the grid shows the key of the last row clicked.

A link takes the URL schemes `http`, `https`, `mailto` and `tel` by default; a URL with another scheme renders as text,
without a link. The schemes are set for every grid with `setAllowedUrlSchemes()`, or for one column with the
`urlSchemes` renderer option. The input above the grid sets `urlSchemes` of its columns: with `ftp` added, the third
`link` and `file` values render as links; with `mailto` removed, the email addresses render as text.

<TableBuiltInRenderers :columns="['link', 'link-fast', 'email', 'email-fast', 'file', 'file-fast']" clicks schemes/>

<script setup>
import TableBuiltInRenderers from '../components/table-built-in-renderers.vue';
</script>
