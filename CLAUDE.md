# vue-grid

## Column auto-sizing

Column widths are not resolved by the browser on the real rows. The shadow grid is measured, its
computed `grid-template-columns` is read in pixels, and that pixel list is copied onto every real
row through `--grid-template-columns` with `!important` (`df-grid.vue`, the
`.df-grid.container .df-grid.card:not(.shadow-grid)` rule). Whatever box the shadow is measured in
is therefore the box the whole grid is laid out for, which makes two things load-bearing:

**The shadow must measure inside the grid.** It is `position: absolute; left: 0; right: 0` and a
direct child of `.df-grid.container`, so the container carries `position: relative`. Without it the
shadow stretched to whatever ancestor happened to be positioned — in a Vuetify app
`.v-application__wrap`, the full page width — and those columns were then copied onto rows only as
wide as the container. The grid overflowed by the difference: 32px at viewport 1280.

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
check that measured numbers are plumbed to the right places (`df-grid-auto-sizing.spec.ts`). The
geometry itself is asserted in a real browser by `e2e/auto-sizing-suite.ts`, run twice: with
overlay scrollbars (`auto-sizing.spec.ts` — headless browsers hide scrollbars, reserving nothing)
and with classic ones (`auto-sizing-classic.spec.ts` — Chromium only, launched without
`--hide-scrollbars`). Headless Firefox cannot be made to show classic scrollbars, so it only runs
the overlay half.

## The Playwright tests run, but not for coverage

CI runs them in their own job (`.github/workflows/ci.yml`, the `e2e` job): Playwright installs
chromium and firefox, `npm run test:e2e` starts the VitePress dev server through
`playwright.config.ts`, and traces are uploaded when a test fails.

They contribute nothing to the coverage report, though. `npm test` is vitest only — `e2e/**` is
excluded from the run, and `coverage-final.json` is built from the v8 instrumentation inside
that process, while the Playwright tests drive a dev server whose code is not instrumented. So the
coverage numbers understate what is actually exercised: `df-grid.vue`, `use-excessive-scroll.ts`
and `use-recently-added.ts` are all driven by the e2e suite as well.
