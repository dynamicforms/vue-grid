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
| **Shift+click** on a data row | Enters `'selection'` mode and toggles the pressed row; while a mode is already active it toggles the row without changing the mode |
| **Long-press** on a data row | Enters `'selection'` mode. The long-press fires while the button is still held, and the `click` produced when it is released toggles the row a second time, so the row ends up in the state it was in before the gesture |
| **Click** while selection is active | Toggles the clicked row without changing mode |

In `'non-select'` mode neither gesture changes the selection.

Long-press relies on the `v-longpress` directive, which the grid does not register itself — it comes with the plugin: `app.use(DynamicFormsVueGrid, { registerComponents: true })`. When `<DfGrid>` is imported and registered locally instead, the directive is missing and long-press does nothing; shift+click remains the way to enter selection mode.

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
| `update:selectionKeys` | `Set<any>, 'add' \| 'remove' \| 'clear', key?` | Fired when the key set changes. `action` is `'add'`, `'remove'`, or `'clear'`; `key` is the affected key (absent for `'clear'`). |

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

Both props shadow the grid's internal state: `selectionKeys` is a `Set`, so once it is bound the grid always shows the bound set and gestures change nothing on screen until the parent assigns the set carried by `update:selectionKeys`; `selectionMode` shadows the internal mode as soon as it is anything other than `null`. Use `v-model` on both, or handle the events and assign the values yourself — a one-way `:selection-keys` binding freezes the selection.

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

An explicit selection checkbox, as its own column rather than a row-card style change, is also possible — combining
`postRender` with the CSS classes above. See [A dedicated selection checkbox column](/guide/cookbook#a-dedicated-selection-checkbox-column)
in the Cookbook for the full recipe.

## Click events and selection

When selection mode is active, clicking a data row **toggles** the row instead of emitting the normal `click` event. `click` is emitted for data rows in two cases: when `selectionMode` is `null` and the shift key is not held, and when `selectionMode` is `'non-select'` (with or without shift).

Shift+click activates selection mode when it is not yet active and emits no `click`; while a mode is already active it toggles the row, exactly like a regular click. In `'non-select'` mode shift+click changes nothing and emits `click` like any other click.

Header row clicks always emit `click` regardless of selection mode.
