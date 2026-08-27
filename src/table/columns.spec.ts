/**
 * @file columns.spec.ts
 *
 * Tests for column utilities and the `useColumns` composable (columns.ts).
 *
 * What this file tests
 * --------------------
 * 1. **createColumn** — convenience factory for building ColumnDefinition objects:
 *      - copies `fieldName`, `label`, `renderer` and extra options into the result
 *      - sets `sortable: true` by default (can be overridden via `otherOptions`)
 *      - when renderer is `'header'`, automatically adds a default `sortState` to
 *        `rendererOptions` (only when `sortState` is not already present)
 *
 * 2. **filterColumns** — selects a subset from a flat column list using mixed selectors:
 *      - `number` selector → column at that index
 *      - `string` selector → first column whose `fieldName` matches
 *      - `{ fieldName: n }` object → the nth (0-based) occurrence of columns with
 *        that `fieldName` (useful when the same field appears in multiple groups)
 *      - selectors that resolve to nothing (out-of-bounds / non-matching name) are silently
 *        dropped from the result
 *
 * 3. **useColumns** — Vue composable resolving the active column set:
 *      - flat `ColumnDefinitionsList` → wrapped into a single group named `'default'`
 *      - `ResponsiveColumnDefinition[]` → each entry becomes a named group; the composable
 *        throws when a group has no name and no cssClass
 *      - `activeColumns` prop selects which group is currently exposed via computed refs
 *      - when `activeColumns` doesn't match any group, falls back to the first group
 *      - exposed computed refs: `name`, `cssClass`, `columns`, `active`, `builtColumns`,
 *        `activeColumnsDefinition`
 */
import { vi } from 'vitest';
import { nextTick, reactive } from 'vue';

import {
  createColumn,
  filterColumns,
  type ColumnDefinitionsList,
  type ResponsiveColumnDefinitions,
  useColumns,
} from './columns';
import type { GridProps } from './df-grid-types';

// Silence gridColumnCreate calls (they touch module-level state we don't need here)
vi.mock('./cell-renderers', () => ({ gridColumnCreate: vi.fn() }));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDefinitionsList = [
  { fieldName: 'title', label: 'Title', sortable: true },
  { fieldName: 'artist', label: 'Artist', sortable: true },
  { fieldName: 'year', label: 'Year', sortable: false },
  { fieldName: 'title', label: 'Title (alt)', sortable: false }, // duplicate fieldName
];

function makeGridProps(columns: ResponsiveColumnDefinitions, activeColumns?: string): GridProps {
  return { columns, records: [], keyField: 'id', activeColumns } as GridProps;
}

const GRID_ID = Symbol('test-grid');

// ---------------------------------------------------------------------------
// createColumn
// ---------------------------------------------------------------------------

describe('createColumn', () => {
  it('creates a ColumnDefinition with the supplied fieldName and label', () => {
    const col = createColumn('name', 'Full Name');

    expect(col.fieldName).toBe('name');
    expect(col.label).toBe('Full Name');
  });

  it('sets sortable to true by default', () => {
    const col = createColumn('name', 'Name');

    expect(col.sortable).toBe(true);
  });

  it('allows overriding sortable via otherOptions', () => {
    const col = createColumn('name', 'Name', undefined, { sortable: false });

    expect(col.sortable).toBe(false);
  });

  it('stores the renderer type on the returned object', () => {
    const col = createColumn('score', 'Score', 'int');

    expect(col.renderer).toBe('int');
  });

  it('merges otherOptions into the returned definition', () => {
    const col = createColumn('status', 'Status', 'checkbox', { cssClass: 'centered' });

    expect(col.cssClass).toBe('centered');
  });

  it('adds a default sortState to rendererOptions when renderer is "header"', () => {
    const col = createColumn('col', 'Col', 'header');

    expect((col.rendererOptions as any)?.sortState).toBeDefined();
    expect((col.rendererOptions as any)?.sortState.direction).toBeUndefined();
    expect((col.rendererOptions as any)?.sortState.sortable).toBe(true);
  });

  it('does not override an existing sortState when renderer is "header"', () => {
    const existingSortState = { direction: 'asc' as const, index: 1, sortable: true };
    const col = createColumn('col', 'Col', 'header', { rendererOptions: { sortState: existingSortState } });

    expect((col.rendererOptions as any)?.sortState).toBe(existingSortState);
  });

  it('does not add sortState for non-header renderers', () => {
    const col = createColumn('col', 'Col', 'plain');

    expect((col.rendererOptions as any)?.sortState).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// filterColumns
// ---------------------------------------------------------------------------

describe('filterColumns', () => {
  it('selects a column by numeric index', () => {
    const result = filterColumns(COLUMNS, [1]);

    expect(result).toHaveLength(1);
    expect(result[0].fieldName).toBe('artist');
  });

  it('selects a column by fieldName string (first match)', () => {
    const result = filterColumns(COLUMNS, ['year']);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Year');
  });

  it('selects the nth occurrence of a field via { fieldName: n } object', () => {
    // COLUMNS has two entries with fieldName 'title' at indices 0 and 3
    const first = filterColumns(COLUMNS, [{ title: 0 }]);
    const second = filterColumns(COLUMNS, [{ title: 1 }]);

    expect(first[0].label).toBe('Title');
    expect(second[0].label).toBe('Title (alt)');
  });

  it('supports mixing selector types in a single call', () => {
    const result = filterColumns(COLUMNS, [0, 'artist', { year: 0 }]);

    expect(result).toHaveLength(3);
    expect(result.map((c) => c.fieldName)).toEqual(['title', 'artist', 'year']);
  });

  it('silently drops numeric selectors that are out of bounds', () => {
    const result = filterColumns(COLUMNS, [999]);

    expect(result).toHaveLength(0);
  });

  it('silently drops string selectors that do not match any fieldName', () => {
    const result = filterColumns(COLUMNS, ['nonExistent']);

    expect(result).toHaveLength(0);
  });

  it('silently drops object selectors when the occurrence index is out of range', () => {
    const result = filterColumns(COLUMNS, [{ title: 99 }]);

    expect(result).toHaveLength(0);
  });

  it('returns columns in the order of the selectors, not the original array', () => {
    const result = filterColumns(COLUMNS, [2, 0]);

    expect(result[0].fieldName).toBe('year');
    expect(result[1].fieldName).toBe('title');
  });
});

// ---------------------------------------------------------------------------
// useColumns
// ---------------------------------------------------------------------------

describe('useColumns', () => {
  describe('flat (non-responsive) column list', () => {
    it('wraps flat columns in a single group named "default"', () => {
      const flatColumns = [
        { fieldName: 'title', label: 'Title' },
        { fieldName: 'year', label: 'Year' },
      ] as ColumnDefinitionsList;

      const { name, columns, builtColumns } = useColumns(makeGridProps(flatColumns), GRID_ID);

      expect(name.value).toBe('default');
      expect(builtColumns.value).toHaveLength(1);
      expect(columns.value).toHaveLength(2);
    });

    it('exposes cssClass as empty string for the default group', () => {
      const flatColumns = [{ fieldName: 'title', label: 'Title' }] as ColumnDefinitionsList;

      const { cssClass } = useColumns(makeGridProps(flatColumns), GRID_ID);

      expect(cssClass.value).toBe('');
    });

    it('exposes the correct active value (first group name)', () => {
      const flatColumns = [{ fieldName: 'title', label: 'Title' }] as ColumnDefinitionsList;

      const { active } = useColumns(makeGridProps(flatColumns), GRID_ID);

      expect(active.value).toBe('default');
    });
  });

  describe('responsive column definitions', () => {
    const responsiveColumns = [
      {
        name: 'mobile',
        cssClass: 'mobile',
        columns: [{ fieldName: 'title', label: 'Title' }],
      },
      {
        name: 'desktop',
        cssClass: 'desktop',
        columns: [
          { fieldName: 'title', label: 'Title' },
          { fieldName: 'artist', label: 'Artist' },
        ],
      },
    ] as any;

    it('creates one group per responsive definition entry', () => {
      const { builtColumns } = useColumns(makeGridProps(responsiveColumns), GRID_ID);

      expect(builtColumns.value).toHaveLength(2);
    });

    it('defaults to the first group when activeColumns prop is not set', () => {
      const { name } = useColumns(makeGridProps(responsiveColumns), GRID_ID);

      expect(name.value).toBe('mobile');
    });

    it('selects the correct group when activeColumns matches a group name', () => {
      const { name, columns } = useColumns(makeGridProps(responsiveColumns, 'desktop'), GRID_ID);

      expect(name.value).toBe('desktop');
      expect(columns.value).toHaveLength(2);
    });

    it('falls back to the first group when activeColumns does not match any group', () => {
      const { name } = useColumns(makeGridProps(responsiveColumns, 'tablet'), GRID_ID);

      expect(name.value).toBe('mobile');
    });

    it('reflects cssClass of the active group', () => {
      const { cssClass } = useColumns(makeGridProps(responsiveColumns, 'desktop'), GRID_ID);

      expect(cssClass.value).toBe('desktop');
    });

    it('falls back to cssClass as group name when no explicit name is given', () => {
      const noNameColumns = [{ cssClass: 'compact', columns: [{ fieldName: 'title', label: 'Title' }] }] as any;

      const { name } = useColumns(makeGridProps(noNameColumns), GRID_ID);

      expect(name.value).toBe('compact');
    });

    it('throws when a group has empty cssClass and no name', () => {
      // cssClass present (triggers responsive path) but empty string → no valid name
      const badColumns = [{ cssClass: '', columns: [{ fieldName: 'title', label: 'Title' }] }] as any;

      expect(() => {
        const { builtColumns } = useColumns(makeGridProps(badColumns), GRID_ID);
        return builtColumns.value;
      }).toThrow();
    });
  });

  describe('reactive prop changes', () => {
    it('switches the active group when activeColumns prop changes', async () => {
      const responsiveDefs = [
        { name: 'small', cssClass: 'small', columns: [{ fieldName: 'title', label: 'Title' }] },
        {
          name: 'large',
          cssClass: 'large',
          columns: [
            { fieldName: 'title', label: 'T' },
            { fieldName: 'year', label: 'Y' },
          ],
        },
      ] as any;

      const reactiveProps = reactive({
        columns: responsiveDefs,
        records: [],
        keyField: 'id',
        activeColumns: 'small',
      });

      const { name, columns } = useColumns(reactiveProps as GridProps, GRID_ID);
      expect(name.value).toBe('small');

      reactiveProps.activeColumns = 'large';
      await nextTick();

      expect(name.value).toBe('large');
      expect(columns.value).toHaveLength(2);
    });
  });
});
