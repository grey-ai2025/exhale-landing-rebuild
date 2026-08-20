# 011 — Delete dead motion CSS

- **Status**: DONE
- **Note**: first attempt with a blunt regex damaged multi-selector rules and was reverted from backup; redone selector-aware.
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, ~120 lines removed

## Problem

Three rebuilds (pain points → scrollytelling, features grid → drag gallery,
removal of the load overlay) left behind CSS for elements that no longer exist
in `motion/index.html`. Verified counts:

| Selector | Occurrences in `index.html` | Occurrences in `styles.css` |
| --- | --- | --- |
| `.blur-overlay` | 0 | 1 |
| `.features-grid` | 0 | 15 |
| `.pain-grid` | 0 | 2 |
| `.pain-card` | 0 | ~12 |
| `.pain-icon` | 0 | 3 |

Dead motion rules are worse than dead layout rules: they include `:hover`
transforms and transitions that a future audit will keep re-flagging, and they
make it impossible to tell by reading the file which hover states are actually
live. Finding 003 in this audit had to individually rule out `.pain-card:hover`
for exactly this reason.

## Target

Every rule whose selector matches nothing in the markup is removed. The file
should contain styling only for elements that render.

## Repo conventions to follow

- Sections are delimited by banner comments:
  ```css
  /* ===========================================
     Pain Points Section
     =========================================== */
  ```
  Remove the banner along with its section when the whole section is dead.
- Newer work lives in `motion/css/scrolly.css` (The Reality) and
  `motion/css/craft.css` (line drawing, wipes). Neither contains dead rules —
  do not touch them.

## Steps

1. Build the authoritative list of dead selectors. For each candidate below,
   confirm zero matches in the markup before deleting:
   ```bash
   for c in blur-overlay features-grid pain-grid pain-card pain-icon; do
     printf "%-16s markup:%s\n" "$c" "$(grep -c "$c" motion/index.html)"
   done
   ```
   Only delete selectors reporting `markup:0`.
2. Delete the `.blur-overlay` rule (around line 111) and its banner comment.
   The element was removed when the load overlay was retired.
3. Delete the `.features-grid` rule and its five `:nth-child` grid-column
   overrides. The gallery in `motion/css/styles.css:2280` replaced them.
4. Delete `.pain-grid`, `.pain-card`, `.pain-card::before`,
   `.pain-card:hover`, `.pain-card:hover::before`, `.pain-icon`, and every
   `body.light-mode` variant of those.
5. **Do not delete `.feature-card` or `.feature-icon`** — both are still live
   (3 occurrences each in the markup) inside the gallery.
6. **Do not delete `.step` rules** — 14 occurrences, live.
7. After deleting, re-run the loop from step 1 against `styles.css` and confirm
   the dead selectors now report 0 there too.

## Boundaries

- Do NOT delete a selector without first confirming `markup:0` for it. The
  markup has been restructured several times; assumptions from memory are not
  safe.
- Do NOT touch `motion/css/scrolly.css` or `motion/css/craft.css`.
- Do NOT delete `@keyframes` blocks that other live rules still reference —
  check each with `grep -n "<keyframe-name>" motion/css/*.css` first.
- Do NOT reformat or reorder surviving rules; keep the diff to deletions.
- Do NOT change markup.

## Verification

- **Mechanical**:
  - Brace balance holds:
    `node -e "const s=require('fs').readFileSync('motion/css/styles.css','utf8');const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;console.log(o,c,o===c)"` prints `true`.
  - Each dead selector reports 0 in both files.
  - The file is meaningfully shorter (expect roughly 120 fewer lines).
- **Feel check**: this is the plan most able to break the page silently.
  Serve it and scroll the **whole** page top to bottom in both themes:
  - The Reality section: pinned canvas, four scenes swapping, icons drawing.
  - Capabilities: cards wipe in, icons draw, drag and arrows work.
  - How it works, Bespoke, the CTA, the footer — all unchanged.
  - Compare side by side against `/original/` for anything that looks off.
- **Done when**: no dead selector remains and the rendered page is pixel-identical
  to before the deletion.
