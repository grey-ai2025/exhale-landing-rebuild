# 008 — Stop the scroll indicator looping off-screen

- **Status**: DONE
- **Note**: used the documented JS fallback: a view() timeline would have mapped the bounce iterations onto scroll position.
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: MEDIUM
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, ~6 lines

## Problem

```css
/* motion/css/styles.css:651 — current (excerpt) */
.scroll-indicator {
    /* … */
    animation: bounce 2s infinite;
    cursor: pointer;
    transition: color 0.3s;
}
```

The bounce is justified — it is an affordance hint telling a first-time visitor
the page continues below the fold, and it points in the direction of the
gesture. The problem is that it never stops. Once the visitor has scrolled past
the hero the hint has served its purpose, but the animation keeps running for
the entire session, compositing a layer nobody can see.

This is the same class of waste as the ambient orb drift and the video-button
pulse: motion that runs whether or not anyone is there.

## Target

The bounce runs only while the hero is on screen, using a scroll-driven
animation range so no JavaScript is needed. Outside the hero it is not
"paused" — it simply is not running.

```css
/* target — motion/css/styles.css:651, base rule */
.scroll-indicator {
    /* … unchanged … */
    animation: bounce 2s infinite;
    cursor: pointer;
    transition: color 0.3s;
}

/* target — add inside the existing
   @supports (animation-timeline: view()) /
   @media (prefers-reduced-motion: no-preference) block */
.scroll-indicator {
    /* Runs while the hero is in view; stops once it has left. */
    animation-timeline: view();
    animation-range: cover 0% cover 60%;
    animation-play-state: running;
}
```

If `animation-timeline` on a looping animation proves unreliable in the target
browser, the fallback is a two-line IntersectionObserver in
`motion/js/main.js` toggling a `.is-hinting` class — see step 3.

## Repo conventions to follow

- The scroll-driven block lives at `motion/css/styles.css:2120` onward, guarded
  by `@supports (animation-timeline: view())` and
  `@media (prefers-reduced-motion: no-preference)`.
- **Critical:** a `view()` timeline resolves against the nearest ancestor that
  is a scroll container. Any ancestor with `overflow: hidden`, `auto`, or
  `scroll` silently captures it and pins the animation at one end with no
  error. This has bitten this codebase three times. Before relying on `view()`,
  confirm no ancestor of `.scroll-indicator` scrolls:
  ```js
  let el = document.querySelector('.scroll-indicator');
  while (el) {
    const o = getComputedStyle(el).overflow;
    if (o !== 'visible') console.log('scroll container:', el.className || el.tagName, o);
    el = el.parentElement;
  }
  ```
  If that logs anything other than the document, use the JS fallback.

## Steps

1. Run the ancestor check above. Record the result.
2. If clear: add the `.scroll-indicator` rule shown in Target to the existing
   scroll-driven block in `motion/css/styles.css`.
3. If an ancestor scrolls: instead add to `motion/js/main.js`, inside the
   existing `DOMContentLoaded` handler, an IntersectionObserver on
   `.scroll-indicator` that toggles a class, and in CSS move the `animation`
   declaration onto `.scroll-indicator.is-hinting` so it only runs while the
   class is present.
4. Confirm the indicator still bounces on first load without any scrolling —
   this is the moment it exists for.

## Boundaries

- Do NOT delete the bounce. Unlike the orb drift and the button pulse, this one
  has a stated purpose: it hints in the direction of the gesture.
- Do NOT change the 2s duration or the `bounce` keyframes.
- Do NOT add a dependency.
- Do NOT change markup unless step 3 applies, and then only to add a class from
  JS.

## Verification

- **Mechanical**: with the page loaded and not scrolled, the indicator has a
  running animation:
  `document.querySelector('.scroll-indicator').getAnimations().length > 0`.
  After scrolling two viewports down, the same expression should report either
  no animations or a non-running play state.
- **Feel check**:
  - Load the page and do not touch anything. The arrow must bounce immediately.
  - Scroll past the hero and back up. The bounce must resume.
  - With reduced motion emulated, the arrow must be visible and completely
    still.
- **Done when**: the hint bounces while the hero is on screen and is provably
  not running once it is not.
