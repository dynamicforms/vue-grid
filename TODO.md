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

## **Status Bar (above body) — existing, needs work**

Currently named `showStatusBar` / `statusBar` slot. Sample implementation shows active filter count,
but the actual intended uses are broader:

- Active filter count (current sample implementation)
- **Selection mode**: "n items selected" · "Invert selection" · "Cancel selection mode"
- **Group actions**: list of bulk actions executable on all selected items

- [ ] Fix docs: remove claim that status bar "displays active filter count" — that's only a sample
- [ ] Design the selection mode API (ties into row selection feature below)

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

## **Row Operations**

- [ ] Row selection (single / multiple)
  - Drives selection mode content in the status bar (see above)

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

---

# Out of scope

## **Core Data Management**
- API-based data management (CRUD operations)
- Pagination support (results + next URL format)

## **Column Management**
- Dynamic column configuration via JSON definitions

## **Sorting & Filtering**
- Dynamic filter parameters
