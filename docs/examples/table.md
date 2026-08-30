# Full-featured Demo

A music library with 10 000 rows demonstrating:

- **Responsive layouts** — three CSS grid layouts (`single-line`, `three-row`, `single-column`) that switch automatically as the container resizes
- **Filtering** — text, number, date, and multi-select (`Languages`) filters applied locally
- **Toolbar and footer slots** — title, buttons that append 1 or 1000 records, and the record count in the toolbar; library name and active layout indicator in the footer
- **`#groupActions` slot** — the red delete icon in the selection status bar removes every selected record
- **`postRender`** — the shuffle icon in the _Favorite_ column is a clickable Vue component injected via `postRender`; see the [Cookbook](/guide/cookbook) for the same pattern as a standalone recipe
- **`transform`** — the second _Year_ column applies `v % 100` to show the two-digit year

**Sorting** — click any column header to sort ascending; click again for descending; a third click clears the sort. Hold Shift and click additional headers to add secondary sort keys. See [Sorting](/reference/sorting).

**Filtering** — type in the filter row below the headers to filter by text or number. The _Languages_ column uses a multi-select filter. Filters are combined with AND logic. See [Filtering](/reference/filtering).

**Selection** — long-press a row (or Shift+click) to enter selection mode. Click rows to toggle them. The status bar shows the count and lets you invert the selection or cancel. Each layout shows selection differently: _single-line_ has a dedicated checkbox column that appears only while selection is active, _three-row_ puts the checkbox next to the delete icon in the same cell, and _single-column_ marks selected rows with a background colour. See [Selection](/reference/selection).

Use the **Stretch grid to window** button above the grid, or drag the window narrower, to watch the layout switch automatically between the three responsive views.

<table-basic/>

<script setup>
import TableBasic from '../components/table-basic.vue';
</script>
