/**
 * Exhale — the film, scrubbed by scroll, built 70/20/10
 *
 * A port of the demo film (Remotion, 1920x1080, 3,270 frames) onto the one
 * timeline a landing page has: how far down it you are. The port stays close
 * because Remotion animates with interpolate(frame, [inMin, inMax], [outMin,
 * outMax]) and little else, so a scroll position standing in for a frame
 * number carries the grammar across intact.
 *
 * The running order is the 70/20/10 proposal system, and the proportions are
 * literal — measured in scroll distance, which is the only budget a scrolling
 * reader actually spends:
 *
 *   0.00 - 0.70   the problem, with real data                   (70%)
     *   0.70 - 0.90   the solution: what it reads, what it returns, and
     *                  who maintains it — only the parts that answer
     *                  the above                                    (20%)
 *   0.90 - 1.00   what happens next                            (10%)
 *
 * The first version of this section was pretty and taught nothing: a big
 * number, a glow, a tidy list. Every beat below has to hand over a fact the
 * reader did not walk in with — how many senders, how many systems, how many
 * of those messages hide a hard date, and what was buried inside them. That is
 * what the 70% is for. Spectacle is not information.
 *
 * One object carries beats one to four: the same inbox, examined more closely
 * each time, gaining annotation rather than being replaced. Cutting to an
 * unrelated visual every beat would read as a slideshow.
 *
 * Everything is a function of scroll position rather than elapsed time, so it
 * runs backwards, holds still when the reader does, and cannot desync.
 */
(function () {
    'use strict';

    // ── the week, as it actually arrived ───────────────────────────────────
    // Same household as The Reality and the capability cards. `src` is which
    // system it came from and `due` marks the ones carrying a hard date —
    // those two fields are the substance of beats two and three, not
    // decoration. `live` is when it lands while the reader is watching.
    var INBOX = [
        { from: 'Oakwood Auction', subj: 'VIP Glow Packages still available — Sat 4/11', src: 'Auction site', due: true, live: 0.055 },
        { from: 'Oakwood Yearbook', subj: 'REMINDER: Yearbook orders close Mon Apr 13', src: 'Photo vendor', due: true, live: 0.095 },
        { from: 'Riverside Fishing Club', subj: 'Kids Fishing Club registration closes Thu', src: 'Community', due: true, live: 0.135 },
        { from: 'Mrs. Alvarez', subj: 'Weekly newsletter posted — April 5', src: 'Classroom' },
        { from: 'Oakwood PTA', subj: 'General membership meeting tonight 7pm Zoom', src: 'PTA', due: true },
        { from: 'Mr. Reyes', subj: 'ACTION: Recorder permission slip', src: 'Classroom', due: true },
        { from: 'RCPS', subj: 'Testing dates updated — 3rd grade', src: 'District', due: true },
        { from: 'Bright Hours', subj: 'Bullying & Friendship workshop Apr 21', src: 'Aftercare' },
        { from: 'Principal Whitfield', subj: 'Oakwood Weekly News — March 26', src: 'School office' },
        { from: 'Dana Brooks', subj: 'Free practice tool for parents', src: 'Another parent' },
        { from: 'Ms. Hartley', subj: 'ParentSquare update for Theo', src: 'Second school' },
        { from: 'Bright Hours', subj: 'April newsletter — closures + Spring Break hours', src: 'Aftercare', due: true }
    ];

    var BASE_UNREAD = 2847;

    // Beat four: what was actually inside the ones with dates on them, in the
    // words the senders used.
    var STAKES = [
        { fact: 'Read it in full and return it', note: 'Recorder permission slip, sent home March 26' },
        { fact: 'Pre-ordering closes at 6am', note: 'Yearbook orders, the morning of picture day' },
        { fact: 'Early release — both kids', note: 'Wednesday, April 15. End of term' },
        { fact: '8 testing dates, attendance critical', note: 'April 28 through May 21' }
    ];

    // Beat five: the film's HowItConnects scene, compressed to the single
    // claim it makes — Exhale is reading all of these, not just the mail.
    var NODES = ['Email', 'Calendar', 'Messages', 'Contacts'];

    // Beat six: the film's four cards, verbatim.
    var ACTIONS = [
        { when: 'TONIGHT 7PM', what: 'PTA general meeting on Zoom', tag: 'ACTION' },
        { when: 'FRI APR 10', what: 'Return the practice packet for 3 WOW spots' },
        { when: 'SAT APR 11', what: 'Glow Bingo &amp; Auction · 5:30–8pm, Oakwood cafeteria' },
        { when: 'MON APR 13', what: 'Picture Day + yearbook orders due (code oakwood26)' }
    ];

    // ── the timeline ───────────────────────────────────────────────────────
    // The two phase boundaries are the proposal system itself. Everything
    // else is staging inside them.
    var PROBLEM = 0.70;

    // Where the last caption hands over to the section below.
    var BRIDGE = 0.955;

    // The 20% carries three beats: what it reads, who maintains it, and what
    // it returns. That last one is deliberately last — the film now ends
    // holding an answered question, and the section immediately below opens
    // with the same question inside a phone. The card hands to the phone, so
    // the two sections read as one movement rather than as a stop and a start.
    //
    // There is no fourth beat. A "next steps" close used to live here and it
    // was asking for the sign-up before the reader had seen a single
    // capability; that belongs at the foot of the page.
    var T = {
        badges:    [0.20, 0.32],    // beat 2 — where all of it came from
        marks:     [0.38, 0.50],    // beat 3 — which ones carry a date
        stakes:    [0.55, 0.67],    // beat 4 — what was inside them
        stakesOut: [0.70, 0.74],

        nodes:     [0.700, 0.745],  // beat 5 — what it reads
        nodesOut:  [0.775, 0.805],
        markIn:    [0.703, 0.750],
        absorb:    [0.710, 0.780],
        inboxOut:  [0.710, 0.780],
        markOut:   [0.800, 0.845],

        managed:   [0.780, 0.825],  // beat 6 — who builds and maintains it
        managedOut:[0.858, 0.882],

        cardIn:    [0.868, 0.912],  // beat 7 — what comes back, and it stays
        actionsIn: [0.878, 0.945]
    };

    // Remotion's interpolate, clamped at both ends.
    function ipol(p, range, out) {
        var t = (p - range[0]) / (range[1] - range[0]);
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        return out[0] + (out[1] - out[0]) * t;
    }

    // Stand-in for Easing.bezier(0.16, 1, 0.3, 1), the curve the film gives
    // anything arriving. At these sizes it lands within a pixel of the real one.
    function settle(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function clamp01(n) {
        return n < 0 ? 0 : (n > 1 ? 1 : n);
    }

    // Item i of n, revealed across a 0..1 window.
    function stagger(v, i, n) {
        return settle(clamp01((v - i / n) * n));
    }

    function initFilm() {
        var root = document.querySelector('[data-film]');
        if (!root) return;

        var track = root.querySelector('[data-film-track]');
        var canvas = root.querySelector('[data-film-canvas]');
        var rowsEl = root.querySelector('[data-film-rows]');
        var countEl = root.querySelector('[data-film-count]');
        var tabCountEl = root.querySelector('[data-film-tab-count]');
        var stakesEl = root.querySelector('[data-film-stakes]');
        var nodesEl = root.querySelector('[data-film-nodes]');
        var actionsEl = root.querySelector('[data-film-actions]');
        var railEl = root.querySelector('[data-film-rail]');
        var managedEl = root.querySelector('[data-film-managed]');
        var beats = Array.prototype.slice.call(root.querySelectorAll('[data-film-beat]'));
        if (!track || !canvas || !rowsEl || !stakesEl || !nodesEl || !actionsEl) return;

        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // ── build ──────────────────────────────────────────────────────────
        var rows = INBOX.map(function (m, i) {
            var li = document.createElement('li');
            li.className = 'film-row';
            if (m.live) li.classList.add('is-incoming');
            if (m.due) li.classList.add('is-due');
            // Every fourth already read: a list where everything is unread
            // reads as a mock rather than as an inbox.
            if (!m.live && i % 4 === 0) li.classList.add('is-read');
            li.innerHTML =
                '<span class="film-dot" aria-hidden="true"></span>' +
                '<span class="film-from">' + m.from + '</span>' +
                '<span class="film-subj">' + m.subj + '</span>' +
                '<span class="film-src">' + m.src + '</span>' +
                '<span class="film-flag" aria-hidden="true">DATE</span>';
            rowsEl.appendChild(li);
            m.el = li;
            return li;
        });

        STAKES.forEach(function (s) {
            var li = document.createElement('li');
            li.className = 'film-stake';
            li.innerHTML =
                '<span class="film-stake-fact">' + s.fact + '</span>' +
                '<span class="film-stake-note">' + s.note + '</span>';
            stakesEl.appendChild(li);
            s.el = li;
        });

        NODES.forEach(function (label) {
            var li = document.createElement('li');
            li.className = 'film-node';
            li.textContent = label;
            nodesEl.appendChild(li);
        });
        var nodeEls = Array.prototype.slice.call(nodesEl.children);

        ACTIONS.forEach(function (a) {
            var li = document.createElement('li');
            li.className = 'film-action';
            li.innerHTML =
                '<span class="film-when">' + a.when + '</span>' +
                '<span class="film-what">' + a.what + '</span>' +
                (a.tag ? '<span class="film-tag">' + a.tag + '</span>' : '');
            actionsEl.appendChild(li);
        });
        var actionEls = Array.prototype.slice.call(actionsEl.children);

        // ── where each row travels to be swallowed ─────────────────────────
        // Measured, not guessed: the rows sit at different heights, so each
        // has its own vector to the centre. Once per layout, never per frame.
        function measure() {
            var box = canvas.getBoundingClientRect();
            var cx = box.left + box.width / 2;
            var cy = box.top + box.height / 2;
            rows.forEach(function (row) {
                var r = row.getBoundingClientRect();
                row.style.setProperty('--dx', Math.round(cx - (r.left + r.width / 2)) + 'px');
                row.style.setProperty('--dy', Math.round(cy - (r.top + r.height / 2)) + 'px');
            });
        }

        // ── paint one frame ────────────────────────────────────────────────
        var lastCount = -1;

        function paint(p) {
            // Beat 1 — the volume. Each arrival lands on its own so the three
            // come one after another instead of together at a threshold.
            var arrived = 0;
            INBOX.forEach(function (m) {
                if (!m.live) return;
                var t = ipol(p, [m.live, m.live + 0.04], [0, 1]);
                if (t > 0) arrived++;
                m.el.style.setProperty('--in', settle(t).toFixed(4));
                m.el.style.setProperty('--fresh',
                    (1 - ipol(p, [m.live + 0.02, m.live + 0.14], [0, 1])).toFixed(4));
            });

            var count = BASE_UNREAD + arrived;
            if (count !== lastCount) {
                var text = count.toLocaleString();
                if (countEl) countEl.textContent = text;
                if (tabCountEl) tabCountEl.textContent = text;
                lastCount = count;
            }

            // Beats 2 and 3 — annotation layered onto the same object.
            var badges = ipol(p, T.badges, [0, 1]);
            rows.forEach(function (row, i) {
                row.style.setProperty('--badge', stagger(badges, i, rows.length).toFixed(4));
            });
            canvas.style.setProperty('--marks', settle(ipol(p, T.marks, [0, 1])).toFixed(4));

            // Beat 4 — what was inside them.
            canvas.style.setProperty('--stakes',
                (ipol(p, T.stakes, [0, 1]) * ipol(p, T.stakesOut, [1, 0])).toFixed(4));
            var sv = ipol(p, T.stakes, [0, 1]);
            STAKES.forEach(function (s, i) {
                s.el.style.setProperty('--in', stagger(sv, i, STAKES.length).toFixed(4));
            });

            // Beat 5 — what it reads, then the absorb.
            var nodes = ipol(p, T.nodes, [0, 1]) * ipol(p, T.nodesOut, [1, 0]);
            canvas.style.setProperty('--nodes', nodes.toFixed(4));
            var nodeIn = ipol(p, T.nodes, [0, 1]);
            nodeEls.forEach(function (el, i) {
                el.style.setProperty('--in', stagger(nodeIn, i, nodeEls.length).toFixed(4));
            });

            canvas.style.setProperty('--absorb', ipol(p, T.absorb, [0, 1]).toFixed(4));
            canvas.style.setProperty('--mark', ipol(p, T.markIn, [0, 1]).toFixed(4));
            canvas.style.setProperty('--mark-out', ipol(p, T.markOut, [1, 0]).toFixed(4));
            canvas.style.setProperty('--inbox', ipol(p, T.inboxOut, [1, 0]).toFixed(4));

            // Beat 6 — what comes back.
            // No fade-out: the card is the film's last frame and it is still
            // on screen as the stage releases, which is what carries the eye
            // into the phone below.
            canvas.style.setProperty('--card', settle(ipol(p, T.cardIn, [0, 1])).toFixed(4));
            var av = ipol(p, T.actionsIn, [0, 1]);
            actionEls.forEach(function (el, i) {
                el.style.setProperty('--in', stagger(av, i, actionEls.length).toFixed(4));
            });

            // Beat 7 — who builds and maintains it.
            var mv = ipol(p, T.managed, [0, 1]);
            canvas.style.setProperty('--managed',
                (mv * ipol(p, T.managedOut, [1, 0])).toFixed(4));
            if (managedEl) {
                Array.prototype.forEach.call(managedEl.children, function (el, i) {
                    el.style.setProperty('--in', stagger(mv, i, managedEl.children.length).toFixed(4));
                });
            }

            // Which beat owns the caption.
            var act = 0;
            if (p >= BRIDGE) act = 7;
            else if (p >= T.cardIn[0]) act = 6;
            else if (p >= T.managed[0]) act = 5;
            else if (p >= PROBLEM) act = 4;
            else if (p >= T.stakes[0]) act = 3;
            else if (p >= T.marks[0]) act = 2;
            else if (p >= T.badges[0]) act = 1;
            beats.forEach(function (b, i) {
                b.classList.toggle('is-on', i === act);
            });

            // The rail says where in the proposal the reader is standing,
            // which is the smallest possible answer to "do I know anything
            // yet" — and it makes the 70/20/10 shape visible rather than
            // merely true.
            if (railEl) {
                railEl.style.setProperty('--p', p.toFixed(4));
                var phase = p < PROBLEM ? '0' : '1';
                if (railEl.dataset.phase !== phase) railEl.dataset.phase = phase;
            }
        }

        // ── scroll ─────────────────────────────────────────────────────────
        var ticking = false;

        function progress() {
            var span = track.offsetHeight - window.innerHeight;
            if (span <= 0) return 1;
            return clamp01(-track.getBoundingClientRect().top / span);
        }

        function update() {
            ticking = false;
            paint(progress());
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }

        function onResize() {
            measure();
            update();
        }

        if (reduced) {
            // No scrubbing. The section lays its beats out as a static column
            // instead, keeping every fact and dropping only the motion.
            root.classList.add('is-static');
            paint(1);
            return;
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);

        measure();
        update();

        // Fonts land after first paint and change every row's width, so the
        // vectors measured a moment ago are wrong until they have.
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(onResize);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFilm);
    } else {
        initFilm();
    }
})();
