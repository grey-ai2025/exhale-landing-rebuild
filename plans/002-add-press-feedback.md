# 002 — Add press feedback to the two real buttons

- **Status**: DONE
- **Note**: :active had to be placed after both :hover rules and given a light-mode selector, per step 5.
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: HIGH
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, ~10 lines added

## Problem

There is exactly one `:active` rule in 2,828 lines of CSS
(`motion/css/styles.css:2343`, on the gallery arrows). The page's two actual
buttons have none — including the primary conversion control.

```css
/* motion/css/styles.css — current, no :active anywhere for either */
.join-waitlist-btn {          /* the hero CTA, "Sign up for beta" */
    padding: 20px 48px;
    /* … */
    transition: all 0.3s;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.video-play-btn {             /* motion/css/styles.css:829 */
    /* … */
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

A button that doesn't respond on press feels like the interface didn't hear
you. This is the cheapest available improvement to how the page feels, and it
is missing from the element the whole page exists to get clicked.

## Target

`transform: scale(0.97)` on `:active`, at 160ms with the repo's ease-out token.
Subtle — between 0.95 and 0.98 — and fast, because press feedback belongs in
the 100–160ms band.

```css
/* target — add after the .join-waitlist-btn rule */
.join-waitlist-btn:active {
    transform: scale(0.97);
}

/* target — add after the .video-play-btn rule.
   This button is already centred with a translate, so the scale must be
   composed with it or the button will jump to the corner on press. */
.video-play-btn:active {
    transform: translate(-50%, -50%) scale(0.97);
}
```

The `transition` on each element must name `transform` explicitly so the press
is animated. Plan 004 replaces the `transition: all` on both of these rules; if
004 has already run, `transform 160ms var(--ease-out)` will already be present
and you only need to add the `:active` blocks.

## Repo conventions to follow

- Easing tokens are defined at `motion/css/styles.css:2114`:
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- Exemplar that already does this correctly — `motion/css/styles.css:2343`:
  ```css
  .gallery-arrow { transition: transform 160ms var(--ease-out), /* … */ ; }
  .gallery-arrow:active { transform: scale(0.92); }
  ```

## Steps

1. In `motion/css/styles.css`, find the `.join-waitlist-btn` rule. Ensure its
   `transition` includes `transform 160ms var(--ease-out)`. If the rule still
   reads `transition: all 0.3s;`, leave that to plan 004 and instead append
   `transition: transform 160ms var(--ease-out);` as the last declaration in the
   rule so it wins.
2. Immediately after that rule, add:
   ```css
   .join-waitlist-btn:active { transform: scale(0.97); }
   ```
3. Find the `.video-play-btn` rule (around line 829). Note it carries
   `transform: translate(-50%, -50%)` for centring.
4. Immediately after that rule, add:
   ```css
   .video-play-btn:active { transform: translate(-50%, -50%) scale(0.97); }
   ```
5. Verify no existing `:hover` rule on either button sets `transform` in a way
   that would beat `:active` in the cascade. If one does, place the `:active`
   rule after it.

## Boundaries

- Do NOT add press feedback to non-interactive elements (cards, panels, steps).
- Do NOT change the buttons' size, padding, colour, or radius.
- Do NOT use a scale below 0.95 — it reads as a glitch, not a press.
- Do NOT change markup.
- If `.join-waitlist-btn` or `.video-play-btn` no longer exist, STOP and report.

## Verification

- **Mechanical**: `grep -c ":active" motion/css/styles.css` returns at least `3`.
- **Feel check**: serve the page and press each button with a mouse, holding the
  button down:
  - The element must shrink *the instant the pointer goes down*, not on release.
  - The play button must shrink **in place**, centred — if it leaps to the
    top-left corner, the `translate(-50%, -50%)` was dropped from the `:active`
    transform.
  - Release and confirm it springs back within ~160ms.
  - In DevTools Animations panel at 10% playback, confirm only `transform`
    animates on press — not `box-shadow` or `backdrop-filter`.
- **Done when**: both buttons visibly depress on pointer-down, neither shifts
  position, and the effect is subtle enough that you notice its absence more
  than its presence.
