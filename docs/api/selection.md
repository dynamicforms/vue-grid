# Selection

The grid supports row selection out of the box. Selection is activated by the user through gestures and managed either internally (uncontrolled) or externally via `v-model` bindings (controlled).

## Selection modes

```typescript
type SelectionMode = null | 'selection' | 'exclusion' | 'non-select';
```

| Mode | Meaning |
|------|---------|
| `null` | Selection is inactive. Normal click events fire as usual. |
| `'selection'` | The set of selected rows is **opt-in**: only rows whose key is in `selectionKeys` are selected. |
| `'exclusion'` | The set of selected rows is **opt-out**: all rows are considered selected *except* those whose key is in `selectionKeys`. |
| `'non-select'` | Selection cannot be activated by mouse or touch gestures. The programmer can still switch to another mode programmatically (e.g. via `v-model:selectionMode`). Normal click events fire as usual. |

The distinction matters when you have a very large dataset and the user wants to select "everything except a few items" — exclusion mode lets you store only the exceptions.

`'non-select'` is useful when you want to disable user-initiated selection (e.g. while a batch operation is in progress), or when selection should only be triggered by explicit application logic rather than user gestures.

## Activating selection

Users activate selection mode without any prop wiring:

| Gesture | Effect |
|---------|--------|
| **Long-press** on a data row | Enters `'selection'` mode and toggles the pressed row |
| **Shift+click** on a data row | Same as long-press — enters `'selection'` mode and toggles the row |
| **Click** while selection is active | Toggles the clicked row without changing mode |

Once active, a status bar appears at the bottom of the header area with:

- **✕** (`mdi-close`) — cancels selection mode and clears all selected keys
- **N items selected / excluded** — live count of keys in `selectionKeys`
- **⇄** (`mdi-shuffle`, "Invert selection") — switches between `'selection'` and `'exclusion'` mode while keeping the same key set
- **`#groupActions` slot** (right-aligned) — populate with your own action buttons (delete, export, etc.)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectionMode` | `SelectionMode` | `null` | Active selection mode. Use with `v-model:selectionMode` for controlled selection. When omitted the grid manages mode internally. |
| `selectionKeys` | `Set<any>` | — | Set of selected (or excluded) row keys. Use with `v-model:selectionKeys` for controlled selection. When omitted the grid manages the key set internally. |

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `update:selectionMode` | `SelectionMode` | Fired when selection mode changes. Use with `v-model:selectionMode`. |
| `update:selectionKeys` | `Set<any>, SelectionAction, key?` | Fired when the key set changes. `action` is `'add'`, `'remove'`, or `'clear'`; `key` is the affected key (absent for `'clear'`). |

```typescript
type SelectionAction = 'add' | 'remove' | 'clear';
```

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `groupActions` | — | Rendered on the right side of the selection status bar. Only visible while selection mode is active. Use it for batch actions (delete selected, export, …). |

## Uncontrolled mode (internal state)

When neither `selectionMode` nor `selectionKeys` props are passed, the grid manages everything itself:

```vue
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
>
  <template #groupActions>
    <button @click="deleteSelected">Delete</button>
  </template>
</df-grid>
```

The `update:selectionMode` and `update:selectionKeys` events still fire, so you can react to changes without taking control of the state.

## Controlled mode (external state)

Bind both props with `v-model` to fully control selection from outside:

```vue
<df-grid
  v-model:selection-mode="selectionMode"
  v-model:selection-keys="selectedKeys"
  :columns="columns"
  :records="records"
  key-field="id"
>
  <template #groupActions>
    <button @click="exportSelected">Export {{ selectedKeys.size }} items</button>
  </template>
</df-grid>
```

```typescript
const selectionMode = ref<SelectionMode>(null);
const selectedKeys = ref<Set<any>>(new Set());
```

::: tip
You can bind only `selectionMode` and leave `selectionKeys` unbound — the grid will still manage the key set internally while you observe or control the mode externally.
:::

## Reading the selection

In controlled mode, read `selectedKeys` directly. In uncontrolled mode, listen to `update:selectionKeys`:

```vue
<df-grid
  :columns="columns"
  :records="records"
  key-field="id"
  @update:selection-keys="(keys, action, key) => console.log(action, key, [...keys])"
/>
```

### Interpreting the key set

```typescript
// Which records are currently "selected"?
function isSelected(record: RowValue): boolean {
  if (selectionMode.value === 'selection') return selectedKeys.value.has(record.id);
  if (selectionMode.value === 'exclusion') return !selectedKeys.value.has(record.id);
  return false;
}

// All selected records (selection mode only — for exclusion mode filter the full list)
const selectedRecords = computed(() =>
  records.filter(r => selectedKeys.value.has(r.id))
);
```

## CSS classes

The grid exposes CSS classes on the container and on each row card so you can style selection state purely in CSS without any JavaScript logic.

### Container classes

| Class | When applied |
|-------|-------------|
| `selection` | Whenever selection mode is active (`'selection'` or `'exclusion'`) |
| `exclusion` | Additionally when mode is `'exclusion'` (always alongside `selection`) |

### Row card classes

These classes are added to each row card **only while selection mode is active**:

| Class | When applied |
|-------|-------------|
| `selected` | Row is currently selected |
| `unselected` | Row is currently not selected |

```css
/* highlight selected rows */
.df-grid.container.selection .df-grid.card.selected {
  outline: 2px solid blue;
}

/* dim unselected rows */
.df-grid.container.selection .df-grid.card.unselected {
  opacity: 0.5;
}

/* different style in exclusion mode */
.df-grid.container.exclusion .df-grid.card.selected {
  outline-color: orange;
}
```

The default `rowClass` prop already adds `even` and `odd` alternating row classes regardless of selection state.

## Click events and selection

When selection mode is active, clicking a row **toggles** the row instead of emitting the normal `click` event. The `click` event is only emitted for data rows when `selectionMode` is `null`.

Shift+click activates selection mode if it is not yet active; if it is already active it simply toggles the row — identical to a regular click.

Header row clicks always emit `click` regardless of selection mode.
