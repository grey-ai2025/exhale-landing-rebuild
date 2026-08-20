# 001 — Remove the infinite pulse from the video play button

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository (verify with `git -C motion rev-parse --short HEAD`; if it now is one, stamp it)
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, ~30 lines removed

## Problem

`.video-play-btn` runs a 3-second box-shadow loop forever, on an element the
user can click. Two things are wrong: it is ambient motion nobody asked for on
an *interactive control*, and `box-shadow` is a paint property, so every frame
of that loop repaints for as long as the page is open.

```css
/* motion/css/styles.css:829 — current (excerpt) */
.video-play-btn {
    /* … */
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 3;
    box-shadow:
        0 0 0 6px rgba(173, 251, 246, 0.08),
        0 0 30px rgba(173, 251, 246, 0.1);
    animation: btnPulse 3s ease-in-out infinite;
}
```

There is a matching light-mode loop:

```css
/* motion/css/styles.css:890 — current */
body.light-mode .video-play-btn {
    animation: btnPulseLight 3s ease-in-out infinite;
}
```

Both `@keyframes btnPulse` and `@keyframes btnPulseLight` exist solely to feed
these two declarations.

## Target

No loop. The button keeps its static shadow, its hover state, and its press
feedback (added by plan 002).

```css
/* target — motion/css/styles.css:829 */
.video-play-btn {
    /* … unchanged … */
    z-index: 3;
    box-shadow:
        0 0 0 6px rgba(173, 251, 246, 0.08),
        0 0 30px rgba(173, 251, 246, 0.1);
}
```

## Repo conventions to follow

- Ambient loops have already been removed elsewhere in this codebase for the
  same reason. The `videoGlow` / `videoGlowLight` keyframes that used to pulse
  `.video-container` were deleted; the container now gets a scroll-driven
  arrival instead (`motion/css/craft.css:88`, `@keyframes sd-wipe`).
- Keyframes are defined immediately after the rule that uses them.

## Steps

1. In `motion/css/styles.css`, delete the line
   `animation: btnPulse 3s ease-in-out infinite;` from the `.video-play-btn`
   rule (around line 851).
2. Delete the entire `@keyframes btnPulse { … }` block that follows it.
3. Delete the `body.light-mode .video-play-btn` rule whose only declaration is
   `animation: btnPulseLight 3s ease-in-out infinite;` (around line 890).
   If that rule contains other declarations, remove only the `animation` line.
4. Delete the entire `@keyframes btnPulseLight { … }` block.
5. Confirm no other selector references either keyframe:
   `grep -n "btnPulse" motion/css/styles.css` must return nothing.

## Boundaries

- Do NOT touch `.video-container` or its scroll-driven `sd-wipe` animation in
  `motion/css/craft.css`.
- Do NOT remove the static `box-shadow` on `.video-play-btn` — only the
  `animation` declarations and the now-orphaned keyframes.
- Do NOT change markup.
- Do NOT add dependencies.
- If the code you find does not match the excerpts above, STOP and report.

## Verification

- **Mechanical**: `grep -c "btnPulse" motion/css/styles.css` returns `0`.
  Brace balance is unchanged: `node -e "const s=require('fs').readFileSync('motion/css/styles.css','utf8');const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;console.log(o,c,o===c)"` prints `true`.
- **Feel check**: serve the page (`node serve.js`, then `http://localhost:4321/motion/`),
  scroll to the video section and watch the play button for ten seconds:
  - The glow ring must be completely still.
  - Hovering it still changes its appearance.
  - Toggle to light mode and confirm it is still there and still static.
- **Done when**: no `btnPulse`/`btnPulseLight` identifiers remain, the button
  renders with its shadow intact in both themes, and nothing about it moves
  until the pointer touches it.
