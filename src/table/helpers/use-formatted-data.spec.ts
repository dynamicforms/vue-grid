/**
 * @file use-formatted-data.spec.ts
 *
 * Tests for the `useFormattedData` composable (use-formatted-data.ts).
 *
 * `useFormattedData` maps a single row object through the configured cell renderers and
 * produces an array of `RenderableValue` instances — one per column — ready for the grid's
 * card component to render.
 *
 * What this file tests
 * --------------------
 * 1. **One output per column** — `formattedData` length always equals the column count.
 *
 * 2. **Renderer selection** — for each column the composable picks the renderer named by
 *    `column.renderer` (or `'plain'` when `renderer` is absent).
 *
 * 3. **nullHandler** — when the cell value is `null` or `undefined` and the column's
 *    `rendererOptions.nullHandler` names a different renderer, that alternative renderer is
 *    used instead of the primary one.
 *
 * 4. **CSS class injection** — every output RenderableValue has its `classes` array set to
 *    `[column.fieldName, column.cssClass ?? '', ...rendererClasses]`.  This guarantees
 *    column-specific class targeting even if the renderer itself returns no classes.
 *
 * 5. **addRowResetItem flag** — when `true`, a sentinel `<span>` tagged with the
 *    `'df-grid-card-break-item'` CSS class is appended as the last element.  When `false`
 *    (or omitted), no sentinel is added.
 *
 * 6. **Reactivity** — `formattedData` is a computed ref that re-evaluates when `item`,
 *    `columns`, or `renderers` props change.
 *
 * Implementation notes
 * --------------------
 * Tests use `DefaultRenderers` for realistic coverage.  Because `wrapWithPrePost` (called
 * by every renderer) reads `options.preRender`, `rendererOptions` must be at least `{}`
 * rather than `undefined`.  In production, `makeColumnRenderOptsInternal` always populates
 * this; in tests we supply the minimal empty object manually.
 */
import { RenderableValue } from '@dynamicforms/vue-forms';
import { reactive } from 'vue';

import {
  DefaultRenderers,
  type RendererOptionsMap,
  type RenderersMap,
  type RowValue,
} from '../cell-renderers';
import type { ColumnDefinition } from '../columns';

import { useFormattedData } from './use-formatted-data';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const renderers: RenderersMap = { ...DefaultRenderers };

const mockItem: RowValue = {
  name: 'Alice',
  active: true,
  score: null,
  url: 'https://example.com',
};

/**
 * Columns used in the majority of tests.
 * Each column carries `rendererOptions: {}` so that `wrapWithPrePost` inside the renderers
 * does not crash when accessing `options.preRender` (which is undefined but not unreadable).
 */
const mockColumns: ColumnDefinition<keyof RendererOptionsMap>[] = [
  { fieldName: 'name', label: 'Name', rendererOptions: {} as any },
  { fieldName: 'active', label: 'Active', renderer: 'checkbox', rendererOptions: {} as any },
  { fieldName: 'url', label: 'URL', renderer: 'link', rendererOptions: {} as any },
  {
    fieldName: 'score',
    label: 'Score',
    rendererOptions: { nullHandler: 'null-null' } as any,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFormattedData', () => {
  // -------------------------------------------------------------------------
  describe('output count and structure', () => {
    it('produces one RenderableValue per column', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: mockColumns,
        renderers,
      });

      expect(formattedData.value).toHaveLength(mockColumns.length);
    });

    it('every output item is a RenderableValue instance', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: mockColumns,
        renderers,
      });

      formattedData.value.forEach((rv) => {
        expect(rv).toBeInstanceOf(RenderableValue);
      });
    });

    it('returns an empty array when columns list is empty', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: [],
        renderers,
      });

      expect(formattedData.value).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('renderer selection', () => {
    it('uses the "plain" renderer when column has no explicit renderer', () => {
      const plainSpy = vi.fn(renderers.plain);
      const spyRenderers = { ...renderers, plain: plainSpy };

      const { formattedData } = useFormattedData({
        item: { name: 'Bob' },
        columns: [{ fieldName: 'name', label: 'Name', rendererOptions: {} as any }],
        renderers: spyRenderers,
      });
      expect(formattedData.value).toHaveLength(1);

      expect(plainSpy).toHaveBeenCalledWith('Bob', { name: 'Bob' }, expect.anything());
    });

    it('uses the renderer named by column.renderer when specified', () => {
      const checkboxSpy = vi.fn(renderers.checkbox);
      const spyRenderers = { ...renderers, checkbox: checkboxSpy };

      const { formattedData } = useFormattedData({
        item: { active: true },
        columns: [{ fieldName: 'active', label: 'Active', renderer: 'checkbox', rendererOptions: {} as any }],
        renderers: spyRenderers,
      });
      expect(formattedData.value).toHaveLength(1);

      expect(checkboxSpy).toHaveBeenCalledWith(true, { active: true }, expect.anything());
    });

    it('passes the full row object as the second argument to the renderer', () => {
      const row: RowValue = { id: 1, name: 'Carol', age: 30 };
      const plainSpy = vi.fn(renderers.plain);

      const { formattedData } = useFormattedData({
        item: row,
        columns: [{ fieldName: 'name', label: 'Name', rendererOptions: {} as any }],
        renderers: { ...renderers, plain: plainSpy },
      });
      expect(formattedData.value).toHaveLength(1);

      expect(plainSpy).toHaveBeenCalledWith('Carol', row, expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  describe('nullHandler', () => {
    it('uses the nullHandler renderer when the cell value is null', () => {
      const nullNullSpy = vi.fn(renderers['null-null']);
      const spyRenderers = { ...renderers, 'null-null': nullNullSpy };

      const { formattedData } = useFormattedData({
        item: { score: null },
        columns: [{
          fieldName: 'score',
          label: 'Score',
          rendererOptions: { nullHandler: 'null-null' } as any,
        }],
        renderers: spyRenderers,
      });
      expect(formattedData.value).toHaveLength(1);

      expect(nullNullSpy).toHaveBeenCalled();
    });

    it('uses the primary renderer when the cell value is NOT null (ignores nullHandler)', () => {
      const plainSpy = vi.fn(renderers.plain);
      const nullNullSpy = vi.fn(renderers['null-null']);

      const { formattedData } = useFormattedData({
        item: { score: 42 },
        columns: [{
          fieldName: 'score',
          label: 'Score',
          rendererOptions: { nullHandler: 'null-null' } as any,
        }],
        renderers: { ...renderers, plain: plainSpy, 'null-null': nullNullSpy },
      });
      expect(formattedData.value).toHaveLength(1);

      expect(plainSpy).toHaveBeenCalled();
      expect(nullNullSpy).not.toHaveBeenCalled();
    });

    it('calls the primary renderer for null when no nullHandler is configured', () => {
      const plainSpy = vi.fn(renderers.plain);

      const { formattedData } = useFormattedData({
        item: { name: null },
        columns: [{ fieldName: 'name', label: 'Name', rendererOptions: {} as any }],
        renderers: { ...renderers, plain: plainSpy },
      });
      expect(formattedData.value).toHaveLength(1);

      expect(plainSpy).toHaveBeenCalledWith(null, { name: null }, expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  describe('CSS class injection', () => {
    it('sets fieldName as the first class on every output item', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: mockColumns,
        renderers,
      });

      formattedData.value.forEach((rv, i) => {
        // useFormattedData always rewrites `classes` into an array (fieldName, cssClass, ...extra).
        expect((rv.classes as string[])[0]).toBe(mockColumns[i].fieldName);
      });
    });

    it('includes column.cssClass as the second class when present', () => {
      const { formattedData } = useFormattedData({
        item: { name: 'Dave' },
        columns: [{ fieldName: 'name', label: 'Name', cssClass: 'text-right', rendererOptions: {} as any }],
        renderers,
      });

      expect((formattedData.value[0].classes as string[])[1]).toBe('text-right');
    });

    it('uses an empty string as cssClass when column.cssClass is absent', () => {
      const { formattedData } = useFormattedData({
        item: { name: 'Eve' },
        columns: [{ fieldName: 'name', label: 'Name', rendererOptions: {} as any }],
        renderers,
      });

      expect((formattedData.value[0].classes as string[])[1]).toBe('');
    });

    it('wraps a single string renderer class into an array', () => {
      const singleClassRenderer = (): RenderableValue => new RenderableValue({} as any, 'my-single-class');

      const { formattedData } = useFormattedData({
        item: { value: 'test' },
        columns: [{ fieldName: 'value', label: 'Value', renderer: 'singleClass' as any, rendererOptions: {} as any }],
        renderers: { ...renderers, singleClass: singleClassRenderer } as any,
      });

      const classes = formattedData.value[0].classes as string[];
      expect(Array.isArray(classes)).toBe(true);
      expect(classes).toContain('my-single-class');
      expect(classes).toContain('value');
    });
  });

  // -------------------------------------------------------------------------
  describe('addRowResetItem', () => {
    it('appends a sentinel break item when addRowResetItem is true', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: mockColumns,
        renderers,
        addRowResetItem: true,
      });

      expect(formattedData.value).toHaveLength(mockColumns.length + 1);
      const last = formattedData.value[formattedData.value.length - 1];
      expect(last).toBeInstanceOf(RenderableValue);
      expect(last.classes).toBe('df-grid-card-break-item');
    });

    it('does not append a sentinel when addRowResetItem is false', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: mockColumns,
        renderers,
        addRowResetItem: false,
      });

      expect(formattedData.value).toHaveLength(mockColumns.length);
    });

    it('does not append a sentinel when addRowResetItem is omitted', () => {
      const { formattedData } = useFormattedData({
        item: mockItem,
        columns: mockColumns,
        renderers,
      });

      expect(formattedData.value).toHaveLength(mockColumns.length);
    });
  });

  // -------------------------------------------------------------------------
  describe('reactivity', () => {
    it('re-computes when item changes', () => {
      const plainSpy = vi.fn(renderers.plain);
      const cols: ColumnDefinition<keyof RendererOptionsMap>[] = [
        { fieldName: 'name', label: 'Name', rendererOptions: {} as any },
      ];

      const propsRef = reactive({
        item: { name: 'Frank' } as RowValue,
        columns: cols,
        renderers: { ...renderers, plain: plainSpy },
      });

      const { formattedData } = useFormattedData(propsRef);

      expect(formattedData.value).toHaveLength(1); // seed computation
      const callsBefore = plainSpy.mock.calls.length;

      propsRef.item = { name: 'Grace' };
      expect(formattedData.value).toHaveLength(1); // trigger re-compute

      expect(plainSpy.mock.calls.length).toBeGreaterThan(callsBefore);
      expect(plainSpy).toHaveBeenLastCalledWith('Grace', { name: 'Grace' }, expect.anything());
    });
  });
});
