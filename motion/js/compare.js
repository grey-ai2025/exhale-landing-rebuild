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
    // system it came from and `due` marks the ones carrying a hard date —
    // together they are the whole argument for why a filter cannot fix this.
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

        // Below this a horizontal drag competes with the page scroll for the
        // same gesture, so the scroll owns the divider and the grip is taken
        // away rather than left to be grabbed at.
        var stacked = window.matchMedia('(max-width: 900px)');

        INBOX.forEach(function (m, i) {
            var li = document.createElement('li');
            li.className = 'cmp-row';
            if (m.fresh) li.classList.add('is-fresh');
            if (m.due) li.classList.add('is-due');
            // Every fourth already read: a list where everything is unread
            // reads as a mock rather than as an inbox.
            if (!m.fresh && i % 4 === 0) li.classList.add('is-read');
            li.innerHTML =
                '<span class="cmp-dot" aria-hidden="true"></span>' +
                '<span class="cmp-from">' + m.from + '</span>' +
                '<span class="cmp-subj">' + m.subj + '</span>' +
                '<span class="cmp-src">' + m.src + '</span>' +
                '<span class="cmp-flag" aria-hidden="true">DATE</span>';
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

        // The line under the heading has to describe the gesture that actually
        // moves it. Nothing is dragged on a phone — the two states are laid out
        // in sequence there — so an instruction to drag would be the copy lying
        // about a control that is not on screen.
        var subEl = document.querySelector('.compare-sub');

        function syncMode() {
            var touch = stacked.matches;
            if (subEl) {
                subEl.textContent = touch
                    ? 'What arrives, and what you actually need.'
                    : 'Drag to move between what arrives and what you actually need.';
            }
            root.classList.toggle('is-scrolled', touch);
            handleEl.disabled = touch;
            handleEl.setAttribute('aria-hidden', touch ? 'true' : 'false');
            // Sequential on a phone: both panes are on screen at once, so there
            // is no divider to place. Anywhere else it rests in the middle.
            if (!touch) setPos(50);
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // No drag: the section resolves to the answer, which is the half
            // that carries the point.
            root.classList.add('is-static');
            setPos(0);
            handleEl.disabled = true;
            handleEl.setAttribute('aria-hidden', 'true');
            return;
        }

        if (stacked.addEventListener) stacked.addEventListener('change', syncMode);

        syncMode();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
