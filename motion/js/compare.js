/**
 * Exhale — same week, twice
 *
 * A before/after slider: the inbox as it arrives on the left, what Exhale hands
 * back on the right, one draggable divider between them. Ported from the apple
 * build's compare section, with the panes the other way round — there the
 * answer holds the left and is clipped from the right; here the problem holds
 * the left, because that is the order the argument runs in.
 *
 * This replaced a scroll-driven film: a 460vh runway, a pinned stage and eight
 * beats that walked from the volume of the inbox through to the answer. The
 * comparison makes the same point in one screen, and a reader who wants it can
 * have it immediately instead of scrolling four viewports for it.
 *
 * clip-path on the overlay, no extra DOM, fully composited — the divider costs
 * one paint per frame and never touches layout.
 */
(function () {
    'use strict';

    // ── the week, as it arrived ────────────────────────────────────────────
    // Same household as The Reality and the capability cards. `src` is which
    // system it came from and `due` marks the ones carrying a hard date.
    // Neither is rendered: `due` used to print a DATE chip beside the sender,
    // and taking it away is the point — the inbox gives you no such marker,
    // which is why seven deadlines can sit in it unnoticed. Kept because the
    // count of them is what the line under the box claims.
    var INBOX = [
        { from: 'Oakwood Auction', subj: 'VIP Glow Packages still available — Sat 4/11', src: 'Auction site', due: true, fresh: true },
        { from: 'Oakwood Yearbook', subj: 'REMINDER: Yearbook orders close Mon Apr 13', src: 'Photo vendor', due: true, fresh: true },
        { from: 'Riverside Fishing Club', subj: 'Kids Fishing Club registration closes Thu', src: 'Community', due: true, fresh: true },
        { from: 'Mrs. Alvarez', subj: 'Weekly newsletter posted — April 5', src: 'Classroom' },
        { from: 'Oakwood PTA', subj: 'General membership meeting tonight 7pm Zoom', src: 'PTA', due: true },
        { from: 'Mr. Reyes', subj: 'ACTION: Recorder permission slip', src: 'Classroom', due: true },
        { from: 'RCPS', subj: 'Testing dates updated — 3rd grade', src: 'District', due: true },
        { from: 'Bright Hours', subj: 'Bullying &amp; Friendship workshop Apr 21', src: 'Aftercare' },
        { from: 'Principal Whitfield', subj: 'Oakwood Weekly News — March 26', src: 'School office' },
        { from: 'Dana Brooks', subj: 'Free practice tool for parents', src: 'Another parent' },
        { from: 'Ms. Hartley', subj: 'ParentSquare update for Theo', src: 'Second school' },
        { from: 'Bright Hours', subj: 'April newsletter — closures + Spring Break hours', src: 'Aftercare', due: true }
    ];

    // What comes back. The demo film's four cards, verbatim.
    var ACTIONS = [
        { when: 'TONIGHT 7PM', what: 'PTA general meeting on Zoom', tag: 'ACTION' },
        { when: 'FRI APR 10', what: 'Return the practice packet for 3 WOW spots' },
        { when: 'SAT APR 11', what: 'Glow Bingo &amp; Auction · 5:30–8pm, Oakwood cafeteria' },
        { when: 'MON APR 13', what: 'Picture Day + yearbook orders due (code oakwood26)' }
    ];

    function clamp(n, lo, hi) {
        return n < lo ? lo : (n > hi ? hi : n);
    }

    function init() {
        var root = document.querySelector('[data-compare]');
        if (!root) return;

        var rowsEl = root.querySelector('[data-compare-rows]');
        var actionsEl = root.querySelector('[data-compare-actions]');
        var handleEl = root.querySelector('[data-compare-handle]');
        if (!rowsEl || !actionsEl || !handleEl) return;

        var stageEl = root.closest('.compare-stage');
        var flipEl = root.querySelector('[data-compare-flip]');
        var winEl = root.querySelector('.cmp-win');
        var navEl = document.querySelector('.top-nav');

        // Below this a horizontal drag competes with the page scroll for the
        // same gesture, so the scroll owns the divider and the grip is taken
        // away rather than left to be grabbed at.
        var stacked = window.matchMedia('(max-width: 900px)');

        // The flip is narrower still. Above 640px the inbox rows go back to one
        // line and the card back to full-bleed width, and a card 787px across
        // and 490px tall sweeps half a tablet when it turns. Phones flip;
        // tablets keep the sequence they had.
        var phone = window.matchMedia('(max-width: 640px)');

        INBOX.forEach(function (m, i) {
            var li = document.createElement('li');
            li.className = 'cmp-row';
            if (m.fresh) li.classList.add('is-fresh');
            // Every fourth already read: a list where everything is unread
            // reads as a mock rather than as an inbox.
            if (!m.fresh && i % 4 === 0) li.classList.add('is-read');
            li.innerHTML =
                '<span class="cmp-dot" aria-hidden="true"></span>' +
                '<span class="cmp-from">' + m.from + '</span>' +
                '<span class="cmp-subj">' + m.subj + '</span>' +
                '<span class="cmp-src">' + m.src + '</span>';
            rowsEl.appendChild(li);
        });

        ACTIONS.forEach(function (a) {
            var li = document.createElement('li');
            li.className = 'cmp-action';
            li.innerHTML =
                '<span class="cmp-when">' + a.when + '</span>' +
                '<span class="cmp-what">' + a.what + '</span>' +
                (a.tag ? '<span class="cmp-tag">' + a.tag + '</span>' : '');
            actionsEl.appendChild(li);
        });

        // ── the divider ────────────────────────────────────────────────────
        // Back to the middle: with both contents anchored left rather than
        // split into columns, there is no seam for the divider to rest on and
        // half of each is the honest starting point.
        var pos = 50;   // percent; 100 = all problem, 0 = all answer

        function setPos(v) {
            v = clamp(v, 0, 100);
            if (v === pos) return;
            pos = v;
            root.style.setProperty('--pos', v.toFixed(2) + '%');
            handleEl.setAttribute('aria-valuenow', Math.round(v));
        }

        function fromEvent(e) {
            var r = root.getBoundingClientRect();
            setPos(((e.clientX - r.left) / r.width) * 100);
        }

        handleEl.addEventListener('pointerdown', function (e) {
            if (stacked.matches) return;
            handleEl.setPointerCapture(e.pointerId);
            root.classList.add('is-dragging');
        });

        handleEl.addEventListener('pointermove', function (e) {
            if (stacked.matches) return;
            if (!handleEl.hasPointerCapture(e.pointerId)) return;
            fromEvent(e);
        });

        function endDrag() { root.classList.remove('is-dragging'); }
        handleEl.addEventListener('pointerup', endDrag);
        handleEl.addEventListener('pointercancel', endDrag);

        // Arrow keys, because it reports a value: a slider nobody can move from
        // the keyboard is a slider only some people have.
        handleEl.addEventListener('keydown', function (e) {
            if (stacked.matches) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); setPos(pos - 4); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setPos(pos + 4); }
            if (e.key === 'Home') { e.preventDefault(); setPos(0); }
            if (e.key === 'End') { e.preventDefault(); setPos(100); }
        });

        function syncMode() {
            var touch = stacked.matches;
            var flipped = syncFlip();
            if (subEl) {
                subEl.textContent = !touch
                    ? 'Drag to move between what arrives and what you actually need.'
                    : (flipped
                        ? 'Keep scrolling — it turns over.'
                        : 'What arrives, and what you actually need.');
            }
            root.classList.toggle('is-scrolled', touch);
            handleEl.disabled = touch;
            handleEl.setAttribute('aria-hidden', touch ? 'true' : 'false');
            // The divider is a pointer-device idea: below 900px it is the scroll
            // that turns the card, and on a screen too short to hold the card
            // whole nothing moves at all — both panes simply sit in sequence.
            if (!touch) setPos(50);
        }

        // The line under the heading has to describe the gesture that actually
        // moves the section. There are three of them — a drag, a scroll, or
        // nothing at all — and naming the wrong one is the copy lying about a
        // control that is not on screen.
        var subEl = document.querySelector('.compare-sub');

        // Before the flip is built, not after: the flip registers a fonts.ready
        // callback and a resize listener, and both would fire straight past an
        // early return placed below them and switch it back on.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // No drag, no turn: the section resolves to the answer, which is the
            // half that carries the point, and the phone keeps the plain
            // sequence it falls back to anyway.
            root.classList.add('is-static');
            setPos(0);
            handleEl.disabled = true;
            handleEl.setAttribute('aria-hidden', 'true');
            if (subEl) subEl.textContent = 'What arrives, and what you actually need.';
            return;
        }

        // ── the flip, on a phone ───────────────────────────────────────────
        // The two panes become the two faces of one card and the scroll turns
        // it over. A wipe could never work here: it has to show both panes at
        // once, so both have to fit one frame, so the frame gets capped and the
        // cap cuts an inbox row in half. A card shows one face at a time, so
        // the frame only has to be as tall as the taller of the two.
        //
        // Which is also the condition. If the inbox cannot clear the viewport
        // whole there is nothing to flip to, so the flip is not offered and the
        // plain sequence stands.
        var flipping = false;
        var cardH = 0;
        var headTop = 0;
        var queued = false;

        // The heading collapses to exactly 3rem, declared in CSS so the pin has
        // a number to sit against without JS reflowing the head to find one.
        var HEAD_BAR = 48;
        var HEAD_GAP = 12;

        // Read, turn, read. The card has to sit still long enough at each end
        // to be read, or the flip is the only thing that happened.
        var HOLD_IN = 0.24;
        var TURN = 0.44;

        function easeInOut(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function fits() {
            if (!stageEl || !flipEl || !winEl || !phone.matches) return false;
            // Measured out of flip mode, where the pane is still in flow and
            // the window still reports the height its content actually wants.
            stageEl.classList.remove('is-flip', 'is-lead');
            var h = Math.ceil(winEl.getBoundingClientRect().height);
            var head = Math.round((navEl ? navEl.getBoundingClientRect().height : 0) + 8);
            var top = head + HEAD_BAR + HEAD_GAP;
            // The card, the bar above it and a margin below all have to clear
            // the screen at once. If they cannot there is nothing to pin.
            if (h + top + 24 > window.innerHeight) return false;
            cardH = h;
            headTop = head;
            stageEl.style.setProperty('--card-h', h + 'px');
            stageEl.style.setProperty('--head-top', head + 'px');
            return true;
        }

        function paint() {
            queued = false;
            if (!flipping) return;
            var r = stageEl.getBoundingClientRect();
            // Both the bar and the card are stuck for this stretch, so the
            // runway is what is left of the stage once they are subtracted.
            var travel = r.height - HEAD_BAR - HEAD_GAP - cardH;
            var p = travel > 0 ? clamp((headTop - r.top) / travel, 0, 1) : 0;
            // Collapses the moment the bar takes hold, so the two never move
            // at once and the card does not appear to lurch.
            stageEl.classList.toggle('is-lead', p > 0);
            var t = easeInOut(clamp((p - HOLD_IN) / TURN, 0, 1));
            stageEl.style.setProperty('--flip', (t * 180).toFixed(2) + 'deg');
            // Pulls away as it turns and comes back flat, so the card reads as
            // an object being handled rather than a texture being swapped.
            stageEl.style.setProperty('--flip-scale', (1 - 0.09 * Math.sin(Math.PI * t)).toFixed(3));
        }

        function onScroll() {
            if (!flipping || queued) return;
            queued = true;
            requestAnimationFrame(paint);
        }

        function setFlip(on) {
            flipping = on;
            stageEl.classList.toggle('is-flip', on);
            if (on) {
                paint();
            } else {
                stageEl.classList.remove('is-lead');
                stageEl.style.removeProperty('--flip');
                stageEl.style.removeProperty('--flip-scale');
                stageEl.style.removeProperty('--head-top');
                stageEl.style.removeProperty('--card-h');
            }
        }

        function syncFlip() {
            if (!stageEl) return false;
            var on = stacked.matches && fits();
            setFlip(on);
            return on;
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', syncFlip);
        if (phone.addEventListener) phone.addEventListener('change', syncFlip);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncFlip);

        if (stacked.addEventListener) stacked.addEventListener('change', syncMode);

        syncMode();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
