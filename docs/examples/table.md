# Full-featured Demo

A music library with 10 000 rows demonstrating:

- **Responsive layouts** — three CSS grid layouts (`single-line`, `three-row`, `single-column`) that switch automatically as the container resizes
- **Filtering** — text, number, and multi-select (`Language`) filters applied locally
- **Toolbar and footer slots** — title and record count in the toolbar; active layout indicator in the footer
- **`postRender`** — the shuffle icon in the _Favorite_ column is a clickable Vue component injected via `postRender`
- **`transform`** — the second _Year_ column applies `v % 100` to show the two-digit year

Try clicking column headers to sort, typing in the filter row, and dragging the window narrower to watch the layout change.

<table-basic/>

<script setup>
import TableBasic from '../components/table-basic.vue';
</script>
