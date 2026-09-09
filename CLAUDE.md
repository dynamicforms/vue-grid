# vue-grid

## Column auto-sizing

Real rows are direct items of one shared grid (`.df-grid.body-grid`), so the browser resolves
their column widths natively from actual row content — nothing is measured off a shadow and
copied onto them. The header and filter row sit outside that grid, though, and can't themselves
be native items of it, so `df-grid.vue` reads the body grid's own resolved
`grid-template-columns` and republishes it as `--grid-template-columns` on the container, which
the header consumes with `!important` — see [Card layout CSS](docs/reference/df-grid.md#card-layout-css)
for the consumer-facing version of this.

A second, unrelated shadow mechanism exists purely to pick *which* responsive layout is active:
one `<shadow-grid>` per layout candidate renders a small sample of real records off-screen (see
`secondaryShadowCount`) and reports a natural width, which the container's `ResizeObserver`
compares against the current width to choose the widest layout that still fits
(`pickBy`/`maxBy` in `df-grid.vue`). Each candidate is actually measured twice: once at
`width: max-content` (today's natural, unwrapped width per field) and once at
`width: min-content` (forces every field to wrap at every opportunity). The min-content pass also
reads how many lines each sampled row's content wraps into per field, and
`computeLayoutTargetWidth`/`fieldTargetWidth` (`helpers/shadow-metrics.ts`) uses the *median* line
count — not the worst case — to shrink the reported width back down for fields whose typical
content wraps comfortably, so a rare long outlier doesn't force the whole layout to look wider
than it needs to be. This is deliberately a heuristic, not exact text metrics: max-content sizing
is defined as "the width if given infinite space" and never wraps regardless of the track-sizing
function laying it out, so there is no way to ask a max-content measurement "how wide would this
be if it were allowed to wrap a little" directly — the two-pass min/max-content measurement is how
that question gets answered instead.

**Each secondary shadow must measure inside the grid.** It is `position: absolute; left: 0;
right: 0` and a direct child of `.df-grid.container`, so the container carries
`position: relative`. Without it the shadow stretched to whatever ancestor happened to be
positioned — in a Vuetify app `.v-application__wrap`, the full page width — and its measured width
would be wrong for the container it's actually meant to describe.

**The min-content pass's own reported `width` cannot be trusted alone.** Firefox under-reports a
`width: min-content` grid's resolved width when it contains items with overlapping column spans
(one field spanning several tracks alongside others spanning subsets of the same tracks, as
`three-row` does) — the grid's computed `width` comes back narrower than one of its own child
cells' rendered width, i.e. content silently overflows the box rather than growing it to fit,
which a min-content box is defined never to allow. `shadow-grid.vue` takes `scrollWidth` as a
floor over the computed `width` for exactly this reason; Chromium has not been observed needing
the floor; taking the max of both costs nothing there.

**The header must reserve what the body scroller reserves.** The header sits outside the scroller,
so it has to step aside by the width of the body's vertical scrollbar or its columns come out wider
than the body columns they label. That width cannot be declared. It was `scrollbar-gutter: stable`,
which is wrong wherever the platform's reservation is not the classic one: with overlay scrollbars
Chromium still reserves ~15px for the gutter while the body reserves nothing, so the header was
15px short of the tracks it had been given and its last column overflowed by ~7px. Firefox honours
the same declaration by reserving nothing. So the amount is measured instead —
`offsetWidth - clientWidth` on the body scroller — and published by `df-grid.vue` as
`--df-grid-scrollbar-width`, which `df-grid-header.vue` consumes as `padding-right`. It is
re-measured on mount, on container resize, and on update, because rows arriving or leaving can make
the scrollbar appear without the container ever resizing.

The shadow grid reserves its own scrollbar the direct way: it is `overflow-y: scroll`, so the
browser takes off exactly what a real scrollbar costs on that platform.

### Testing it

None of this geometry can be tested in JSDOM, which has no layout engine — a unit test can only
check that measured numbers are plumbed to the right places (`df-grid-auto-sizing.spec.ts`) and
that the median/log-scaled target-width math itself is correct given arbitrary inputs
(`shadow-metrics.spec.ts`). The geometry itself is asserted in a real browser by
`e2e/auto-sizing-suite.ts`, run twice: with
overlay scrollbars (`auto-sizing.spec.ts` — headless browsers hide scrollbars, reserving nothing)
and with classic ones (`auto-sizing-classic.spec.ts` — Chromium only, launched without
`--hide-scrollbars`). Headless Firefox cannot be made to show classic scrollbars, so it only runs
the overlay half.

## Row placement and windowing

A record's cells are placed on the shared grid via `--row-base` (`use-row-placement.ts`), read in
consumer CSS as `grid-row: calc(var(--row-base) + N)`. It is a record's position *within the
currently-mounted window*, not its index in the full dataset: Firefox stops generating further
implicit CSS grid row tracks past roughly 10,000 of them, silently collapsing every row beyond
that onto the same line (Chromium has no such limit, tested directly up to 100,000 rows), so a
row-base tied to the dataset's own size hits that ceiling on any large enough dataset — three-row's
`rows: 3` hit it around record 3,300 of 10,000. Keyed to window position instead, the grid lines
actually referenced stay bounded by `minRenderedRows` regardless of dataset size.

Each windowing spacer (standing in for the un-mounted records above/below the window) is exactly
one grid row line, not one per record it stands in for — its `min-height` carries the estimated
pixel height instead.

Rows 1..`rowsPerRecord` are permanently reserved for the hidden header-measurement clone (`.df-unanchored`
inside the body grid, always `--row-base: 0`), and real records start after that reservation — not
because the clone and a real record sharing a row-base would misplace anything (both would still
resolve to correct, if overlapping, grid lines), but because a layout that places cells via column
auto-placement (no explicit `grid-column` on any cell — a plain single row per record is exactly
this) would have the clone's cells and that record's cells compete for the same auto-placed
columns, pushing one set into newly-created implicit columns instead of the intended track list.
The clone's own box-model contribution (height, padding, border) is force-collapsed to 0 so this
reservation doesn't open a visible gap above the first real row — its *width* still contributes to
column sizing normally, since that is an entirely separate axis.

The row-anchor (`.df-grid.card`, spanning `1 / -1` in its row) is `position: absolute` for the
identical reason: as a normal-flow item it would occupy every column of its row for auto-placement
purposes, leaving no free cell for auto-placed cells to land in at all. Being absolutely positioned
removes it from that bookkeeping entirely while `inset: 0` (not `align-self`/`justify-self`, which
do not apply to absolutely positioned boxes) still fills its grid area exactly as before.

## The Playwright tests run, but not for coverage

CI runs them in their own job (`.github/workflows/ci.yml`, the `e2e` job): Playwright installs
chromium and firefox, `npm run test:e2e` starts the VitePress dev server through
`playwright.config.ts`, and traces are uploaded when a test fails.

They contribute nothing to the coverage report, though. `npm test` is vitest only — `e2e/**` is
excluded from the run, and `coverage-final.json` is built from the v8 instrumentation inside
that process, while the Playwright tests drive a dev server whose code is not instrumented. So the
coverage numbers understate what is actually exercised: `df-grid.vue`, `use-excessive-scroll.ts`
and `use-recently-added.ts` are all driven by the e2e suite as well.
