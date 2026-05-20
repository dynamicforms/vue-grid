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

  watch(() => props.selectionMode, (newVal) => { internalSelectionMode.value = newVal ?? null; });
  watch(() => props.selectionKeys, (newVal) => { internalSelectionKeys.value = newVal ?? new Set(); });

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
