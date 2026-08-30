# Server-side Sorting & Filtering

Delegates sorting and filtering to a backend via the [`sortExternal`](/reference/sorting#sortexternal) and
[`filterExternal`](/reference/filtering#filterexternal) sentinels, loads records a page at a time via the `load`
event, and shows the built-in loading/no-data states via the `loading` prop (see
[`<DfGrid>` props](/reference/df-grid#props)). See
[Delegating sorting, filtering, and pagination to a server](/guide/cookbook#delegating-sorting-filtering-and-pagination-to-a-server)
in the Cookbook for the full wiring.

The demo below starts empty. Click **Load data** to fetch the first page from the server; subsequent pages arrive automatically as you scroll to the bottom. **Clear** resets to the empty state. Sort and filter changes always restart from page one.

<table-server/>

<script setup>
import TableServer from '../components/table-server.vue';
</script>
