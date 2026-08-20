import { useRef, type ReactNode } from 'react'
import { useInView } from 'motion/react'

export type Capability = { h: string; p: string; asks: string[]; icon: ReactNode }

/**
 * Capabilities.
 *
 * Three cards fit side by side on a desktop viewport, so they are a grid.
 * They only need to scroll when the viewport is too narrow to hold them, and
 * there the platform's own snap scrolling is better than anything script can
 * add — touch already carries momentum and rubber-banding.
 *
 * There are deliberately no dots and no arrows. With three cards the total
 * travel on a desktop viewport measured 136px; a control that navigates 136px
 * is clutter dressed as an affordance. Below the breakpoint you swipe, which
 * needs no chrome either.
 *
 * The drag-with-momentum implementation this replaced still exists where it
 * earns its place: the flick-to-dismiss card below, and the motion lab.
 */
export function Gallery({ items }: { items: Capability[] }) {
  const wrap = useRef<HTMLDivElement>(null)

  /* Cards are uncovered rather than faded in — the skill's scroll-reveal
     recipe. Class-driven, not a scroll timeline: the rail is a scroll
     container below the breakpoint, and a scroll container captures any
     view() timeline beneath it. */
  const inView = useInView(wrap, { amount: 0.15, margin: '0px 0px -15% 0px' })

  return (
    <div className="gallery" ref={wrap} data-revealed={inView || undefined}>
      <div className="gallery-track">
        {items.map((c) => (
          <article className="feature" key={c.h}>
            <span className="card-icon" aria-hidden="true">{c.icon}</span>
            <h3>{c.h}</h3>
            <p>{c.p}</p>
            <ul className="asks">{c.asks.map((a) => <li key={a}>{a}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  )
}
