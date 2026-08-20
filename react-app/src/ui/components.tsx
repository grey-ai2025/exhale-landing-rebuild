import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '@base-ui/react/tooltip'
import { Popover } from '@base-ui/react/popover'
import { Accordion } from '@base-ui/react/accordion'
import { Drawer } from '@base-ui/react/drawer'
import { Command } from 'cmdk'
import { motion, useReducedMotion } from 'motion/react'
import { EASE, SPRING, haptic } from './motion-tokens'
import { notify } from './notify'

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* Base UI's Provider owns the delay grouping: the first tooltip waits, */
/* neighbours open instantly. That is the behaviour the craft bar asks  */
/* for, and it is a solved problem — hand-rolling it is how you end up  */
/* without focus handling.                                              */
/* ------------------------------------------------------------------ */
export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<span className="tip-trigger" />}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="tooltip">{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/* ------------------------------------------------------------------ */
/* Hold to confirm                                                     */
/* Asymmetric on purpose: 2s linear on the press because a progress    */
/* fill should not ease, 200ms ease-out on release.                    */
/* ------------------------------------------------------------------ */
export function HoldToConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | null>(null)

  const start = () => {
    setHolding(true)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      haptic([12, 40, 18])
      onConfirm()
    }, 2000)
  }
  const cancel = () => {
    setHolding(false)
    if (timer.current) window.clearTimeout(timer.current)
  }

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  return (
    <button
      type="button"
      className="hold-btn"
      data-holding={holding || undefined}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      // Holding a key is not a gesture; keyboard users get a confirm instead
      // of an unreachable action.
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (window.confirm('Reset saved preferences?')) onConfirm()
        }
      }}
    >
      <span className="hold-fill" aria-hidden="true" />
      <span className="hold-label">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Preferences popover                                                 */
/* Base UI sets --transform-origin on the popup for us, so the panel    */
/* scales out of its trigger rather than its own centre.                */
/* ------------------------------------------------------------------ */
export function PrefsPopover({
  theme, saved, onReset,
}: { theme: string; saved: boolean; onReset: () => void }) {
  const reduced = useReducedMotion()

  return (
    <Popover.Root>
      <Popover.Trigger render={<button type="button" className="icon-btn" aria-label="Preferences" />}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h8M16 18h4" />
          <circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="14" cy="18" r="2" />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end">
          <Popover.Popup className="popover">
            <p className="popover-title">Preferences</p>
            <div className="popover-row"><span>Appearance</span><span>{saved ? theme : 'System'}</span></div>
            <div className="popover-row"><span>Motion</span><span>{reduced ? 'Reduced' : 'Full'}</span></div>
            <div className="popover-row">
              <span>Saved locally</span>
              <HoldToConfirm
                label="Hold to reset"
                onConfirm={() => { onReset(); notify('Saved preferences cleared') }}
              />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ------------------------------------------------------------------ */
/* Sign-up drawer                                                      */
/* Base UI's Drawer brings the swipe area, focus trap, scroll lock and  */
/* dismissal physics. This is what "don't hand-roll the component"      */
/* buys you — the embed is loaded lazily, only when it is asked for.    */
/* ------------------------------------------------------------------ */
export function SignupDrawer({ trigger }: { trigger: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [ready, setReady] = useState(false)

  const load = () => {
    if (loaded) return
    setLoaded(true)
    const s = document.createElement('script')
    s.src = 'https://embed.typeform.com/next/embed.js'
    s.onload = () => window.setTimeout(() => setReady(true), 400)
    s.onerror = () => setReady(true)
    document.head.appendChild(s)
  }

  return (
    <Drawer.Root>
      <Drawer.Trigger render={trigger as React.ReactElement} onClick={load} />
      <Drawer.Portal>
        <Drawer.Backdrop className="drawer-backdrop" />
        <Drawer.Popup className="drawer-sheet">
          <Drawer.SwipeArea className="drawer-handle" />
          <div className="drawer-head">
            <Drawer.Title className="drawer-title">Sign up for the beta</Drawer.Title>
            <Drawer.Description className="drawer-sub">
              Free while in beta. Swipe down or press Escape to close.
            </Drawer.Description>
          </div>
          <div className="drawer-body">
            {!ready && (
              <div className="skeleton" style={{ padding: '1.25rem' }}>
                <div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line" />
              </div>
            )}
            <div hidden={!ready}>
              <div data-tf-live="01KCSRGA2N1VAMCM729CFEZPKZ" />
            </div>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion.Root className="acc">
      {items.map((item) => (
        <Accordion.Item key={item.q} className="acc-item">
          <Accordion.Header>
            <Accordion.Trigger className="acc-trigger">
              {item.q}
              <span className="acc-icon" aria-hidden="true" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="acc-panel">
            <p>{item.a}</p>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

/* ------------------------------------------------------------------ */
/* Command menu                                                        */
/*                                                                     */
/* Deliberately unanimated. A command palette is opened by keyboard,    */
/* potentially hundreds of times a day, and the frequency rule is not a */
/* judgment call: keyboard-initiated actions at that frequency get no   */
/* animation, ever. Raycast has none, and that is the correct answer.   */
/* Everything else on this page animates; this is the one that must not.*/
/* ------------------------------------------------------------------ */
export function CommandMenu({ onNavigate, onSignup, onToggleTheme }: {
  onNavigate: (id: string) => void
  onSignup: () => void
  onToggleTheme: () => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command menu" className="cmdk">
      <Command.Input placeholder="Jump to, or run a command…" />
      <Command.List>
        <Command.Empty>Nothing matches.</Command.Empty>
        <Command.Group heading="Go to">
          {[
            ['The reality', 'pain-points'],
            ['Capabilities', 'features'],
            ['How it works', 'how-it-works'],
            ['Questions', 'faq'],
          ].map(([label, id]) => (
            <Command.Item key={id} onSelect={() => { onNavigate(id); setOpen(false) }}>
              {label}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Actions">
          <Command.Item onSelect={() => { onSignup(); setOpen(false) }}>Sign up for the beta</Command.Item>
          <Command.Item onSelect={() => { onToggleTheme(); setOpen(false) }}>Switch appearance</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Reveal                                                              */
/* Full transform strings, not the x/y/scale shorthands — those are not */
/* hardware accelerated and drop frames while the page is busy.         */
/* ------------------------------------------------------------------ */
export function Reveal({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reduced = useReducedMotion()

  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: 'translateY(16px)' }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ amount: 0.15, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.55, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  )
}

export { SPRING }
