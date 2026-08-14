/**
 * @file header-renderers.spec.ts
 *
 * Tests for the `header` cell renderer (header-renderers.ts) — the renderer every column
 * header cell is rendered with.
 *
 * It builds a three-part cell: an optional leading icon, the column label, and a trailing
 * sorting indicator, wrapped in a `PreContentPost` component. Two details of that structure
 * are load-bearing elsewhere:
 *
 *  - the `has-pre-post` class, which df-grid.vue styles as a flex row (`.df-grid.cell.has-pre-post`),
 *    so that the indicator stays pinned next to the label;
 *  - the sort state, which is spread into the indicator's props — this is how a header cell
 *    knows to draw an arrow and, in a multi-column sort, its ordinal.
 *
 * The pointer handlers are delegated to `useGridMouseEventsPosition`, so that module is mocked
 * and the delegation asserted rather than its (separately tested) effect on the drag state.
 */
import { MdString, RenderableValue } from '@dynamicforms/vue-forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ColumnSortState } from '../columns-sorting';

import { header, HeaderOptions } from './header-renderers';
import type { CellOptionsInternal } from './interfaces';

// `header-renderers.ts` destructures `processPosition` at module load, so the mock has to be
// in place before the import above is evaluated — vi.mock is hoisted, which is what makes it work.
const { processPosition } = vi.hoisted(() => ({ processPosition: vi.fn() }));

vi.mock('../df-grid-mouse-events', () => ({ useGridMouseEventsPosition: () => ({ processPosition }) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sortState = (overrides: Partial<ColumnSortState> = {}): ColumnSortState => ({
  sortable: true,
  direction: undefined,
  index: undefined,
  ...overrides,
});

function makeOptions(overrides: Partial<HeaderOptions> = {}): CellOptionsInternal<HeaderOptions> {
  return { nullHandler: 'null-null', sortState: sortState(), ...overrides } as CellOptionsInternal<HeaderOptions>;
}

/** The props the renderer handed to PreContentPost. */
const partsOf = (rv: RenderableValue) => rv.componentBindings;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('header renderer', () => {
  beforeEach(() => processPosition.mockClear());

  describe('cell structure', () => {
    it('renders through PreContentPost', () => {
      const result = header('Artist', {}, makeOptions());

      expect(result).toBeInstanceOf(RenderableValue);
      expect(result.componentName).toBe('PreContentPost');
    });

    it('marks the cell as has-pre-post so the grid lays it out as a flex row', () => {
      expect(header('Artist', {}, makeOptions()).classes).toContain('has-pre-post');
    });

    it('puts the column label in the content slot', () => {
      const { content } = partsOf(header('Artist', {}, makeOptions()));

      expect(content.getTextType).toBe('string');
      expect(content.resolvedText).toBe('Artist');
    });

    it('keeps a markdown label markdown', () => {
      const { content } = partsOf(header(new MdString('**Artist**'), {}, makeOptions()));

      expect(content.getTextType).toBe('md');
    });

    it('names the content slot class, so the label is the part that flexes', () => {
      expect(partsOf(header('Artist', {}, makeOptions())).contentClass).toBe('content');
    });
  });

  describe('leading icon', () => {
    it('renders no pre part when the column has no icon', () => {
      expect(partsOf(header('Artist', {}, makeOptions())).pre).toBeNull();
    });

    it('renders the named icon when the column has one', () => {
      const { pre } = partsOf(header('Artist', {}, makeOptions({ icon: 'mdi-account' })));

      expect(pre.componentName).toBe('CachedIcon');
      expect(pre.componentBindings).toMatchObject({ name: 'mdi-account', class: 'df-header-icon' });
    });
  });

  describe('sorting indicator', () => {
    it('always renders one, so unsorted sortable columns can still hint at being sortable', () => {
      const { post } = partsOf(header('Artist', {}, makeOptions()));

      expect(post.componentName).toBe('SortingIndicator');
    });

    it('passes the column sort state through to the indicator', () => {
      const state = sortState({ direction: 'asc' as any, index: 2 });
      const { post } = partsOf(header('Artist', {}, makeOptions({ sortState: state })));

      expect(post.componentBindings).toMatchObject({ sortable: true, direction: 'asc', index: 2 });
    });

    it('passes a non-sortable state through unchanged', () => {
      const { post } = partsOf(header('Artist', {}, makeOptions({ sortState: sortState({ sortable: false }) })));

      expect(post.componentBindings).toMatchObject({ sortable: false });
    });
  });

  describe('pointer handlers', () => {
    it('reports the pointer entering the cell', () => {
      // JSDOM has no PointerEvent constructor; the handlers only ever pass the event on.
      const event = new MouseEvent('pointerenter') as PointerEvent;

      partsOf(header('Artist', {}, makeOptions())).onPointerenter(event);

      expect(processPosition).toHaveBeenCalledWith('enter', event);
    });

    it('reports the pointer leaving the cell', () => {
      const event = new MouseEvent('pointerleave') as PointerEvent;

      partsOf(header('Artist', {}, makeOptions())).onPointerleave(event);

      expect(processPosition).toHaveBeenCalledWith('leave', event);
    });
  });
});
