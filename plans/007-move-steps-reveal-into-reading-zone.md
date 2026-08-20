# 007 — Move the how-it-works reveal into the reading zone

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: MEDIUM
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, 1 line

## Problem

```css
/* motion/css/styles.css:2176 — current */
.how-it-works .reveal { animation-range: entry 10% entry 90%; }
```

An `entry`-bound range completes the moment the element is fully inside the
viewport — which, for an element shorter than the viewport, is while it is
still hugging the **bottom edge of the screen**.

This was measured on the Bespoke section, which had the same problem. With an
`entry`-bound range in a 900px viewport, the animation ran from a panel-top of
900px to 572px and was completely finished by the time the panel reached the
lower third. The reader never sees it; it plays out in peripheral vision.

Bespoke was fixed by moving to a `cover`-bound end
(`motion/css/styles.css:2187`, `animation-range: cover 8% cover 45%`), after
which the same panel animated from 796px to 362px — resolving around the
middle of the screen. This is the last fully `entry`-bound range left in the
codebase.

The range was originally set to `entry 10% entry 90%` to stop the third step
being left permanently faded when the section was framed. Any replacement must
not reintroduce that.

## Target

```css
/* target — motion/css/styles.css:2176 */
.how-it-works .reveal { animation-range: entry 25% cover 30%; }
```

Starts a quarter of the way through entry, ends 30% into the cover phase — far
enough in that the steps resolve while they are being read, but well before the
element could be stranded mid-animation at rest.

## Repo conventions to follow

- Every other scroll-driven range in the file uses a `cover`-bound end. See
  `motion/css/styles.css:2130` (`entry 15% cover 40%`),
  `:2154` (`entry 0% cover 45%`), `:2166` (`entry 20% cover 40%`),
  `:2187` (`cover 8% cover 45%`).
- Ranges live inside the
  `@supports (animation-timeline: view())` +
  `@media (prefers-reduced-motion: no-preference)` guard.

## Steps

1. In `motion/css/styles.css`, change line ~2176 from
   `animation-range: entry 10% entry 90%;` to
   `animation-range: entry 25% cover 30%;`.
2. Verify the three steps still finish revealing. The failure mode to check for
   is a step sitting permanently at partial opacity when the section is
   centred in the viewport.

## Boundaries

- Do NOT change the `.reveal` base rule or the generic scroll-driven range at
  line 2130 — this plan touches the `.how-it-works` override only.
- Do NOT change the `sd-ignite` animation on `.step-number`.
- Do NOT change markup.
- If the line no longer reads `entry 10% entry 90%`, STOP and report.

## Verification

- **Mechanical**: `grep -n "entry 10% entry 90%" motion/css/styles.css` returns
  nothing.
- **Feel check**: this one needs a measurement, not just eyes. With the page
  served, run this in the DevTools console while scrolling the how-it-works
  section, and confirm the step is still below opacity 1 while its top is
  between 600px and 300px from the top of the viewport:
  ```js
  const s = document.querySelectorAll('.step')[1];
  setInterval(() => {
    const r = s.getBoundingClientRect();
    console.log(Math.round(r.top), getComputedStyle(s).opacity);
  }, 200);
  ```
  - If it reports `opacity: 1` while `top` is still above 600, the range is
    still finishing too early.
  - Then scroll so the section is centred and confirm all three steps read at
    full opacity — none stranded.
- **Done when**: the steps are visibly still animating as they cross the middle
  of the screen, and all three are fully resolved once the section is centred.
