# DfGrid Component Feature List

## **Grid Structure (layers top → bottom)**

```
┌─────────────────────────────────────┐
│  toolbar-start    │    toolbar-end  │  slot, existing
├─────────────────────────────────────┤
│           column headers            │  existing
├─────────────────────────────────────┤
│           filter row                │  showFilterRow prop, existing
├─────────────────────────────────────┤
│           status bar                │  showStatusBar prop, existing — see notes below
├─────────────────────────────────────┤
│           data rows / body          │  existing
├─────────────────────────────────────┤
│           summary bar               │  TODO — see below
├─────────────────────────────────────┤
│  footer-start     │    footer-end   │  slot, existing
└─────────────────────────────────────┘
```

---

## **Status Bar (above body) — existing**

Named `showStatusBar` / `statusBar` slot. When selection mode is active it switches to the selection
bar (cancel · count · invert · `#groupActions` slot). Otherwise shows the `statusBar` slot content
(default: active filter count, which is only a sample).

---

## **Summary Bar (below body) — TODO**

New bar below the data rows.

Intended uses:

- [ ] Loading indicator (spinner / progress)
- [ ] "No data" message when records is empty
- [ ] Implement the bar as a slot (`summary-bar`) + a `showSummaryBar` prop,
      consistent with how `showStatusBar` works

---

## Refactor showXBar

There are multiple props that determine whether a particular part of the grid should be showing or not.
A refactor to an array seems prudent

- [ ] Refactor props for showing parts of the grid to one single object prop (Record<'body' | 'headers' | ..., boolean>.
      The prop is named 'visible-sections'. Values will start out as `true` for all except filter, status and summary.

---

## **Visual Features**

- [ ] Loading indicator (via summary bar)
- [ ] "No data" indicator (via summary bar)
- [ ] Support CSS modes other than grid (e.g. table, flex, Vuetify row/col)
- [ ] Excessive scrolling indication: when scrolling past the edge of content, show elastic feel (cuts off at ~20–25%
      of visible body height). Implemented as a div with programmatically controlled height — no virtual scroller
      override needed. Snaps back to zero when user stops scrolling (lifts finger, stops wheel, releases arrow key).
- [ ] Pull to refresh: detect gesture and emit an event — grid detects, consumer handles the logic.
- [ ] Incoming records indication: an arc flashes at the top or bottom of the body (similar to Android overscroll arc).
      The grid provides the visual implementation with configurable props (e.g. `opacity`) and a slot for full
      replacement. The consumer decides when to trigger it and from which side — the grid has no comparison logic.
      Effect is very noticeable on first trigger but becomes discrete if shown frequently (debounced / throttled).

- [ ] Single-line layout: selection column width does not update when entering/leaving selection mode until a scroll
      forces a new item into the viewport.

      **What happens:** the `_selection` column is `0px` wide (via `--grid-template-columns`) when selection is
      inactive, and `~1.5em` wide when active. The shadow grid re-measures correctly on selection change (confirmed:
      adding `selectionActive` as a key/prop to the shadow grid triggers `idxAndItem()` → `checkShadowGridColumns()`).
      The CSS variable `--grid-template-columns` on the container **is** updated. But existing visible cards do not
      visually reflow.

      **Suspected cause:** `@pdanpdan/virtual-scroll` puts each item in a `.virtual-scroll-item` with
      `will-change: transform`, promoting it to a GPU-composited layer. CSS custom-property changes on an ancestor
      should cascade even through composited layers (the spec allows it), but in practice Chromium does not
      re-layout composited items in response to an inherited custom-property change on a distant ancestor — it only
      picks up the new value when the item is re-rendered/recycled by the scroller.

      **What was tried:** watch on `isSelectionActive` + nextTick + direct `getComputedStyle` read from shadow grid +
      bypass of throttle; exposing `containerEl` getter from shadow-grid; including `selectionMode` in
      `columnRendererOptionsInternal` (forces new `columns` prop → Vue re-renders grid-cards). None reliably updated
      all visible items without a scroll. The last-tried approach (selectionMode in columnRendererOptionsInternal)
      may be partially working — worth re-testing.

      **Possible future fix:** force a style or class toggle directly on each visible `.virtual-scroll-item` element
      after `templateColumns` changes (e.g. briefly set a dummy CSS variable on each item via JS to break the
      compositing cache), or find a way to call the virtual scroller's internal recycle/re-render API.

---

# Out of scope

## **Core Data Management**
- API-based data management (CRUD operations)
- Pagination support (results + next URL format)

## **Column Management**
- Dynamic column configuration via JSON definitions

## **Sorting & Filtering**
- Dynamic filter parameters
