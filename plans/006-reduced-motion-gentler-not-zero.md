# 006 — Make reduced motion gentler, not zero

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~10 lines

## Problem

The reduced-motion block flattens *every* transition on *every* element to
effectively zero:

```css
/* motion/css/styles.css:~2160 — current */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }

    .ambient-orb,
    .cursor-glow {
        display: none;
    }

    .reveal {
        opacity: 1;
        transform: none;
    }
    /* … */
}
```

Reduced motion means *fewer and gentler* animations, not none. Killing every
transition also kills the ones that aid comprehension — hover feedback,
button press response, the theme swap, the active-step dimming in The Reality
section. A reduced-motion user currently gets an interface where nothing
acknowledges input at all, which is a worse experience, not a safer one.

## Target

Kill movement. Keep opacity and colour, shortened.

```css
/* target */
@media (prefers-reduced-motion: reduce) {
    /* Vestibular triggers: anything that moves or scales. */
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-property: opacity, color, background-color, border-color, box-shadow !important;
        transition-duration: 200ms !important;
    }

    .ambient-orb,
    .cursor-glow {
        display: none;
    }

    .reveal {
        opacity: 1;
        transform: none;
    }
    /* … rest of the block unchanged … */
}
```

Restricting `transition-property` to the non-positional set means `transform`
and `filter` transitions simply do not run, while opacity and colour still
cross-fade over a comfortable 200ms.

## Repo conventions to follow

- Exemplar — `motion/css/scrolly.css` already takes the gentler approach in its
  own reduced-motion block:
  ```css
  @media (prefers-reduced-motion: reduce) {
      /* Dimming still marks the active step, just less harshly. */
      .scrolly-step { opacity: 0.55; }
      .scene.is-past { transform: none; }
  }
  ```
- Element-specific reduced-motion overrides live at the bottom of each
  stylesheet, not inline with the base rule.

## Steps

1. In `motion/css/styles.css`, locate the `@media (prefers-reduced-motion: reduce)`
   block (around line 2160).
2. In the `*, *::before, *::after` rule, replace
   `transition-duration: 0.01ms !important;` with the two declarations:
   ```css
   transition-property: opacity, color, background-color, border-color, box-shadow !important;
   transition-duration: 200ms !important;
   ```
3. Leave `animation-duration: 0.01ms !important` and
   `animation-iteration-count: 1 !important` exactly as they are — those
   correctly neutralise the keyframe loops and the scroll-driven animations.
4. Leave every element-specific override in the block untouched
   (`.ambient-orb`, `.cursor-glow`, `.reveal`, `.bespoke-body.reveal`,
   `.bespoke-note.reveal`).
5. Check the other two stylesheets' reduced-motion blocks still make sense
   given the change: `motion/css/scrolly.css` and `motion/css/craft.css`. They
   set `transition: none` on specific elements, which still works because a
   longhand `transition-property` in a later `!important` rule wins — verify in
   the browser rather than assuming.

## Boundaries

- Do NOT remove the reduced-motion block or weaken the `animation-*` overrides.
- Do NOT add `transform` or `filter` to the allowed transition-property list —
  those are precisely what must not run.
- Do NOT change markup.
- If the block does not match the excerpt, STOP and report.

## Verification

- **Mechanical**: `grep -n "transition-property" motion/css/styles.css` returns
  the new line.
- **Feel check**: in DevTools → Rendering, set
  `Emulate CSS prefers-reduced-motion: reduce`, reload, and scroll the page:
  - Nothing slides, scales, blurs, or drifts. The orbs are gone.
  - Content still **fades** in as it arrives — it does not pop.
  - Hovering the top-nav pill still changes its border colour smoothly.
  - Pressing a button still changes its background (the scale will not run —
    that is correct).
  - The Reality section's active step still brightens and dims.
  - Nothing anywhere is stuck invisible, blurred, or clipped.
- **Done when**: with reduced motion on, the page has no positional movement
  and no loops, but every state change is still legible.
