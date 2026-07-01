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

The arc flashes at full opacity on first trigger. If triggered again within 1.5 s, subsequent flashes are progressively more discrete (minimum opacity 0.15).

## Row animation

Apply a CSS animation to `.df-grid.card.state-adding`. The example below uses `clip-path` to reveal
the card from top to bottom — visually identical to a height 0 → 100 % expansion but without
affecting layout (which would interfere with the virtual scroll's pre-measured item sizes):

```css
@keyframes df-incoming-row-reveal {
  from { clip-path: inset(0 0 100% 0); opacity: 0.3; }
  to   { clip-path: inset(0 0 0%   0); opacity: 1; }
}
.df-grid.card.state-adding {
  animation: df-incoming-row-reveal 0.5s ease-out;
}
```

## API

```typescript
const recentlyAdded = useRecentlyAdded(records, 'id')

// Add pks. timeout (ms) controls how long the class stays on the row.
recentlyAdded.addRecentlyAdded([1, 2, 3], 600)

// Reactive: true while pk is in the list — use in rowClass or custom #item slot.
recentlyAdded.isPendingAdd(pk)

// Reactive (rAF-ticked): ms elapsed since pk was added, or null if not pending.
// Use when you need a JS animation keyed to exact elapsed time.
recentlyAdded.timeSinceAdded(pk)
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
flash without row animation. **Add random** and **Start auto-add** mix both effects.

<table-incoming/>

<script setup>
import TableIncoming from '../components/table-incoming.vue';
</script>
