/**
 * Shared motion vocabulary. Same values as the vanilla build — they come from
 * the animation skills, not from taste.
 */

/** Strong custom curves. Built-in easings are too weak for deliberate motion. */
export const EASE = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
} as const

/** Durations in seconds, per the skill's per-element table. */
export const DUR = {
  press: 0.16,
  tooltip: 0.18,
  dropdown: 0.22,
  modal: 0.32,
  drawer: 0.42,
  marketing: 0.6,
} as const

/**
 * Apple's spring parameterisation: bounce + duration rather than
 * mass/stiffness/damping. bounce 0 is critically damped. Reserve bounce for
 * motion a gesture carried momentum into.
 */
export const SPRING = {
  ui: { type: 'spring', bounce: 0, duration: 0.4 },
  momentum: { type: 'spring', bounce: 0.2, duration: 0.4 },
  drawer: { type: 'spring', bounce: 0.12, duration: 0.45 },
} as const

/** A flick is enough, regardless of distance travelled. */
export function shouldDismiss(distance: number, elapsedMs: number, threshold = 100) {
  const velocity = Math.abs(distance) / Math.max(elapsedMs, 1)
  return Math.abs(distance) >= threshold || velocity > 0.11
}

/** Multimodal feedback: only at meaningful moments, never as decoration. */
export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* not supported */
  }
}
