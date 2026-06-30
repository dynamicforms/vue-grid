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

## Refactor showXBar

There are multiple props that determine whether a particular part of the grid should be showing or not.
A refactor to an array seems prudent

- [ ] Refactor props for showing parts of the grid to one single object prop (Record<'body' | 'headers' | ..., boolean>.
      The prop is named 'visible-sections'. Values will start out as `true` for all except filter, status and summary.

---

## **Visual Features**

- [ ] Support CSS modes other than grid (e.g. table, flex, Vuetify row/col)
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
