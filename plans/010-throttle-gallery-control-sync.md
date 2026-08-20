# 010 — Stop re-syncing gallery controls on every spring frame

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 1 file, ~15 lines

## Problem

The capability gallery's snap animation calls `syncControls()` from inside the
spring's per-frame callback:

```js
/* motion/js/gallery.js — current, inside goTo() */
scrollSpring = makeSpring({
    from: viewport.scrollLeft,
    to: target,
    velocity: velocity || 0,
    response: 0.44,
    damping: 1,
    onUpdate: function (v) { viewport.scrollLeft = v; syncControls(); },
    onDone: function () {
        scrollSpring = null;
        viewport.style.scrollSnapType = '';
        syncControls();
    }
});
```

And `syncControls` writes to the DOM unconditionally:

```js
/* motion/js/gallery.js — current */
function syncControls() {
    if (prevBtn) prevBtn.disabled = viewport.scrollLeft <= 2;
    if (nextBtn) nextBtn.disabled = viewport.scrollLeft >= maxScroll - 2;
    setActive(nearestSnap(viewport.scrollLeft));
}
```

At 60fps that is two `disabled` property writes plus a nearest-snap search per
frame for the whole duration of every snap. `setActive` already early-returns
when the index is unchanged, so the dot updates are cheap — but the two button
writes are not guarded at all, and each one can invalidate style for that
element.

This is not currently causing visible jank. It is unnecessary work on the one
interaction on the page that must stay at 60fps, so it is worth removing before
it matters.

## Target

`syncControls` becomes idempotent — it only touches the DOM when a value has
actually changed — so calling it per frame costs almost nothing.

```js
/* target — motion/js/gallery.js */
var lastPrevDisabled = null;
var lastNextDisabled = null;

function syncControls() {
    var atStart = viewport.scrollLeft <= 2;
    var atEnd = viewport.scrollLeft >= maxScroll - 2;

    if (prevBtn && atStart !== lastPrevDisabled) {
        prevBtn.disabled = atStart;
        lastPrevDisabled = atStart;
    }
    if (nextBtn && atEnd !== lastNextDisabled) {
        nextBtn.disabled = atEnd;
        lastNextDisabled = atEnd;
    }

    setActive(nearestSnap(viewport.scrollLeft));
}
```

## Repo conventions to follow

- The file is IIFE-wrapped, ES5-style (`var`, `function` expressions) so it
  needs no build step. Match that — do not introduce `let`, `const`, or arrow
  functions.
- `setActive` at the top of the same file is the exemplar for the
  guard-then-write pattern:
  ```js
  function setActive(i) {
      if (i === active) return;
      active = i;
      /* … */
  }
  ```

## Steps

1. In `motion/js/gallery.js`, inside `initGallery`, declare
   `var lastPrevDisabled = null;` and `var lastNextDisabled = null;` alongside
   the other state variables (near `var active = 0;`).
2. Replace the body of `syncControls` with the target version above.
3. Find the place where `active` is force-reset before the first sync
   (`active = -1;` near the end of `initGallery`) and reset the two new
   variables to `null` there too, so the first call always writes.
4. Leave every call site of `syncControls()` unchanged.

## Boundaries

- Do NOT remove the `syncControls()` call from the spring's `onUpdate` — the
  arrows genuinely need to disable at the moment the edge is reached, not
  afterwards.
- Do NOT convert the spring to a different mechanism.
- Do NOT change `makeSpring`, `projectMomentum`, or `rubberband`.
- Do NOT change the drag handlers.
- Do NOT introduce ES6 syntax.

## Verification

- **Mechanical**: `node --check motion/js/gallery.js` exits cleanly.
- **Feel check**: serve the page, open the capability gallery, and:
  - Drag a card and flick it. Momentum, snap, and rubber-band at the ends must
    be unchanged.
  - At the first card, the left arrow must be disabled; at the last, the right
    arrow. Both must flip **during** the snap, not after it settles.
  - Press the right arrow twice quickly — the motion must stay continuous, not
    restart.
  - Record a DevTools performance profile while snapping; scripting time per
    frame should drop and there should be no long tasks.
- **Done when**: behaviour is indistinguishable by eye, and the profile shows
  less per-frame scripting.
