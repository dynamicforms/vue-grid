/**
 * @file selection.spec.ts
 *
 * Tests for the `useSelection` composable (selection.ts).
 *
 * `useSelection` manages which rows in a df-grid are currently selected.  It supports four
 * modes and is designed to work in both controlled (externally prop-driven) and uncontrolled
 * (internally managed) configurations.
 *
 * What this file tests
 * --------------------
 * 1. **isSelected** — correct truth value for every selection mode:
 *      - `null`        → always false (nothing is selected)
 *      - `'selection'` → true only for keys that ARE in the `selectionKeys` set
 *      - `'exclusion'` → true only for keys that are NOT in the `selectionKeys` set
 *      - `'non-select'`→ always false (selection mechanism disabled)
 *
 * 2. **toggleKey** — toggling a key in and out of the selection set:
 *      - adds a key that was absent, removes one that was present
 *      - emits `update:selectionKeys` with the correct `action` ('add' | 'remove')
 *
 * 3. **startSelection** — entering selection mode:
 *      - sets `selectionMode` to `'selection'`
 *      - emits `update:selectionMode`
 *      - optionally adds a first key (when `key` argument is supplied)
 *
 * 4. **clearSelection** — resetting the selection:
 *      - resets mode to `null` and empties the key set
 *      - emits both `update:selectionMode` (null) and `update:selectionKeys` ('clear')
 *
 * 5. **invertMode** — swapping inclusion ↔ exclusion semantics:
 *      - `'selection'` → `'exclusion'`, `'exclusion'` → `'selection'`
 *      - emits `update:selectionMode` with the new mode
 *
 * 6. **Controlled (external props) mode** — when `selectionMode` / `selectionKeys` are
 *    provided as reactive props, the composable mirrors their values and reacts to changes.
 */
import { vi } from 'vitest';
import { nextTick, reactive } from 'vue';

import type { GridProps } from './df-grid-types';
import { type SelectionMode, useSelection } from './selection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal GridProps object for tests that don't need specific columns/records. */
function makeProps(overrides: Partial<GridProps> = {}): GridProps {
  return {
    columns: [],
    records: [],
    keyField: 'id',
    ...overrides,
  } as GridProps;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSelection', () => {
  let mockEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockEmit = vi.fn();
  });

  // -------------------------------------------------------------------------
  describe('isSelected', () => {
    it('returns false for any key when mode is null (nothing selected)', () => {
      const { isSelected } = useSelection(makeProps(), mockEmit);

      expect(isSelected('any')).toBe(false);
      expect(isSelected(0)).toBe(false);
      expect(isSelected(null)).toBe(false);
    });

    it('returns true only for keys present in the set when mode is "selection"', () => {
      const props = makeProps({ selectionMode: 'selection', selectionKeys: new Set([1, 3]) });
      const { isSelected } = useSelection(props, mockEmit);

      expect(isSelected(1)).toBe(true);
      expect(isSelected(2)).toBe(false);
      expect(isSelected(3)).toBe(true);
    });

    it('returns false for keys in the set when mode is "exclusion" (they are excluded)', () => {
      const props = makeProps({ selectionMode: 'exclusion', selectionKeys: new Set([2]) });
      const { isSelected } = useSelection(props, mockEmit);

      expect(isSelected(1)).toBe(true); // not in exclusion set → selected
      expect(isSelected(2)).toBe(false); // in exclusion set → NOT selected
      expect(isSelected(3)).toBe(true); // not in exclusion set → selected
    });

    it('returns false for any key when mode is "non-select" (mechanism disabled)', () => {
      const props = makeProps({ selectionMode: 'non-select' });
      const { isSelected } = useSelection(props, mockEmit);

      expect(isSelected(1)).toBe(false);
      expect(isSelected('foo')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('toggleKey', () => {
    it('adds a key that is not yet in the selection set', () => {
      const { toggleKey, selectionKeys } = useSelection(makeProps(), mockEmit);

      toggleKey('key1');

      expect(selectionKeys.value.has('key1')).toBe(true);
    });

    it('removes a key that is already in the selection set', () => {
      const { toggleKey, selectionKeys } = useSelection(makeProps(), mockEmit);

      toggleKey('key1'); // add
      toggleKey('key1'); // remove

      expect(selectionKeys.value.has('key1')).toBe(false);
    });

    it('emits update:selectionKeys with action "add" when key is new', () => {
      const { toggleKey } = useSelection(makeProps(), mockEmit);

      toggleKey(42);

      expect(mockEmit).toHaveBeenCalledWith('update:selectionKeys', expect.any(Set), 'add', 42);
    });

    it('emits update:selectionKeys with action "remove" when key was present', () => {
      // Pre-populate via prop so key is already in the set
      const props = makeProps({ selectionKeys: new Set(['key1']) });
      const { toggleKey } = useSelection(props, mockEmit);

      toggleKey('key1');

      expect(mockEmit).toHaveBeenCalledWith(
        'update:selectionKeys',
        expect.any(Set),
        'remove',
        'key1',
      );
    });

    it('the emitted Set contains the key after add and lacks it after remove', () => {
      const { toggleKey } = useSelection(makeProps(), mockEmit);

      toggleKey(99);
      const afterAdd = (mockEmit.mock.calls[0][1] as Set<any>);
      expect(afterAdd.has(99)).toBe(true);

      mockEmit.mockClear();
      toggleKey(99);
      const afterRemove = (mockEmit.mock.calls[0][1] as Set<any>);
      expect(afterRemove.has(99)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('startSelection', () => {
    it('switches selectionMode to "selection"', () => {
      const { startSelection, selectionMode } = useSelection(makeProps(), mockEmit);

      startSelection();

      expect(selectionMode.value).toBe('selection');
    });

    it('emits update:selectionMode with "selection"', () => {
      const { startSelection } = useSelection(makeProps(), mockEmit);

      startSelection();

      expect(mockEmit).toHaveBeenCalledWith('update:selectionMode', 'selection');
    });

    it('adds the supplied key to the selection set', () => {
      const { startSelection, selectionKeys } = useSelection(makeProps(), mockEmit);

      startSelection('first-row');

      expect(selectionKeys.value.has('first-row')).toBe(true);
    });

    it('does not alter the key set when called without a key argument', () => {
      const { startSelection, selectionKeys } = useSelection(makeProps(), mockEmit);

      startSelection();

      expect(selectionKeys.value.size).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('clearSelection', () => {
    it('resets selectionMode to null', () => {
      const { startSelection, clearSelection, selectionMode } = useSelection(makeProps(), mockEmit);
      startSelection();

      clearSelection();

      expect(selectionMode.value).toBe(null);
    });

    it('removes all keys from the selection set', () => {
      const { toggleKey, clearSelection, selectionKeys } = useSelection(makeProps(), mockEmit);
      toggleKey(1);
      toggleKey(2);

      clearSelection();

      expect(selectionKeys.value.size).toBe(0);
    });

    it('emits update:selectionMode with null', () => {
      const { clearSelection } = useSelection(makeProps(), mockEmit);

      clearSelection();

      expect(mockEmit).toHaveBeenCalledWith('update:selectionMode', null);
    });

    it('emits update:selectionKeys with an empty set and action "clear"', () => {
      const { clearSelection } = useSelection(makeProps(), mockEmit);

      clearSelection();

      const keysCall = mockEmit.mock.calls.find(([event]) => event === 'update:selectionKeys');
      expect(keysCall).toBeDefined();
      expect(keysCall![1]).toBeInstanceOf(Set);
      expect((keysCall![1] as Set<any>).size).toBe(0);
      expect(keysCall![2]).toBe('clear');
    });
  });

  // -------------------------------------------------------------------------
  describe('invertMode', () => {
    it('switches mode from "selection" to "exclusion"', () => {
      const { startSelection, invertMode, selectionMode } = useSelection(makeProps(), mockEmit);
      startSelection();

      invertMode();

      expect(selectionMode.value).toBe('exclusion');
    });

    it('switches mode from "exclusion" back to "selection"', () => {
      const { startSelection, invertMode, selectionMode } = useSelection(makeProps(), mockEmit);
      startSelection();
      invertMode(); // → exclusion

      invertMode(); // → selection again

      expect(selectionMode.value).toBe('selection');
    });

    it('emits update:selectionMode with the new mode', () => {
      const { startSelection, invertMode } = useSelection(makeProps(), mockEmit);
      startSelection();
      mockEmit.mockClear();

      invertMode();

      expect(mockEmit).toHaveBeenCalledWith('update:selectionMode', 'exclusion');
    });

    it('preserves the selectionKeys set while inverting', () => {
      const { startSelection, toggleKey, invertMode, selectionKeys } = useSelection(
        makeProps(),
        mockEmit,
      );
      startSelection('key1');
      toggleKey('key2');

      invertMode();

      // Keys themselves don't change — only their meaning (selected ↔ excluded) flips
      expect(selectionKeys.value.has('key1')).toBe(true);
      expect(selectionKeys.value.has('key2')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('controlled (external props) mode', () => {
    it('exposes selectionMode from props instead of internal state', () => {
      const props = makeProps({ selectionMode: 'exclusion' });
      const { selectionMode } = useSelection(props, mockEmit);

      expect(selectionMode.value).toBe('exclusion');
    });

    it('exposes selectionKeys from props instead of internal state', () => {
      const externalKeys = new Set(['a', 'b']);
      const props = makeProps({ selectionKeys: externalKeys });
      const { selectionKeys } = useSelection(props, mockEmit);

      expect(selectionKeys.value).toBe(externalKeys);
    });

    it('reacts to changes in selectionMode prop', async () => {
      const reactiveProps = reactive({
        columns: [],
        records: [],
        keyField: 'id',
        selectionMode: null as SelectionMode,
        selectionKeys: new Set<any>(),
      });

      const { selectionMode } = useSelection(reactiveProps as GridProps, mockEmit);
      expect(selectionMode.value).toBe(null);

      reactiveProps.selectionMode = 'selection';
      await nextTick();

      expect(selectionMode.value).toBe('selection');
    });

    it('reacts to changes in selectionKeys prop', async () => {
      const reactiveProps = reactive({
        columns: [],
        records: [],
        keyField: 'id',
        selectionMode: 'selection' as SelectionMode,
        selectionKeys: new Set<any>(),
      });

      const { selectionKeys } = useSelection(reactiveProps as GridProps, mockEmit);
      expect(selectionKeys.value.size).toBe(0);

      const newKeys = new Set([10, 20]);
      reactiveProps.selectionKeys = newKeys;
      await nextTick();

      expect(selectionKeys.value).toStrictEqual(newKeys);
    });

    it('isSelected reflects external key set in selection mode', () => {
      const props = makeProps({ selectionMode: 'selection', selectionKeys: new Set([7, 8]) });
      const { isSelected } = useSelection(props, mockEmit);

      expect(isSelected(7)).toBe(true);
      expect(isSelected(9)).toBe(false);
    });
  });
});
