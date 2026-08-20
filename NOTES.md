# Exhale landing page — Apple-style rebuild (prototype)

Standalone prototype of the `exhale-onboarding` landing page. Nothing here touches the
real project; port it when you're happy with it.

> **Layout note:** this folder now holds three versions side by side.
> `original/` (pristine copy of the live page), `motion/` (working copy for the
> scroll/section work, same fonts and colours), and `apple/` (the ground-up
> reimagining this document describes). Everything below refers to `apple/`.

## Preview

```bash
node serve.js       # http://localhost:4321  -> version switchboard
```

Zero dependencies. `serve.js` mirrors `vercel.json`'s `cleanUrls` so `/faqs`-style links
behave the same locally.

## What's in here

```
index.html              the page
css/landing.css         all styles, self-contained
js/landing.js           behaviour, no dependencies
js/analytics.js         copied verbatim from the live site
js/section-analytics.js copied verbatim from the live site
assets/images/          favicon + logo, copied from the live site
serve.js                local preview server (not for production)
```

## Porting to exhale-onboarding

The rebuild deliberately shares **nothing** with `css/styles.css`, because that file is
also used by `faqs`, `privacy`, `terms`, `trustandsafety`, `onboarding`, `dashboard`,
`beta-gate` and `welcome-back`. Editing it to suit the landing page would restyle all of
them.

1. Copy `css/landing.css` → `public/css/landing.css`
2. Copy `js/landing.js` → `public/js/landing.js`
3. Replace `public/index.html` with `index.html`
4. Don't copy `js/analytics.js`, `js/section-analytics.js` or `assets/` — the originals
   are already there and unchanged.
5. Don't copy `serve.js`.

`public/css/styles.css` and `public/js/main.js` stay exactly as they are, still serving
the other eight pages.

### Preserved integrations

| Thing | Status |
| --- | --- |
| Typeform live embed `01KCSRGA2N1VAMCM729CFEZPKZ` | unchanged, same inline embed |
| GA4 + per-section tracking | unchanged; every `<section id>` and `data-ga-name` kept |
| Cloudinary product video | unchanged URLs |
| `/onboarding` beta sign-in | in the nav and the footer |
| Footer legal links (Google OAuth verification) | privacy, terms, trust & safety, FAQs |

Section ids are identical to the current page — `hero`, `video`, `pain-points`,
`features`, `how-it-works`, `bespoke`, `typeform-section` — so the GA4 section funnel
keeps reporting against the same rows. `hero`, `pain-points`, `features`,
`how-it-works` and `bespoke` gained explicit `data-ga-name` labels, which only changes
their display name in GA4, not their path.

## Design decisions

**Type.** System font first (`-apple-system` → SF Pro on Apple hardware, where it brings
real optical sizing and tracking tables), Inter as the cross-platform fallback. Tracking
is size-specific rather than one global value: negative on large headings, near zero on
body, slightly open on small uppercase. Cormorant Garamond is gone — if you want the
serif back for brand warmth, the smallest version of that change is a `--font-display`
variable used only by `.section-title`, `.bespoke-title` and `.hero-tagline`.

**Colour.** One accent, used sparingly — teal, carried over from the existing cyan. The
gold is gone; two accent colours plus glass plus glow was competing with the content.
Neutrals are Apple's own values (`#1d1d1f`, `#fbfbfd`, `#f5f5f7`) because they're tuned
for exactly this.

**Appearance.** Follows the system by default, with a toggle in the nav that persists a
manual override. Resolved by an inline script before first paint, so a light-mode
visitor never sees a dark flash.

**Motion.** Springs where a gesture is involved, custom-curve CSS transitions everywhere
else, and nothing over ~700ms outside the marketing reveals. Specifics:

- The 1.5s full-screen blur-in on page load is gone. It delayed first meaningful paint
  by 800ms and then spent another 1500ms un-blurring, which is latency dressed as
  polish. The hero now staggers in over ~500ms total.
- The cursor-glow layer is gone — a permanent `requestAnimationFrame` loop for a
  decorative effect nobody was interacting with.
- Every pressable element has `:active { transform: scale(0.97) }` at 160ms.
- Hover effects are gated behind `@media (hover: hover) and (pointer: fine)` so a tap on
  a phone doesn't leave a card stuck in its hover state.
- Reveals stagger 60–70ms inside a group.

**The capabilities gallery** is the one genuinely interactive piece, and it's where the
fluid-interface principles actually show up:

- Native scrolling on touch — the OS already does momentum and rubber-banding better
  than script can.
- Mouse drag on desktop, where the platform gives you nothing: 1:1 tracking via Pointer
  Events with capture, a velocity history rather than a single delta, momentum
  projection (`(v/1000)·d/(1−d)`, d = 0.998) so a flick lands where it was *going*, and
  a critically damped spring that takes the release velocity as its initial velocity, so
  there's no seam between dragging and animating.
- Progressive rubber-band resistance past either end instead of a hard stop.
- Arrows, dots, and arrow-key support, because a drag-only control isn't operable by
  everyone.

**Layout changes** (copy is unchanged throughout):

- The 4th pain point ("No Infrastructure at Home") is much longer than the other three
  and was distorting a 2×2 grid. It's now a full-width card below a 3-up row, with its
  closing line promoted to lead weight.
- The three capability cards became a horizontal gallery, and their example questions
  are rendered as message bubbles — they're things you'd send to an assistant, so they
  should look like it.
- "How it works" gained a connecting rail that draws as each step reveals.
- The CTA's "Free while in beta" and "Sign up for the beta" merged into one line.

**Accessibility.** `prefers-reduced-motion` (cross-fades, no positional movement),
`prefers-reduced-transparency` (solid nav, no blooms), and
`prefers-contrast: more` (solid surfaces, stronger hairlines) are all handled. Skip link,
focus-visible rings, labelled controls, and tertiary text lifted to clear 4.5:1 in both
themes.

## Glass and morph

The `apple-design` skill is built on *Designing Fluid Interfaces* (WWDC 2018), so its
materials guidance is the frosted-glass era — blur, saturate, content scrolling under.
Liquid Glass (WWDC 2025, iOS 26) adds refraction, a specular edge, and controls that morph
rather than cross-fade. Two of those three are here.

**Material.** `--glass-tint` + `blur(18px) saturate(180%)`, an inset top line for the edge
catching light, and a masked 1px gradient border as the specular rim — brighter where light
would land, falling off around the curve. Applied to **chrome only**: the nav, the film
control, the secondary button, the gallery arrows. Cards and the Typeform panel stay solid,
which is both how Apple uses it and what stops translucency stacking on translucency.

True refraction (`feDisplacementMap` or a WebGL layer) is deliberately not here — real
frame-rate cost, unreliable in Safari, and it buys the least per unit of risk.

Worth knowing: Apple walked the effect back during the iOS 26 betas after legibility
complaints. `prefers-reduced-transparency` turns every glass surface solid here, and
`prefers-contrast: more` drops the rim for a defined border.

**Morph.** The View Transitions API drives the sign-up control into the CTA panel — the nav
button and the hero button both carry `view-transition-name: cta-morph`, handed to
`.typeform-shell` inside the transition callback. The root cross-fade is disabled so only
that one element animates, 480ms on the project's `--ease-out`, with 1.5px of blur bridging
the two states. Focus follows to the panel. Browsers without the API get the plain anchor
jump, as does anyone on reduced motion.

## Review pass

Findings from `/review-animations`, applied:

- Nav material was transitioning `backdrop-filter`, which re-rasterises the backdrop every
  frame and doesn't interpolate from `none` at all. The blur now lives on an always-built
  `.nav::before` layer whose **opacity** animates instead.
- Gallery dots animated `width` — a layout property that reflowed every sibling dot per
  frame. They're now fixed-width with an inner pill on `transform: scaleX()`.
- The two hero blooms drifted on infinite 26s/34s keyframes while permanently
  `will-change`-promoted. A 2.5rem translation on a 90px-blurred blob is imperceptible, so
  the motion is gone and the gradients are static.
- Pain cards lifted 3px on hover despite not being clickable — a false affordance. Removed;
  the background/border tint stays, at 200ms rather than 320ms.
- Arrow and dot clicks stopped an in-flight spring and restarted it at zero velocity. They
  now `retarget` the running spring, so pressing twice quickly stays continuous. Gesture
  releases still start a fresh spring carrying the release velocity.
- Nav stuck-state gained hysteresis (on above 24px, off below 8px) so scrolling around the
  threshold can't thrash the material fade.
- `filter` was missing from the button transition list, so the primary button's hover
  brightness snapped while every neighbouring hover eased.

Deliberately left alone until the page has been seen moving: reveal durations (620ms and
700ms) and the theme-swap timing mismatch between body, cards and nav links.

## Known gaps

- **Not viewed in a browser yet.** Written and syntax-checked, not visually reviewed —
  expect small spacing and rhythm corrections on first look.
- **No video poster frame.** The film pops in when Cloudinary responds. A poster image
  would fix the flash of empty frame; there isn't one in the repo.
- The `.mp4` source was declared `type="video/quicktime"` on the live site, which Chrome
  can refuse. It's `video/mp4` here, with the WebM listed first.
