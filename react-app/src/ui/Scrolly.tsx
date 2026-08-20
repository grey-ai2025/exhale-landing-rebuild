import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Pinned canvas, scrolling copy.
 *
 * The visual stays put while the explanations move past it, so each point gets
 * its own frame instead of four identical cards in a grid.
 *
 * Two things this depends on and neither is obvious:
 *
 * 1. A sticky element can only travel as far as its parent is tall. Both grid
 *    columns must stretch to the row height — `align-items: start` collapses
 *    the media column to the canvas height and the pin lasts zero pixels.
 *
 * 2. The active step is decided by a zero-height band across the middle of the
 *    viewport (`rootMargin: '-50% 0px -50% 0px'`), not by plain visibility.
 *    That keeps the pinned visual in sync with the sentence being read; an
 *    "is it on screen" test switches far too early.
 */
export function useActiveStep(count: number) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const i = refs.current.indexOf(entry.target as HTMLElement)
          if (i !== -1) setActive(i)
        })
      },
      // Collapses the root to a line at the vertical centre.
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    )

    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [count])

  const setRef = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el
  }

  return { active, setRef }
}

export function Scrolly({
  scenes,
  steps,
}: {
  scenes: { icon: ReactNode; title: string; badge: string; badgeTone?: 'warn'; body: ReactNode }[]
  steps: { h: string; p: ReactNode }[]
}) {
  const { active, setRef } = useActiveStep(steps.length)

  return (
    <div className="scrolly">
      <div className="scrolly-media">
        <div className="scrolly-canvas">
          {scenes.map((scene, i) => (
            <div
              key={scene.title}
              className="scene"
              /* Everything already read stays on screen, receded — it does not
                 vanish, so the stack reads as a deck you are moving through. */
              data-state={i === active ? 'active' : i < active ? 'past' : 'upcoming'}
            >
              <div className="mock">
                <div className="mock-bar">
                  <span className="scene-icon">{scene.icon}</span>
                  <span className="mock-bar-title">{scene.title}</span>
                  <span className="mock-badge" data-tone={scene.badgeTone}>{scene.badge}</span>
                </div>
                {scene.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="scrolly-copy">
        {steps.map((step, i) => (
          <article
            key={step.h}
            ref={setRef(i)}
            className="scrolly-step"
            data-active={i === active || undefined}
          >
            <h3>{step.h}</h3>
            <p>{step.p}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
