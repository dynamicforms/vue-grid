<template>
  <div class="built-in-renderers" :style="{ '--columns': columns.length }">
    <df-input v-if="schemes" v-model="schemesText" label="URL schemes, comma-separated" />
    <df-grid
      :columns="gridColumns"
      :records="records"
      key-field="id"
      style="height: 10em"
      @click="lastClick = String($event.key)"
    />
    <p v-if="clicks" class="last-click">Last row click: {{ lastClick }}</p>
  </div>
</template>

<script setup lang="ts">
import { DfInput } from '@dynamicforms/vuetify-inputs';
import { computed, ref } from 'vue';

import { createColumn, defaultUrlSchemes, type RendererOptionsMap } from '../../src';

type NullHandler = 'null-empty' | 'null-null' | 'null-null-fast';
type Renderer = Exclude<keyof RendererOptionsMap, 'header' | NullHandler>;

/**
 * A column is a renderer, e.g. `'int'`, or a renderer and the `nullHandler` its `null` values are rendered with, e.g.
 * `'int:null-empty'`. `'int:default'` gives the column no `rendererOptions`, so the grid renders its `null` values with
 * `null-null`. A column with a `nullHandler` has a `null` in its second row.
 */
type ColumnSpec = Renderer | `${Renderer}:${NullHandler | 'default'}`;

// `clicks` shows the key of the last row clicked; `schemes` shows an input for the URL schemes of the link columns
const props = defineProps<{ columns: ColumnSpec[]; clicks?: boolean; schemes?: boolean }>();

// three values for each renderer, one per row; a -fast renderer is given the values of its renderer
const values: Record<Exclude<Renderer, `${string}-fast`>, unknown[]> = {
  plain: ['Alpha', 'Beta', 'Gamma'],
  md: ['**bold**', '_italic_', '`code`'],
  color: ['#e53935', 'rgb(67 160 71)', 'hsl(210 80% 55%)'],
  checkbox: [true, false, null],
  link: ['https://w3.org', 'https://vuejs.org', 'ftp://example.com'],
  email: ['ana@example.com', 'Bor Novak <bor@example.com>', 'info@example.com'],
  file: ['/files/report.pdf', '/files/photo.jpg', 'ftp://example.com/data.csv'],
  ip4: ['192.168.0.1', '10.0.0.12', '8.8.8.8'],
  ip6: ['2001:db8::1', '::1', 'fe80::1:2'],
  ip: ['192.168.0.1', '2001:db8::1', '::ffff:10.0.0.1'],
  int: [7, 1234, -56],
  float: [3.14159, 2.5, 1000],
  decimal: ['12.30', '0.5', '7'],
  date: ['2026-10-20', '2025-01-05', '2024-12-31'],
  time: ['08:30:00', '12:00:00', '23:59:59'],
  datetime: ['2026-10-20T08:30:00', '2025-01-05T12:00:00', '2024-12-31T23:59:59'],
};

const parsed = props.columns.map((spec) => {
  const [renderer, nullHandler] = spec.split(':') as [Renderer, NullHandler | 'default' | undefined];
  const rowValues = [...values[renderer.replace(/-fast$/, '') as keyof typeof values]];
  if (nullHandler) rowValues[1] = null;
  return { field: spec.replace(':', '-'), renderer, nullHandler, rowValues };
});

const records = [0, 1, 2].map((row) =>
  Object.fromEntries([['id', row + 1], ...parsed.map((column) => [column.field, column.rowValues[row]])]),
);

const schemesText = ref(defaultUrlSchemes.join(', '));
const urlSchemes = computed(() =>
  schemesText.value
    .split(',')
    .map((scheme) => scheme.trim())
    .filter(Boolean),
);
const linkRenderers = ['link', 'link-fast', 'email', 'email-fast', 'file', 'file-fast'];

const gridColumns = computed(() =>
  parsed.map(({ field, renderer, nullHandler }) => {
    const label = nullHandler ? `${renderer} · ${nullHandler}` : renderer;
    if (nullHandler === 'default') return createColumn(field, label, renderer);
    // an empty `rendererOptions` leaves `null` to the column's own renderer, rather than to the default `null-null`
    const rendererOptions: Record<string, unknown> = nullHandler ? { nullHandler } : {};
    if (renderer === 'time') rendererOptions.parseISOPrefix = '2000-01-01T';
    if (props.schemes && linkRenderers.includes(renderer)) rendererOptions.urlSchemes = urlSchemes.value;
    return createColumn(field, label, renderer, { rendererOptions });
  }),
);

const lastClick = ref('—');
</script>

<style scoped>
:deep(.df-record-grid) {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  font-size: 0.9rem;
}
/* the outline shows the grid area each cell fills */
:deep(.df-grid.cell) {
  box-shadow: inset 0 0 0 1px rgb(128 128 128 / 0.3);
  padding: 0.25em;
}
/* the background shows the box of a link */
:deep(.df-anchored a) {
  background: rgb(33 150 243 / 0.15);
}
:deep(.df-grid.header) {
  font-weight: bold;
}
.last-click {
  margin-top: 0.25em;
  font-size: 0.85rem;
}
</style>
