# Exhale landing page — rebuild workspace

Four parallel rebuilds of the [Exhale](https://exhale.bot) landing page, kept
side by side so they can be compared directly. The production project
(`exhale-onboarding`) is **not** touched by anything here.

## Preview

```bash
node serve.js       # http://localhost:4321
```

Zero dependencies for the vanilla builds. The root page is a switchboard.

| Path | What it is |
| --- | --- |
| `original/` | Byte-identical copy of the live page. Reference — do not edit. |
| `motion/` | The working copy. Same fonts, colours and copy as the original; only scroll effects and section composition changed. |
| `apple/` | Ground-up reimagining. Vanilla + [Motion](https://motion.dev) as a UMD bundle, no build step. |
| `apple/lab/` | Twelve motion techniques isolated and interactive, each with its recipe values. |
| `react/` | Built output of `react-app/`. |
| `react-app/` | Vite + React 19 source, on Base UI, Sonner, cmdk, NumberFlow and Motion. |
| `plans/` | Eleven animation audit plans, all executed. |

## Building the React app

```bash
cd react-app
npm install
npm run build      # outputs to ../react/ with base /react/
```

The built output in `react/` is committed, because it is the deployable
artifact and there is no CI to regenerate it.

## What was changed, and why

Each build documents its own reasoning inline:

- `NOTES.md` — the design decisions behind `apple/`, plus a porting checklist
  for moving anything into the production project.
- `plans/README.md` — the animation audit, its findings, and the execution
  order, including two traps that recurred repeatedly (the `view()`
  scroll-container capture, and `entry`-bound ranges finishing off-screen).
- Comments in the stylesheets carry the specific values and the rule each one
  comes from.

## Notes

Copy throughout is lifted verbatim from the live site; the FAQ content comes
from `/faqs`. The mock UI inside the scrollytelling section (inbox rows,
calendar conflicts) is invented for illustration and is not real data.

Third-party endpoints referenced in the copied client code — the Typeform
embed, the Cloudinary video, the GA4 measurement ID and the n8n form webhook —
are the same ones already public in the live site's client-side JavaScript.
