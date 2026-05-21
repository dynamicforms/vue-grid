# Full-featured Demo

A music library with 10 000 rows demonstrating:

- **Responsive layouts** — three CSS grid layouts (`single-line`, `three-row`, `single-column`) that switch automatically as the container resizes
- **Filtering** — text, number, and multi-select (`Language`) filters applied locally
- **Toolbar and footer slots** — title and record count in the toolbar; active layout indicator in the footer
- **`postRender`** — the shuffle icon in the _Favorite_ column is a clickable Vue component injected via `postRender`
- **`transform`** — the second _Year_ column applies `v % 100` to show the two-digit year

**Sorting** — click any column header to sort ascending; click again for descending; a third click clears the sort. Hold Shift and click additional headers to add secondary sort keys. See [Sorting](/api/sorting).

**Filtering** — type in the filter row below the headers to filter by text or number. The _Language_ column uses a multi-select filter. Filters are combined with AND logic. See [Filtering](/api/filtering).

**Selection** — long-press a row (or Shift+click) to enter selection mode. Click rows to toggle them. The status bar shows the count and lets you invert the selection or cancel. The _three-row_ layout adds a checkbox next to the delete icon; the other two layouts disable selection. See [Selection](/api/selection).

Try dragging the window narrower to watch the layout switch automatically between the three responsive views.

<table-basic/>

<script setup>
import TableBasic from '../components/table-basic.vue';
</script>
