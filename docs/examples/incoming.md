# Incoming Records Indicator

Demonstrates the `useRecentlyAdded` composable and the arc overlay for notifying users of newly arrived records.

## How it works

**`useRecentlyAdded(records, keyField)`** returns a composable instance you pass to `<DfGrid :recently-added="...">`.

When you call `addRecentlyAdded(pks, timeout?)`:
- Each pk is added to the recently-added list with a timestamp.
- The grid applies the `state-adding` CSS class to rows whose pk is in the list.
- If any pk maps to a row **above** the current viewport, a flash arc appears at the **top** of the body.
- If any pk maps to a row **below** the current viewport, a flash arc appears at the **bottom**.
- After `timeout` ms (default 250) each pk is automatically removed from the list.

The arc flashes at `incomingArcMaxOpacity` (default 1) on the first trigger and then fades linearly to zero over
800 ms. If triggered again within 1.5 s, each successive flash starts a further 15 % of `incomingArcMaxOpacity` lower
than the one before, down to a floor of 0.15 × `incomingArcMaxOpacity`.

## Row animation

Apply a CSS animation to `.df-grid.card.state-adding`. The example below scales the card open and
follows with a brightness wink — neither a transform nor a filter changes the element's layout box,
so the virtual scroll's pre-measured item sizes stay valid:

```css
@keyframes df-row-scale-in {
  from { transform: scaleY(0); opacity: 0.3; }
  to   { transform: scaleY(1); opacity: 1;   }
}
@keyframes df-row-wink {
  0%, 100% { filter: brightness(1);   }
  50%      { filter: brightness(2.2); }
}
.df-grid.card.state-adding {
  transform-origin: center center;
  animation:
    df-row-scale-in 0.25s ease-out,
    df-row-wink     0.4s  0.25s ease-in-out both;
}
```

## API

```typescript
// records must be a Ref to the array the grid renders; wrap a reactive array with ref().
const recentlyAdded = useRecentlyAdded(records, 'id')

// Add pks. timeout (ms) controls how long the class stays on the row.
recentlyAdded.addRecentlyAdded([1, 2, 3], 600)

// Reactive: true while pk is in the list — use in rowClass or custom #item slot.
recentlyAdded.isPendingAdd(pk)

// Reactive (rAF-ticked): ms elapsed since pk was added, or null if not pending.
// Use when you need a JS animation keyed to exact elapsed time.
recentlyAdded.timeSinceAdded(pk)

// The row index range the grid currently shows; start is inclusive, end exclusive.
// The grid keeps it up to date and the arc detection compares new rows against it.
recentlyAdded.visibleRange.value

// Fire a flash yourself when your insertion logic knows more than the automatic detection.
recentlyAdded.triggerTopArc()
recentlyAdded.triggerBottomArc()

// True for 300 ms after each addRecentlyAdded call. While it is true the grid ignores click,
// double-click and long-press, so a row arriving under the finger cannot be mis-clicked.
// Scrolling, wheel, swipe and pinch are unaffected.
recentlyAdded.isAdding.value
```

Pass the instance to the grid:

```html
<df-grid :recently-added="recentlyAdded" :incoming-arc-max-opacity="0.8" .../>
```

### Arc slot override

Replace the default arc with your own content via named slots:

```html
<df-grid :recently-added="recentlyAdded">
  <template #incoming-arc-top>
    <div class="my-custom-top-indicator">↑ New records above</div>
  </template>
  <template #incoming-arc-bottom>
    <div class="my-custom-bottom-indicator">↓ New records below</div>
  </template>
</df-grid>
```

## Live demo

Scroll the grid to the middle, then press **Add at top** or **Add at bottom** to see the arc
flash without row animation. **Add in visible range** inserts a record inside the viewport, where
the row animation plays and no arc fires. **Add random** and **Start auto-add** mix both effects.

<table-incoming/>

<script setup>
import TableIncoming from '../components/table-incoming.vue';
</script>
