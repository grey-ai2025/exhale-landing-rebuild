# 009 — Release `will-change` on reveal elements

- **Status**: DONE
- **Note**: .feature-card keeps its will-change (plan permitted); .reveal and .step released.
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 1 file, 2 lines

## Problem

```css
/* motion/css/styles.css:1649 — current (excerpt) */
.reveal {
    opacity: 0;
    transform: translate3d(0, 40px, 0);
    transition: opacity 0.6s ease-out,
                transform 0.6s ease-out;
    will-change: opacity, transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
}
```

`will-change` promotes an element to its own compositor layer and keeps it
there. There are 13 `.reveal` elements in `motion/index.html`, so 13 layers are
held for the lifetime of the page to serve an animation that runs once.

The scroll-driven path already releases it:

```css
/* motion/css/styles.css:2131 — inside @supports + no-preference */
.reveal {
    /* … */
    will-change: auto;   /* the compositor handles these now */
}
```

But that release is inside the guard, so **Firefox and every reduced-motion
user keeps all 13 promoted layers** — exactly the users least likely to have
headroom for them.

`will-change` is a hint for motion that is *imminent*, not permanent. On a
transition this short and this infrequent the browser's own heuristics are
better.

## Target

```css
/* target — motion/css/styles.css:1649 */
.reveal {
    opacity: 0;
    transform: translate3d(0, 40px, 0);
    transition: opacity 0.6s var(--ease-out),
                transform 0.6s var(--ease-out);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
}
```

`will-change` removed from the base rule entirely, which makes the
`will-change: auto` override inside the `@supports` block redundant — remove
that too.

(The `var(--ease-out)` swap is plan 005. If 005 has not run, leave the easing
as you find it and change only the `will-change` line.)

## Repo conventions to follow

- The only justified `will-change` left in the codebase is scoped to an active
  gesture, in `motion/css/styles.css:2318`:
  ```css
  .gallery.is-dragging .gallery-track { will-change: transform; }
  ```
  That is the correct pattern: applied by a state class only while motion is
  actually happening.

## Steps

1. In `motion/css/styles.css`, delete the line
   `will-change: opacity, transform;` from the `.reveal` rule at ~line 1653.
2. In the scroll-driven `@supports` block at ~line 2131, delete the now-pointless
   `will-change: auto;` declaration from the `.reveal` rule there.
3. Confirm the remaining `will-change` hits are only the drag one:
   `grep -n "will-change" motion/css/styles.css` should show
   `.gallery.is-dragging .gallery-track` and nothing else. Note that
   `.step` and `.pain-card`/`.feature-card` may also carry `will-change:
   transform` — if `.step` does, remove it as well (its hover transform is
   neutralised at line ~2385, so it never animates). Leave
   `.feature-card`'s alone if the gallery drag depends on it.

## Boundaries

- Do NOT remove `backface-visibility` — that is a separate, harmless hint.
- Do NOT remove the drag-scoped `will-change` on `.gallery-track`.
- Do NOT add `will-change` anywhere new.
- Do NOT change markup.

## Verification

- **Mechanical**: `grep -c "will-change" motion/css/styles.css` returns `1`
  (or `2` if `.feature-card`'s is deliberately retained).
- **Feel check**: in Chrome DevTools → Rendering, enable **Layer borders** and
  scroll the page:
  - Before: most sections show their own layer border at rest.
  - After: layers should appear only while something is actually animating.
  - Reveals must still animate identically — this is a hint, not a behaviour.
  - Check in Firefox too, since that path was the one carrying the cost.
- **Done when**: layer count at rest drops noticeably and no reveal looks
  different.
