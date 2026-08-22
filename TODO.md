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
- [ ] Incoming records indicator currently shifts rows down when a new row is added at top. This is of course wrong and
      should be fixed.

---

# Out of scope

## **Core Data Management**
- API-based data management (CRUD operations)
- Pagination support (results + next URL format)

## **Column Management**
- Dynamic column configuration via JSON definitions

## **Sorting & Filtering**
- Dynamic filter parameters

---

# Road to 1.0

1.0 is a promise that the public API will not break, not a promise that everything is finished.
These are the things standing between the current state and that promise.

### Blockers

- **Pre-1.0 peer dependencies leak into the public API.** `@dynamicforms/vue-forms ^0.17.1` and
  `@dynamicforms/vuetify-inputs ^0.9.2` are themselves below 1.0, and their types (`RenderableValue`,
  `MessagesWidget`, the filter row inputs) are part of what consumers touch. This package cannot be
  more stable than what it re-exports: either those reach 1.0 first, or their types get wrapped so
  they stop being part of this API.

- **Secondary shadow grids are measured once.** See the comment in `df-grid.vue` next to the
  per-layout shadow grids: the initial render may be too narrow, and the measurement taken there is
  the one every later layout decision is made from. Responsive layout switching is a headline
  feature, so this is a behavioural gap rather than a cosmetic one. Either re-measure when the
  layout changes, or raise `secondaryShadowCount` enough to make the first measurement trustworthy.

- **The public surface has not been deliberately drawn.** `src/table/index.ts` also exports
  `DfGridHeader`, `GridCard`, `SortingIndicator` and `IncomingArc`. 1.0 freezes whatever is exported,
  so decide which of these are API and which are internals that happen to be reachable.

- **Documentation accuracy is unverified.** A 1.0 tells readers to trust the documentation; the
  audit against the source has to be finished and its findings applied first.

### Soak, don't rush

The two auto-sizing fixes (the shadow grid's containing block, and reserving the measured scrollbar
width in the header instead of a declared gutter) mean the layout foundation was wrong in real
conditions until now. Give them time in real use before freezing the API around them.
