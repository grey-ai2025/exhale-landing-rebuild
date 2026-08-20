# Animation plans — Exhale landing page (`motion/`)

Findings from an `improve-animations` audit of the `/motion/` working copy
(3 stylesheets, 2,828 lines; 4 scripts). Each plan is self-contained: exact
file paths, verbatim current code, exact target values, and a feel check.

**Target**: `motion/` only. Do not apply these to `original/` (the pristine
reference copy) or `apple/` (a separate design direction).

**Commit stamp**: none — `motion/` is not a git repository. If it becomes one,
re-stamp each plan with `git rev-parse --short HEAD`.

## Plans

| # | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| [001](001-remove-play-button-pulse.md) | Remove the infinite pulse from the video play button | HIGH | Purpose & frequency | DONE |
| [002](002-add-press-feedback.md) | Add press feedback to the two real buttons | HIGH | Physicality | DONE |
| [003](003-gate-hover-motion.md) | Gate hover motion behind pointer capability | HIGH | Accessibility | DONE |
| [004](004-replace-transition-all.md) | Replace every `transition: all` | HIGH | Performance | DONE |
| [005](005-use-easing-token-on-reveal.md) | Use the easing token on the page's main reveal | MEDIUM | Easing & tokens | DONE |
| [006](006-reduced-motion-gentler-not-zero.md) | Make reduced motion gentler, not zero | MEDIUM | Accessibility | DONE |
| [007](007-move-steps-reveal-into-reading-zone.md) | Move the how-it-works reveal into the reading zone | MEDIUM | Purpose & frequency | DONE |
| [008](008-stop-scroll-indicator-looping-offscreen.md) | Stop the scroll indicator looping off-screen | MEDIUM | Purpose & frequency | DONE |
| [009](009-release-will-change-on-reveals.md) | Release `will-change` on reveal elements | LOW | Performance | DONE |
| [010](010-throttle-gallery-control-sync.md) | Stop re-syncing gallery controls every spring frame | LOW | Performance | DONE |
| [011](011-delete-dead-motion-css.md) | Delete dead motion CSS | LOW | Cohesion | DONE |

## Status

All 11 executed and verified on 2026-08-20 in the order below. Page height,
every section height, and the gallery scroll width are unchanged; no console
errors in either theme; reduced motion verified with nothing left hidden.

## Recommended execution order

```
011 → 004 → 003 → 002 → 001 → 005 → 009 → 006 → 007 → 008 → 010
```

**Delete before you edit.** 011 removes ~120 lines of rules for elements that
no longer exist. Running it first means 004 and 003 don't waste effort fixing
`transition: all` and ungated hovers on `.pain-card`, which renders nowhere.

Then the four HIGH findings, then the rest in descending leverage.

## Dependencies

| Plan | Depends on | Why |
| --- | --- | --- |
| 002 | 004 | 004 replaces the `transition: all` on both buttons with a named list including `transform`. Without it, 002 must add its own `transition` declaration — 002 covers both cases, but running 004 first is cleaner. |
| 003 | 011 | 011 deletes `.pain-card:hover`, so 003 has two rules to relocate instead of three to triage. |
| 005 | — | Moves the `:root` token block to the top of the file. Do this before any other plan that references `var(--ease-out)` in a new declaration. |
| 009 | 005 | Both edit the same `.reveal` rule. Either order works; doing them back to back avoids a second pass over the block. |

Plans 001, 006, 007, 008, 010 are independent.

## Notes on this codebase

**The `view()` scroll-container trap.** Three separate bugs in this codebase
came from the same cause: a `view()` timeline resolves against the nearest
ancestor that is a scroll container, and any ancestor with `overflow: hidden`,
`auto`, or `scroll` silently captures it — pinning the animation at one end
with no error and no warning. It happened on `#bespoke` (`overflow: hidden`,
fixed by switching to `clip-path: inset(0)`), on `.feature-card`
(`overflow: hidden`), and on `.gallery-viewport` (`overflow-x: auto`, which
cannot be changed — everything inside the gallery is class-driven instead).

Before adding any new scroll-driven animation, walk the ancestor chain:

```js
let el = document.querySelector('<selector>');
while (el) {
  const o = getComputedStyle(el).overflow;
  if (o !== 'visible') console.log('scroll container:', el.className || el.tagName, o);
  el = el.parentElement;
}
```

**`entry`-bound ranges finish at the bottom of the screen.** An
`animation-range` ending in the `entry` phase completes the moment the element
is fully inside the viewport — for anything shorter than the viewport, that is
while it still hugs the bottom edge, in peripheral vision. Measured on the
Bespoke panel: an entry-bound range ran from a panel-top of 900px to 572px and
was finished before the reader looked at it. `cover`-bound ends play out in the
middle of the screen. Plan 007 is the last instance of this.

**Two skills, one disagreement.** The clip-path wipe recipe is written for
**image** reveals. Applied to a text block it cuts glyphs in half and reads as
broken rendering — this was tried on the Bespoke panel and reverted. The wipes
on the video frame and the capability cards are correct because those are large
mixed-content blocks. Bespoke uses a blur-and-scale materialise instead, which
is the one place on the page that justifies animating `filter`.

## Not planned

Three additive opportunities from the audit were left unplanned because they
need a design decision before they can be specified:

- **Theme swap has no coordinated timing** — `body` eases colour at 400ms,
  cards at 320ms, nav links at 200ms, headings snap. One click, four timings,
  and the change visibly ripples. Fixing it means choosing a single
  `--theme-swap` duration and applying it everywhere, or making the swap
  instant. Both are defensible.
- **The Typeform CTA has no entrance.** Deliberate — people are filling in a
  form there and motion around it hinders. The heading above it could carry one.
- **`.join-waitlist-btn` is the page's conversion event and is otherwise
  static.** Beyond press feedback (002), it is the one element on the page
  where a rare-tier delight moment would be justified.
