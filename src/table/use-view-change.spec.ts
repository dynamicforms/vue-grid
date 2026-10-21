import { describe, expect, it, vi } from 'vitest';
import { computed, EmitFn, nextTick, ref } from 'vue';

import type { RowValue } from './cell-renderers';
import type { ColumnDefinition } from './columns';
import { filterExternal, useFiltering } from './columns-filtering';
import { sortExternal, useSorting } from './columns-sorting';
import type { GridEmits, GridProps } from './df-grid-types';
import { type GridViewChangeEvent, useViewChange } from './use-view-change';

const initialRecords: RowValue[] = [
  { id: 1, title: 'Zebra', genre: 'Rock' },
  { id: 2, title: 'Apple', genre: 'Pop' },
  { id: 3, title: 'Mango', genre: 'Rock' },
];

const localColumns: ColumnDefinition[] = [
  { fieldName: 'title', label: 'Title', sortable: true, filterable: true },
  { fieldName: 'genre', label: 'Genre', sortable: true, filterable: true },
];

function setup(columnList: ColumnDefinition[] = localColumns) {
  const columns = ref(columnList);
  const records = ref<RowValue[]>(initialRecords.map((r) => ({ ...r })));
  const props: GridProps = { columns: columnList, records: records.value, keyField: 'id' };
  const events: GridViewChangeEvent[] = [];
  const emit = vi.fn((event: string, payload: GridViewChangeEvent) => {
    if (event === 'view-change') events.push(payload);
  }) as unknown as EmitFn<GridEmits>;
  const uColumns = { columns: computed(() => columns.value) } as any;

  const filtering = useFiltering(props, emit, uColumns, records);
  const sorting = useSorting(props, filtering.emitWrapper, uColumns, filtering.filteredRecords);
  const { view } = useViewChange(emit, {
    records,
    filteredRecords: filtering.filteredRecords,
    filterState: filtering.filterState,
    filteringLocal: filtering.filteringLocal,
    sortState: sorting.validatedSortState,
    sortingLocal: sorting.sortingLocal,
    columns: uColumns.columns,
  });
  return { columns, records, events, view, filtering, sortEmit: sorting.emitWrapper };
}

describe('useViewChange', () => {
  it('should emit an initial event with the counts and states', () => {
    const { events } = setup();

    expect(events).toEqual([
      {
        reasons: ['initial'],
        sortState: [],
        filterValues: { title: null, genre: null },
        shownCount: 3,
        loadedCount: 3,
        filteringLocal: true,
        sortingLocal: true,
      },
    ]);
  });

  it('should report a filter change with the filtered count', async () => {
    const { events, filtering } = setup();

    filtering.filterState.value.fields.genre.value = 'rock';
    await nextTick();

    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ reasons: ['filter'], shownCount: 2, loadedCount: 3 });
    expect(events[1].filterValues).toEqual({ title: null, genre: 'rock' });
  });

  it('should report a sort change with the sort state in effect', async () => {
    const { events, sortEmit } = setup();

    sortEmit('update:sortState', [
      { columnName: 'title', direction: 'desc' },
      { columnName: 'unknown', direction: 'asc' },
    ]);
    await nextTick();

    expect(events[1]).toMatchObject({ reasons: ['sort'], sortState: [{ columnName: 'title', direction: 'desc' }] });
  });

  it('should report replaced records and a changed length', async () => {
    const { events, records } = setup();

    records.value = [...records.value];
    await nextTick();
    records.value.push({ id: 4, title: 'Kiwi', genre: 'Pop' });
    await nextTick();

    expect(events.map((e) => e.reasons)).toEqual([['initial'], ['records'], ['records']]);
    expect(events[2]).toMatchObject({ shownCount: 4, loadedCount: 4 });
  });

  it('should report a record edited in place only when the filtered count changes', async () => {
    const { events, records, filtering } = setup();
    filtering.filterState.value.fields.genre.value = 'rock';
    await nextTick();

    records.value[0].title = 'Zebu';
    await nextTick();
    expect(events).toHaveLength(2);

    records.value[1].genre = 'Rock';
    await nextTick();
    expect(events[2]).toMatchObject({ reasons: ['records'], shownCount: 3 });
  });

  it('should emit one event for changes made in the same tick', async () => {
    const { events, records, filtering } = setup();

    filtering.filterState.value.fields.genre.value = 'pop';
    records.value = [...records.value, { id: 4, title: 'Kiwi', genre: 'Pop' }];
    await nextTick();

    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ reasons: ['filter', 'records'], shownCount: 2, loadedCount: 4 });
  });

  it('should not emit when nothing it reports changed', async () => {
    const { events, filtering } = setup();

    filtering.filterState.value.fields.genre.value = 'rock';
    await nextTick();
    filtering.filterState.value.fields.genre.value = 'rock';
    await nextTick();

    expect(events).toHaveLength(2);
  });

  it('should report a column change only when it changes the counts or modes', async () => {
    const { events, columns } = setup();

    columns.value = [...localColumns];
    await nextTick();
    expect(events).toHaveLength(1);

    columns.value = [localColumns[0], { ...localColumns[1], filterable: { key: filterExternal } }];
    await nextTick();
    expect(events[1]).toMatchObject({ reasons: ['columns'], filteringLocal: false });
  });

  it('should report the loaded count as shown when filtering is external', async () => {
    const { events, filtering } = setup([
      { fieldName: 'title', label: 'Title', filterable: { key: filterExternal } },
      { fieldName: 'genre', label: 'Genre', sortable: { key: sortExternal }, filterable: true },
    ]);

    filtering.filterState.value.fields.genre.value = 'rock';
    await nextTick();

    expect(events[0]).toMatchObject({ filteringLocal: false, sortingLocal: true });
    expect(events[1]).toMatchObject({ reasons: ['filter'], shownCount: 3, loadedCount: 3 });
  });

  it('should report external sorting when the sort state uses a sortExternal column', async () => {
    const { events, sortEmit } = setup([{ fieldName: 'title', label: 'Title', sortable: { key: sortExternal } }]);

    sortEmit('update:sortState', [{ columnName: 'title', direction: 'asc' }]);
    await nextTick();

    expect(events[1]).toMatchObject({ reasons: ['sort'], sortingLocal: false });
  });

  it('should not share objects between the payload and the grid state', async () => {
    const { events, view } = setup();

    events[0].sortState.push({ columnName: 'title', direction: 'asc' });
    events[0].filterValues.title = 'x';

    expect(view.value.sortState).toEqual([]);
    expect(view.value.filterValues.title).toBeNull();
  });
});
