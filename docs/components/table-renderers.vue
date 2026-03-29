<template>
  <df-grid
    :columns="columns"
    :records="records"
    key-field="id"
    style="height: 24em"
  />
</template>

<script setup lang="ts">
import { createColumn } from '../../src';

// Sample employee dataset — deliberately includes nulls to show null handling
const records = [
  { id:  1, name: 'Alice Johnson',   dept: 'Engineering', salary: 75000,  score: 0.923, joined: '2020-03-15', active: true  },
  { id:  2, name: 'Bob Smith',       dept: 'Marketing',   salary: null,   score: 0.456, joined: '2019-07-22', active: false },
  { id:  3, name: 'Carol White',     dept: 'Engineering', salary: 92000,  score: 0.789, joined: '2021-11-01', active: true  },
  { id:  4, name: 'David Brown',     dept: 'Sales',       salary: 68000,  score: null,  joined: '2022-05-30', active: true  },
  { id:  5, name: 'Eve Davis',       dept: 'HR',          salary: 58000,  score: 0.611, joined: '2023-01-10', active: false },
  { id:  6, name: 'Frank Miller',    dept: 'Engineering', salary: 88000,  score: 0.841, joined: '2018-06-03', active: true  },
  { id:  7, name: 'Grace Lee',       dept: 'Design',      salary: 71000,  score: 0.732, joined: '2021-03-22', active: true  },
  { id:  8, name: 'Henry Wilson',    dept: 'Sales',       salary: null,   score: 0.298, joined: '2020-09-14', active: false },
  { id:  9, name: 'Iris Chen',       dept: 'Engineering', salary: 105000, score: 0.967, joined: '2017-01-30', active: true  },
  { id: 10, name: 'James Taylor',    dept: 'Marketing',   salary: 63000,  score: null,  joined: '2022-11-07', active: true  },
  { id: 11, name: 'Karen Martinez',  dept: 'HR',          salary: 55000,  score: 0.544, joined: '2023-04-18', active: true  },
  { id: 12, name: 'Leo Anderson',    dept: 'Design',      salary: 78000,  score: 0.812, joined: '2019-12-01', active: false },
  { id: 13, name: 'Mia Thomas',      dept: 'Engineering', salary: 97000,  score: 0.888, joined: '2016-08-25', active: true  },
  { id: 14, name: 'Nathan Jackson',  dept: 'Sales',       salary: 72000,  score: 0.503, joined: '2021-07-09', active: true  },
  { id: 15, name: 'Olivia Harris',   dept: 'Marketing',   salary: null,   score: 0.671, joined: '2020-02-14', active: false },
  { id: 16, name: 'Paul Robinson',   dept: 'HR',          salary: 61000,  score: null,  joined: '2022-08-30', active: true  },
  { id: 17, name: 'Quinn Walker',    dept: 'Engineering', salary: 83000,  score: 0.759, joined: '2018-11-11', active: true  },
  { id: 18, name: 'Rachel Hall',     dept: 'Design',      salary: 69000,  score: 0.627, joined: '2023-06-05', active: true  },
  { id: 19, name: 'Steve Young',     dept: 'Sales',       salary: 74000,  score: 0.441, joined: '2019-04-27', active: false },
  { id: 20, name: 'Tina Allen',      dept: 'Engineering', salary: 91000,  score: 0.905, joined: '2015-10-19', active: true  },
];

const columns = [
  // preRender: inject content to the LEFT of the cell value.
  // Here we show a coloured dot indicating the employee's active status.
  createColumn('name', 'Name', 'plain', {
    rendererOptions: {
      preRender: (_value, row) => {
        const color = row.active ? 'green' : '#aaa';
        return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;flex-shrink:0"></span>`;
      },
    },
  }),

  createColumn('dept', 'Department', 'plain'),

  // transform: convert the raw value before it reaches the renderer.
  // nullHandler: fall back to a different renderer when the value is null/undefined.
  createColumn('salary', 'Salary', 'plain', {
    rendererOptions: {
      nullHandler: 'null-empty',
      transform: (value) => {
        if (value == null) return null;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
      },
    },
  }),

  // transform + postRender: display a percentage and append a small bar chart.
  createColumn('score', 'Score', 'plain', {
    rendererOptions: {
      nullHandler: 'null-empty',
      transform: (value) => (value == null ? null : `${(value * 100).toFixed(1)} %`),
      postRender: (value) => {
        if (value == null) return null;
        const pct = (value * 100).toFixed(0);
        return `<span style="display:inline-block;width:${pct}px;max-width:60px;height:6px;background:#4caf50;border-radius:3px;margin-left:6px;opacity:0.7"></span>`;
      },
    },
  }),

  // 'date' renderer with a custom format string (date-fns tokens)
  createColumn('joined', 'Joined', 'date', {
    rendererOptions: { format: 'MMM d, yyyy' },
  }),

  createColumn('active', 'Active', 'checkbox'),
];
</script>

<style scoped>
:deep(.df-grid.card) {
  display: grid;
  grid-template-columns: 2fr 1fr 7em 9em 7em 4em;
  gap: 0.25em;
  padding: 0.4em 0.6em;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.9rem;
  align-items: center;
}
:deep(.df-grid.header) {
  font-weight: bold;
  background:  rgb(36 19 19 / .5);
}
:deep(.df-grid.card.even) {
  background: rgb(47 25 25 / .5);
}
</style>
