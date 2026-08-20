# 004 — Replace every `transition: all`

- **Status**: DONE
- **Commit**: n/a — `motion/` is not a git repository
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, 9 declarations

## Problem

`transition: all` animates every property that changes, including ones that
force layout and paint. It is an automatic block in review. Nine sites:

| Line | Selector | Current |
| --- | --- | --- |
| 197 | `.theme-toggle` | `transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);` |
| 212 | `.theme-toggle-track` | `transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);` |
| 229 | `.theme-toggle-thumb` | `transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);` |
| 245 | `.theme-toggle-icon` | `transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);` |
| 459 | `.input-group` | `transition: all 0.4s;` |
| 517 | (waitlist submit button) | `transition: all 0.3s;` |
| 595 | `.join-waitlist-btn` | `transition: all 0.3s;` |
| 846 | `.video-play-btn` | `transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);` |
| 1902 | `.top-nav` | `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` |

The worst offenders are `.theme-toggle` and `.top-nav`: both carry
`backdrop-filter`, which `all` will happily try to animate — re-rasterising the
backdrop every frame.

Note `.theme-toggle-thumb` animates `left` (lines 224 and 234), a layout
property. Converting it to `transform: translateX()` is out of scope for this
plan; keep `left` in the named list so behaviour does not change, and record it
as a follow-up.

## Target

Each site names only the properties that actually change.

```css
/* motion/css/styles.css:197 */
.theme-toggle { transition: transform 300ms var(--ease-out), box-shadow 300ms var(--ease-out); }

/* :212 — background and shadow swap with the theme */
.theme-toggle-track { transition: background 300ms var(--ease-out), box-shadow 300ms var(--ease-out); }

/* :229 — `left` and background swap with the theme */
.theme-toggle-thumb { transition: left 300ms var(--ease-out), background 300ms var(--ease-out); }

/* :245 — nothing on this element changes; drop the transition entirely */
.theme-toggle-icon { /* no transition */ }

/* :459 */
.input-group { transition: border-color 300ms var(--ease-out), box-shadow 300ms var(--ease-out); }

/* :517 and :595 */
.join-waitlist-btn { transition: transform 160ms var(--ease-out), background 250ms var(--ease-out), border-color 250ms var(--ease-out); }

/* :846 */
.video-play-btn { transition: transform 160ms var(--ease-out), background 250ms var(--ease-out), border-color 250ms var(--ease-out); }

/* :1902 */
.top-nav { transition: border-color 250ms var(--ease-out); }
```

Durations drop from 400ms to 300ms on the toggle and to 160ms for press
feedback, which is the correct band for a press (100–160ms). `.top-nav` only
ever changes `border-color` on hover — see `motion/css/styles.css:1904`.

## Repo conventions to follow

- Easing token at `motion/css/styles.css:2114`:
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
  Use the token; do not paste the raw curve, and do not keep the old
  `cubic-bezier(0.4, 0, 0.2, 1)` (Material's curve, weaker than this repo's).
- Exemplar — `motion/css/styles.css:2337`:
  ```css
  .gallery-arrow {
      transition: transform 160ms var(--ease-out), opacity 200ms ease,
                  color 200ms ease, border-color 200ms ease;
  }
  ```

## Steps

1. For each of the nine lines in the table, open the enclosing rule and list
   every property that any other rule changes on that selector — check
   `:hover`, `:active`, `body.light-mode`, and any `.is-*` state class.
2. Replace the `transition: all …` declaration with an explicit list covering
   exactly those properties, using the target values above.
3. For `.theme-toggle-icon` (line 245), confirm nothing changes on it — the
   icons are swapped with `display: none`, which is not animatable. Delete the
   `transition` declaration entirely.
4. Re-run `grep -n "transition: all" motion/css/styles.css`; it must return
   nothing.

## Boundaries

- Do NOT convert `.theme-toggle-thumb`'s `left` to a transform in this plan.
  Keep `left` in the named list and open a follow-up; changing the mechanism
  risks breaking the toggle's geometry.
- Do NOT add properties to the list that nothing changes — an unused entry is
  dead code, not safety.
- Do NOT touch `motion/css/craft.css` or `motion/css/scrolly.css`; neither
  contains `transition: all`.
- Do NOT change markup.
- If a rule's current text differs from the table, STOP and report.

## Verification

- **Mechanical**: `grep -c "transition: all" motion/css/styles.css` returns `0`.
  Brace balance unchanged.
- **Feel check**: serve the page and exercise each affected control:
  - Click the theme toggle repeatedly. The thumb must still slide, the track
    must still change colour, and the glass panel behind the toggle must NOT
    visibly re-blur or flicker during the change.
  - Hover the top-nav pill. Only its border should change; the blur must be
    rock steady.
  - Hover and press the hero CTA and the play button — both must still respond.
  - In DevTools Animations panel at 10% playback, confirm no `backdrop-filter`
    entry appears for the toggle or nav.
- **Done when**: no `transition: all` remains, every control behaves as before,
  and the two glass surfaces no longer shimmer during state changes.
