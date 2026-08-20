import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

/**
 * Theme lives on <html data-theme>, resolved before first paint by an inline
 * script in index.html so a light-mode visitor never sees a dark flash.
 * This hook only mirrors and mutates it.
 *
 * The resolved value matters beyond CSS: Sonner's `theme` prop defaults to
 * 'light' and does not track the OS, so it has to be handed the resolved
 * theme explicitly or toasts render light on a dark page.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || 'dark'
  )
  const [saved, setSaved] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('theme')
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Follow the system only while the visitor has not expressed a preference.
  useEffect(() => {
    if (saved) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'light' : 'dark')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [saved])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('theme', next)
        setSaved(true)
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem('theme')
    } catch {
      /* storage unavailable */
    }
    setSaved(false)
    setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  }, [])

  return { theme, saved, toggle, reset }
}
