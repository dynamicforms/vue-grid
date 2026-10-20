<template>
  <div class="built-in-renderers" :style="{ '--columns': renderers.length }">
    <df-grid
      :columns="columns"
      :records="records"
      key-field="id"
      style="height: 10em"
      @click="lastClick = String($event.key)"
    />
    <p v-if="clicks" class="last-click">Last row click: {{ lastClick }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { createColumn, type RendererOptionsMap } from '../../src';

type Renderer = Exclude<keyof RendererOptionsMap, 'header'>;

// `clicks` shows the key of the last row clicked
const props = defineProps<{ renderers: Renderer[]; clicks?: boolean }>();

// three values for each renderer, one per row
const values: Record<Renderer, unknown[]> = {
  plain: ['Alpha', 'Beta', 'Gamma'],
  md: ['**bold**', '_italic_', '`code`'],
  color: ['#e53935', 'rgb(67 160 71)', 'hsl(210 80% 55%)'],
  checkbox: [true, false, null],
  link: ['https://w3.org', 'https://vuejs.org', 'javascript:alert(1)'],
  'link-fast': ['https://w3.org', 'https://vuejs.org', 'javascript:alert(1)'],
  email: ['ana@example.com', 'Bor Novak <bor@example.com>', 'info@example.com'],
  'email-fast': ['ana@example.com', 'Bor Novak <bor@example.com>', 'info@example.com'],
  file: ['/files/report.pdf', '/files/photo.jpg', ''],
  'file-fast': ['/files/report.pdf', '/files/photo.jpg', ''],
  ip4: ['192.168.0.1', '10.0.0.12', '8.8.8.8'],
  ip6: ['2001:db8::1', '::1', 'fe80::1:2'],
  ip: ['192.168.0.1', '2001:db8::1', '::ffff:10.0.0.1'],
  int: [7, 1234, -56],
  float: [3.14159, 2.5, 1000],
  decimal: ['12.30', '0.5', '7'],
  date: ['2026-10-20', '2025-01-05', '2024-12-31'],
  time: ['08:30:00', '12:00:00', '23:59:59'],
  datetime: ['2026-10-20T08:30:00', '2025-01-05T12:00:00', '2024-12-31T23:59:59'],
  'null-empty': [null, null, null],
  'null-null': [null, null, null],
  'null-null-fast': [null, null, null],
};

const records = [0, 1, 2].map((row) =>
  Object.fromEntries([['id', row + 1], ...props.renderers.map((renderer) => [renderer, values[renderer][row]])]),
);

// an empty `rendererOptions` leaves `null` to the column's own renderer, rather than to the default `null-null`
const columns = props.renderers.map((renderer) =>
  createColumn(renderer, renderer, renderer, {
    rendererOptions: renderer === 'time' ? { parseISOPrefix: '2000-01-01T' } : {},
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
:deep(.df-grid.header) {
  font-weight: bold;
}
.last-click {
  margin-top: 0.25em;
  font-size: 0.85rem;
}
</style>
