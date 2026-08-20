import { toast } from 'sonner'

/**
 * Headless Sonner.
 *
 * The styling ladder says: climb only as far as the change requires, and if
 * you find yourself marking more than a few things `!important` to beat
 * Sonner's injected styles, stop and go headless. This design's toast is a
 * glass pill that shares nothing with the default shell, so `toast.custom()`
 * is the right rung — it keeps Sonner's positioning, stacking and swipe while
 * the markup is entirely ours.
 *
 * Wrapped in our own function so call sites never touch Sonner's API directly.
 */
export function notify(message: string, opts?: { tone?: 'default' | 'accent' }) {
  return toast.custom(
    () => (
      <div className="toast" data-tone={opts?.tone ?? 'default'}>
        <span className="toast-dot" aria-hidden="true" />
        <span className="toast-text">{message}</span>
      </div>
    ),
    { duration: 4000 }
  )
}
