import { useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { Tooltip } from '@base-ui/react/tooltip'
import { motion, useReducedMotion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import {
  Tip, PrefsPopover, SignupDrawer, Faq, CommandMenu, Reveal,
} from './ui/components'
import { Scrolly } from './ui/Scrolly'
import { Gallery } from './ui/Gallery'
import { EASE, SPRING, shouldDismiss, haptic } from './ui/motion-tokens'
import { useTheme } from './ui/useTheme'
import { notify } from './ui/notify'

/* Copy lifted verbatim from the live site. */
const REALITY_STEPS = [
  { h: 'Email Overload', p: 'Newsletters, vet appointments, caregiver updates, event invitations, board communications. Critical information buried in an endless stream of messages from teachers, coaches, doctors, and committee members.' },
  { h: 'Calendar Chaos', p: 'Multiple kids, aging parents, grooming schedules, galas, board meetings. One missed update means a scramble to rearrange your day or not being present when it matters most — at home and at work.' },
  { h: 'Mental Load', p: '“Is there school tomorrow?” “When’s Dad’s cardiology appointment?” “Did we confirm the speaker for the fundraiser?” Questions that interrupt your focus and fragment your day.' },
  { h: 'No Infrastructure at Home', p: 'You have EAs, project managers, and systems keeping your professional life on track. But your personal life — just as complex, just as consequential — runs on memory and group texts.' },
]

/* The pinned visuals. Built from divs and text — no image assets, and they
   inherit the palette, so they restyle with the theme for free. */
const REALITY_SCENES = [
  {
    title: 'Inbox',
    badge: '247 unread',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M21 7L12 13.2 3 7" />
      </svg>
    ),
    body: (
      <ul className="mock-list">
        <li><span className="mock-from">Oakwood Elementary</span><span className="mock-subject">Spring newsletter — 14 updates inside</span></li>
        <li><span className="mock-from">PTA Committee</span><span className="mock-subject">Re: Re: Re: volunteer slots</span></li>
        <li data-flagged><span className="mock-from">Dr. Levin’s office</span><span className="mock-subject">Appointment moved to Thursday 9:15</span></li>
        <li><span className="mock-from">Riverside Vet</span><span className="mock-subject">Your reminder: annual vaccination</span></li>
        <li><span className="mock-from">Board secretary</span><span className="mock-subject">Papers for Tuesday</span></li>
      </ul>
    ),
  },
  {
    title: 'Thursday',
    badge: '3 conflicts',
    badgeTone: 'warn' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" />
      </svg>
    ),
    body: (
      <div className="mock-body">
        <div className="mock-grid">
          <span className="mock-hour">2 PM</span><span className="mock-line" />
          <span className="mock-hour">3 PM</span><span className="mock-line" />
          <span className="mock-hour">4 PM</span><span className="mock-line" />
          <span className="mock-hour">5 PM</span><span className="mock-line" />
        </div>
        <div className="mock-event" data-n="1">Board call</div>
        <div className="mock-event" data-n="2">Pickup — Maya</div>
        <div className="mock-event" data-n="3">Dad: cardiology</div>
      </div>
    ),
  },
  {
    title: 'Tonight',
    badge: '3 open loops',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M12 2.5a8 8 0 0 1 8 8c0 5.25-8 11.5-8 11.5S4 15.75 4 10.5a8 8 0 0 1 8-8z" /><circle cx="12" cy="10.2" r="2.8" />
      </svg>
    ),
    body: (
      <div className="mock-body mock-night-body">
        <div className="mock-clock">3:47<span>AM</span></div>
        <div className="mock-thoughts">
          <span>Is there school tomorrow?</span>
          <span>When’s Dad’s cardiology appointment?</span>
          <span>Did we confirm the speaker?</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Support systems',
    badge: '1 gap',
    badgeTone: 'warn' as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="12" cy="12" r="9.2" /><path d="M12 6.4V12l4 2.2" />
      </svg>
    ),
    body: (
      <div className="mock-body mock-split-body">
        <div className="mock-col">
          <span className="mock-col-label">Work</span>
          <span className="mock-chip">Executive assistant</span>
          <span className="mock-chip">Project manager</span>
          <span className="mock-chip">Ops systems</span>
          <span className="mock-chip">Reporting</span>
        </div>
        <div className="mock-col">
          <span className="mock-col-label">Home</span>
          <span className="mock-chip" data-empty>Group texts</span>
          <span className="mock-gap">—</span>
        </div>
      </div>
    ),
  },
]

const ICONS = {
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" pathLength={100} />
      <path d="M21 7L12 13.2 3 7" pathLength={100} />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" pathLength={100} />
      <path d="M14 2.5V8h5.5" pathLength={100} />
      <path d="M8 13.2h8M8 16.8h5.5" pathLength={100} />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11.6l2.8 2.8L21.5 4.6" pathLength={100} />
      <path d="M20.5 12.4V19a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h10.2" pathLength={100} />
    </svg>
  ),
}

const CAPABILITIES = [
  {
    icon: ICONS.mail,
    h: 'Smart Email Search',
    p: 'All your emails indexed and searchable. Find that trust update, gala invitation, or vet bill in seconds.',
    asks: ['What did the estate attorney send about the trust update?', 'What are the rules for the gala silent auction?', 'When is the cat’s next vet appointment?'],
  },
  {
    icon: ICONS.doc,
    h: 'Daily Briefings & Life Tracking',
    p: 'Start each day knowing exactly what’s happening — events, deadlines, school closures, care schedules, and action items delivered on demand.',
    asks: ['What do I need to know today?', 'Does Dad’s home aide schedule conflict with his specialist appointment?', 'What is due to the board committee this week?'],
  },
  {
    icon: ICONS.check,
    h: 'Task & Calendar Management',
    p: 'Create events, set reminders, and send quick updates through natural conversation. Never forget to confirm a guest list, follow up with a care coordinator, or update the nanny.',
    asks: ['Add the donor reception to the calendar', 'Remind me to call Dad’s care coordinator', 'Text Charles I’m running late from the benefit dinner'],
  },
]

const STEPS = [
  { h: 'We map your world together', p: 'You set up a few simple automations so your important emails and updates flow to one central place. We take it from there — connecting your communication channels and configuring Exhale around your life.' },
  { h: 'Ask anything, anytime', p: 'Message Exhale like you’d text a trusted assistant. Plain language questions get instant answers pulled from your own information — emails, schedules, and websites all in one place.' },
  { h: 'We keep it running', p: 'Your life changes — new schools, new caregivers, new commitments. We update Exhale continuously so it always reflects how you actually live. You never manage the system. We do.' },
]

const FAQS = [
  { q: 'Google says the app isn’t verified. Should I be worried?', a: 'No. Exhale is in Google’s verification review, which takes several weeks for any app that reads email. Until it clears, Google shows a caution screen for apps it hasn’t finished reviewing — it reflects our review status, not anything about your account’s safety. Choose Advanced, then Continue. You can disconnect at any time from your Google account settings.' },
  { q: 'What can Exhale actually see within my inbox?', a: 'Only the Gmail labels you pick during setup. You choose them, and you can change them whenever you like. Exhale doesn’t read the rest of your inbox.' },
  { q: 'Can Exhale send an email as me?', a: 'No. Exhale’s access to Gmail is read-only. It cannot send, reply, delete, or change a single message.' },
  { q: 'Do you use my family’s data to train AI models?', a: 'No. Your email and calendar data is used to run your assistant and nothing else. We don’t sell it, we don’t share it for advertising, and we don’t train models on it.' },
  { q: 'What does it cost?', a: 'Nothing while we’re in beta. If that changes, you’ll hear it from us before it happens, not from a charge.' },
  { q: 'Do I need Gmail?', a: 'Yes, for now. Exhale connects to Gmail and Google Calendar. Other providers aren’t supported yet.' },
  { q: 'How do I disconnect?', a: 'Revoke Exhale from your Google account settings, or email us and we’ll do it. Access stops immediately.' },
]

/* ------------------------------------------------------------------ */
/* A card you can flick away — velocity decides, not distance          */
/* ------------------------------------------------------------------ */
function DismissDemo() {
  const [gone, setGone] = useState(false)
  const [velocity, setVelocity] = useState(0)
  const start = useRef(0)

  const readout = (
    <p className="readout">
      velocity <NumberFlow value={Number(velocity.toFixed(3))} /> {velocity > 0.11 ? "— a flick" : "— a drag"}
    </p>
  )

  if (gone) {
    return (
      <>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setGone(false)}>
          Bring it back
        </button>
        {readout}
      </>
    )
  }

  return (
    <>
    <motion.div
      className="dismiss-card"
      drag="x"
      dragElastic={0.35}
      dragSnapToOrigin
      onDragStart={() => { start.current = performance.now() }}
      onDragEnd={(_, info) => {
        const elapsed = performance.now() - start.current
        setVelocity(Math.abs(info.offset.x) / Math.max(elapsed, 1))
        if (shouldDismiss(info.offset.x, elapsed, 120)) {
          haptic()
          setGone(true)
          notify('Dismissed — a flick was enough')
        }
      }}
      transition={SPRING.ui}
      whileDrag={{ cursor: 'grabbing' }}
    >
      Flick me sideways
    </motion.div>
    {readout}
    </>
  )
}

/* ------------------------------------------------------------------ */
export default function App() {
  const { theme, saved, toggle, reset } = useTheme()
  const reduced = useReducedMotion()
  const signupRef = useRef<HTMLButtonElement>(null)

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })

  return (
    /* One provider, one Toaster, both at the root. A second Toaster would
       duplicate every toast; a per-section one would unmount and lose them. */
    <Tooltip.Provider delay={400} closeDelay={200}>
      <Toaster
        position="bottom-center"
        /* Sonner's theme defaults to 'light' and does not track the OS. It has
           to be handed the resolved theme or toasts render light on a dark page. */
        theme={theme}
      />

      <CommandMenu
        onNavigate={scrollTo}
        onSignup={() => signupRef.current?.click()}
        onToggleTheme={toggle}
      />

      <header className="nav is-stuck">
        <div className="nav-inner">
          <a className="nav-brand" href="#hero"><span className="wordmark">EXHALE</span></a>
          <nav className="nav-links" aria-label="Primary">
            <button type="button" onClick={() => scrollTo('pain-points')}>The reality</button>
            <button type="button" onClick={() => scrollTo('features')}>Capabilities</button>
            <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          </nav>
          <div className="nav-actions">
            <kbd className="kbd-hint" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>⌘K</kbd>
            <Tip label="Switch appearance">
              <button className="icon-btn" type="button" onClick={toggle} aria-label="Switch appearance">
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.22 4.22l1.56 1.56M18.22 18.22l1.56 1.56M2 12h2.2M19.8 12H22M4.22 19.78l1.56-1.56M18.22 5.78l1.56-1.56" /></svg>
                )}
              </button>
            </Tip>
            <PrefsPopover theme={theme} saved={saved} onReset={reset} />
            <SignupDrawer trigger={<button ref={signupRef} className="btn btn-primary btn-sm" type="button">Sign up</button>} />
          </div>
        </div>
      </header>

      <main id="main">
        <section id="hero" className="hero">
          <div className="hero-atmosphere" aria-hidden="true">
            <span className="bloom bloom-a" /><span className="bloom bloom-b" />
          </div>
          <div className="container hero-inner">
            <motion.p className="hero-eyebrow"
              initial={{ opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.6, ease: EASE.out, delay: 0.04 }}>
              by <a href="https://greyai.ai" target="_blank" rel="noopener">Grey Ai</a>
            </motion.p>
            <motion.h1 className="hero-wordmark"
              initial={{ opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.6, ease: EASE.out, delay: 0.1 }}>
              <span className="glyph-e">E</span>XHALE
            </motion.h1>
            <motion.p className="hero-tagline"
              initial={{ opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.6, ease: EASE.out, delay: 0.17 }}>
              The AI executive for executive parents
            </motion.p>
            <motion.div className="hero-actions"
              initial={{ opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.6, ease: EASE.out, delay: 0.24 }}>
              <SignupDrawer trigger={<button className="btn btn-primary" type="button">Sign up for beta</button>} />
              <button className="btn btn-quiet" type="button" onClick={() => scrollTo('features')}>See what it does</button>
            </motion.div>
            <motion.p className="hero-note"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE.out, delay: 0.3 }}>
              Free while in beta · press <kbd>⌘K</kbd>
            </motion.p>
          </div>
        </section>

        <section id="pain-points" className="section pain">
          <div className="container">
            <Reveal className="section-head">
              <p className="eyebrow">The problem</p>
              <h2 className="section-title">The reality</h2>
            </Reveal>
            <Scrolly scenes={REALITY_SCENES} steps={REALITY_STEPS} />
          </div>
        </section>

        <section id="features" className="section features">
          <div className="container">
            <Reveal className="section-head">
              <p className="eyebrow">Capabilities</p>
              <h2 className="section-title">Meet your AI executive</h2>
            </Reveal>
            {/* Inside the container: the rail needs a bounded width or
                overflow-x never creates a scroll container and the last card
                becomes unreachable. */}
            <Gallery items={CAPABILITIES} />
          </div>
        </section>

        <section id="how-it-works" className="section how">
          <div className="container">
            <Reveal className="section-head">
              <p className="eyebrow">How it works</p>
              <h2 className="section-title">Built around your life</h2>
            </Reveal>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <Reveal key={s.h} className="step" delay={i * 0.07}>
                  <span className="step-num">{i + 1}</span>
                  <div className="step-body"><h3>{s.h}</h3><p>{s.p}</p></div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="container demo-strip">
            <Reveal className="section-head">
              <p className="eyebrow">Gesture</p>
              <h2 className="section-title">A flick is enough</h2>
              <p className="section-sub">
                Velocity decides, not distance. Requiring a drag threshold is what makes a
                swipe feel unresponsive.
              </p>
            </Reveal>
            <DismissDemo />
          </div>
        </section>

        <section id="bespoke" className="bespoke">
          <div className="container bespoke-inner">
            <Reveal><h2 className="bespoke-title">Bespoke. Managed. <em>Yours.</em></h2></Reveal>
            <Reveal className="bespoke-body">
              <p>Exhale isn’t an app you download. It’s a system we build and manage specifically for your life — your family, your caregivers, your calendars, your commitments.</p>
              <p>Our team handles the build, the integrations, and the ongoing updates so Exhale always reflects how you actually live.</p>
            </Reveal>
            <Reveal><p className="bespoke-note">Not a product. A service relationship.</p></Reveal>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container faq-inner">
            <Reveal className="section-head">
              <p className="eyebrow">Questions</p>
              <h2 className="section-title">The ones people actually ask</h2>
            </Reveal>
            <Reveal><Faq items={FAQS} /></Reveal>
          </div>
        </section>

        <section className="section cta">
          <div className="container">
            <Reveal className="section-head cta-head">
              <h2 className="section-title">Ready to <em>exhale?</em></h2>
              <p className="section-sub">Finally, infrastructure for the most important part of your life.</p>
              <div className="cta-actions">
                <SignupDrawer trigger={<button className="btn btn-primary" type="button">Sign up for the beta</button>} />
              </div>
              <p className="cta-note">Free while in beta</p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="wordmark">EXHALE</span><span className="footer-by">by</span>
            <a href="https://greyai.ai" target="_blank" rel="noopener">Grey Ai</a>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a href="/onboarding">Beta sign-in</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/apple/lab/">Motion lab</a>
          </nav>
        </div>
      </footer>
    </Tooltip.Provider>
  )
}
