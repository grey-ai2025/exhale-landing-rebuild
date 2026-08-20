# 003 — Gate hover motion behind pointer capability

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~20 lines restructured

## Problem

`motion/css/styles.css` contains 32 `:hover` rules and exactly one
`@media (hover: hover)` block (at line 2352, covering only the gallery arrows).
Every other hover state applies on touch devices, where a tap fires `:hover`
and leaves the element stuck in that state until the user taps elsewhere.

The ones that actually **move** something, and so are the ones that matter:

```css
/* motion/css/styles.css:201 — current */
.theme-toggle:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}
```

```css
/* motion/css/styles.css:800 — current */
.video-container:hover {
    transform: translateY(-4px);
}
```

On a phone, tapping the theme toggle leaves it hovering 2px above its resting
position for the rest of the visit. Tapping the video to play it leaves the
whole frame lifted.

## Target

Movement-bearing hover states live inside a capability query. Non-movement
hovers (colour, border-colour) may stay ungated — they are harmless and aid
comprehension.

```css
/* target */
@media (hover: hover) and (pointer: fine) {
    .theme-toggle:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }

    .video-container:hover {
        transform: translateY(-4px);
    }
}
```

## Repo conventions to follow

- Exemplar already in the file — `motion/css/styles.css:2352`:
  ```css
  @media (hover: hover) and (pointer: fine) {
      .gallery-viewport { cursor: grab; }
      .gallery-arrow:not([disabled]):hover { /* … */ }
  }
  ```
- `motion/css/craft.css` and `motion/css/scrolly.css` contain no hover motion —
  leave both alone.

## Steps

1. In `motion/css/styles.css`, run
   `grep -n ":hover" -A 4 motion/css/styles.css` and identify every `:hover`
   rule whose body sets `transform`. Expect exactly two live ones:
   `.theme-toggle:hover` (line ~201) and `.video-container:hover` (line ~800).
2. Note the rules `.gallery .feature-card:hover { transform: none; }` (line
   ~2255) and `.step:hover { transform: none; ... }` (line ~2385). These
   *neutralise* inherited hover transforms rather than adding motion — leave
   them exactly as they are, outside any media query.
3. Note `.pain-card:hover` and `.feature-card:hover`. `.pain-card` has **zero**
   matching elements in `motion/index.html` and is handled by plan 011.
   `.feature-card:hover`'s transform is already cancelled inside the gallery by
   step 2's rule. Do not move either.
4. Cut the two rules identified in step 1 and paste them into a single new
   `@media (hover: hover) and (pointer: fine)` block placed immediately after
   the `.video-container:hover` rule's original position.
5. Leave the non-transform hover rules (`.top-nav:hover`, `.top-nav a:hover`,
   `.footer` links, colour-only changes) exactly where they are.

## Boundaries

- Do NOT gate colour-only or border-only hover changes — they are not motion
  and gating them removes useful feedback on hybrid devices.
- Do NOT delete any hover rule; this plan only relocates two of them.
- Do NOT touch `motion/css/craft.css` or `motion/css/scrolly.css`.
- Do NOT change markup.
- If either rule already sits inside a `@media (hover: hover)` block, STOP and
  report — the plan has already been applied.

## Verification

- **Mechanical**: `grep -c "hover: hover" motion/css/styles.css` returns `2`.
- **Feel check**: serve the page and open DevTools device emulation with a
  touch device profile (or use a real phone on the local network):
  - Tap the theme toggle. It must switch themes and settle flat — it must not
    remain raised.
  - Tap the video. It must play and the frame must not stay lifted.
  - Switch back to a desktop pointer and confirm both still lift on hover.
- **Done when**: no element on a touch device remains visually raised after a
  tap, and desktop hover behaviour is unchanged.
