# 005 — Use the easing token on the page's main reveal

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: MEDIUM
- **Category**: Easing & tokens
- **Estimated scope**: 1 file, 2 lines

## Problem

The reveal that governs all 13 `.reveal` elements uses the **built-in**
`ease-out`, while a stronger token is defined 460 lines further down and used
everywhere else.

```css
/* motion/css/styles.css:1649 — current */
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

```css
/* motion/css/styles.css:2114 — the token that exists but isn't used here */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```

Built-in CSS easings are too weak for deliberate animation — they lack the
early acceleration that makes motion feel intentional. This transition is the
fallback path for Firefox and for reduced-motion users, so it is what a real
slice of visitors actually sees.

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

(`will-change` is removed here by plan 009 — if 009 has already run, it will
already be gone. Do not re-add it.)

## Repo conventions to follow

- The token block at `motion/css/styles.css:2113`:
  ```css
  :root {
      --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
      --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
      --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  }
  ```
- Exemplar — `motion/css/styles.css:1424` already does this:
  ```css
  transition: opacity 0.6s var(--ease-out),
              transform 0.6s var(--ease-out),
              filter 0.6s var(--ease-out);
  ```

## Steps

1. Move the `:root` token block from line ~2113 to the **top** of
   `motion/css/styles.css`, immediately after the existing `:root` block that
   starts at line 6. A custom property must be declared before it is used in
   source order for the value to resolve on first paint in all engines; today
   it happens to work because both are on `:root`, but the ordering is fragile.
   Keep the declarations byte-identical.
2. In the `.reveal` rule at line ~1649, replace both occurrences of `ease-out`
   with `var(--ease-out)`.
3. Search for other built-in easings on deliberate animations:
   `grep -n "0\.[3-9]s ease-out\|0\.[3-9]s ease-in-out" motion/css/styles.css`.
   Replace any hit on a `.reveal`-family selector with the token. Leave short
   colour transitions using plain `ease` alone — `ease` is correct for colour.

## Boundaries

- Do NOT change the 0.6s duration. This is marketing motion; the duration is
  deliberate and outside the sub-300ms UI rule.
- Do NOT change the 40px travel distance.
- Do NOT alter the scroll-driven `@supports` block — it uses `linear` on
  purpose, because scroll position supplies the easing.
- Do NOT touch `motion/css/craft.css` or `motion/css/scrolly.css`.
- If the `:root` token block is already at the top of the file, skip step 1.

## Verification

- **Mechanical**: `grep -n "0.6s ease-out" motion/css/styles.css` returns
  nothing. `grep -c "var(--ease-out)" motion/css/styles.css` increases by 2.
- **Feel check**: open the page in **Firefox** (which lacks scroll-driven
  animations, so it takes this exact code path) and scroll slowly:
  - Elements should move fastest at the very start and glide to a stop, rather
    than easing off gently from the beginning.
  - Compare against Chrome — the two should feel like the same page.
  - In DevTools, set `prefers-reduced-motion: reduce` and confirm elements
    still appear (they fade, they do not slide).
- **Done when**: the fallback reveal uses the token and Firefox and Chrome feel
  consistent.
