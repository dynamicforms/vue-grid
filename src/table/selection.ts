/**
 * @file selection.ts
 *
 * Manages row selection state for the df-grid component.
 *
 * Supports four selection modes:
 *  - `null`          — selection inactive; regular click behaviour applies
 *  - `'selection'`   — explicit inclusion: `selectionKeys` holds the selected row keys
 *  - `'exclusion'`   — implicit inclusion: `selectionKeys` holds the *excluded* row keys,
 *                      so every row not in the set is considered selected
 *  - `'non-select'`  — selection mechanism entirely disabled (no rows can be selected)
 *
 * The composable supports both controlled (prop-driven) and uncontrolled (internal) modes.
 * In controlled mode, pass `selectionMode` and `selectionKeys` as reactive props; the
 * composable mirrors them and re-emits whenever the internal state would change.
 * In uncontrolled mode, state is managed internally and exposed through the returned refs.
 */
import { computed, EmitFn, ref, watch } from 'vue';

import type { GridEmits, GridProps } from './df-grid-types';

export type SelectionMode = null | 'selection' | 'exclusion' | 'non-select';

export interface SelectionProps {
  selectionMode?: SelectionMode;
  selectionKeys?: Set<any>;
}

export type SelectionAction = 'add' | 'remove' | 'clear';

export interface SelectionEmits {
  'update:selectionMode': [mode: SelectionMode];
  'update:selectionKeys': [keys: Set<any>, action: SelectionAction, key?: any];
}

export function useSelection(props: GridProps, emit: EmitFn<GridEmits>) {
  const internalSelectionMode = ref<SelectionMode>(props.selectionMode ?? null);
  const internalSelectionKeys = ref<Set<any>>(props.selectionKeys ?? new Set());

  const selectionMode = computed<SelectionMode>(() => props.selectionMode ?? internalSelectionMode.value);
  const selectionKeys = computed<Set<any>>(() => props.selectionKeys ?? internalSelectionKeys.value);

  watch(
    () => props.selectionMode,
    (newVal) => {
      internalSelectionMode.value = newVal ?? null;
    },
  );
  watch(
    () => props.selectionKeys,
    (newVal) => {
      internalSelectionKeys.value = newVal ?? new Set();
    },
  );

  function isSelected(key: any): boolean {
    const mode = selectionMode.value;
    if (mode === 'selection') return selectionKeys.value.has(key);
    if (mode === 'exclusion') return !selectionKeys.value.has(key);
    return false;
  }

  function toggleKey(key: any): void {
    const keys = new Set(selectionKeys.value);
    const action: SelectionAction = keys.has(key) ? 'remove' : 'add';
    if (action === 'remove') keys.delete(key);
    else keys.add(key);
    internalSelectionKeys.value = keys;
    emit('update:selectionKeys', keys, action, key);
  }

  function startSelection(key?: any): void {
    internalSelectionMode.value = 'selection';
    emit('update:selectionMode', 'selection');
    if (key !== undefined) toggleKey(key);
  }

  function clearSelection(): void {
    const emptyKeys = new Set<any>();
    internalSelectionMode.value = null;
    internalSelectionKeys.value = emptyKeys;
    emit('update:selectionMode', null);
    emit('update:selectionKeys', emptyKeys, 'clear');
  }

  function invertMode(): void {
    const newMode: SelectionMode = internalSelectionMode.value === 'selection' ? 'exclusion' : 'selection';
    internalSelectionMode.value = newMode;
    emit('update:selectionMode', newMode);
  }

  return { selectionMode, selectionKeys, isSelected, toggleKey, startSelection, clearSelection, invertMode };
}
