/**
 * Exhale — the capabilities phone
 *
 * The section has exactly one piece of state: which capability card you are
 * on. The gallery owns it and announces it (`gallery:change`); the phone
 * listens and shows that capability's conversation. Tapping one of the example
 * prompts asks that specific question instead.
 *
 * That single shared state is the whole point. The earlier version advanced the
 * thread on page scroll while the gallery advanced on swipe — two timelines in
 * one section, which is why the phone and the cards read as unrelated objects
 * sitting near each other.
 *
 * Answers are marked up here rather than in the HTML because there are nine of
 * them and only one is ever on screen; `<b>` carries the specifics Exhale
 * actually resolved — a name, a time, a number.
 */
(function () {
    'use strict';

    var CAPABILITIES = [
        [
            {
                q: 'What did the estate attorney send about the trust update?',
                intro: null,
                a: [
                    'The <b>revised trust summary</b> came through <b>Tuesday</b> from Weiss &amp; Cole.',
                    'Two pages need your signature by <b>September 12</b>.',
                    'I filed it under <b>Family &middot; Legal</b> and flagged the deadline.'
                ]
            },
            {
                q: 'What are the rules for the gala silent auction?',
                intro: null,
                a: [
                    'Bidding closes at <b>9:30pm</b>, with a <b>$50</b> minimum increment.',
                    'Winners settle at the <b>west desk</b> before leaving.',
                    'The committee sent the full sheet on <b>August 14</b> — want it forwarded?'
                ]
            },
            {
                q: 'When is the cat&rsquo;s next vet appointment?',
                intro: null,
                a: [
                    '<b>Thursday, September 11</b> at <b>4:40pm</b>, Riverside Vet.',
                    'Annual vaccination plus the weight check they asked for.',
                    'I&rsquo;ll remind you the evening before.'
                ]
            }
        ],
        [
            {
                q: 'What do I need to know today?',
                intro: 'You have three things needing you today:',
                a: [
                    '&rarr; <b>Ethan&rsquo;s field trip form</b> is due at <b>3pm</b>. Draft is ready to send.',
                    '&rarr; <b>Dad&rsquo;s cardiology</b> moved to <b>2:15</b>. I updated your calendar.',
                    '&rarr; <b>Board agenda</b> landed this morning. <b>4 items</b> need your input by <b>tomorrow</b>.'
                ]
            },
            {
                q: 'Does Dad&rsquo;s home aide schedule conflict with his specialist appointment?',
                intro: null,
                a: [
                    '<b>Yes</b>. The aide is booked <b>1&ndash;5pm Thursday</b>; cardiology is at <b>2:15</b>.',
                    'I flagged it with her coordinator this morning.',
                    'The <b>9am slot</b> is open if you&rsquo;d rather move the appointment.'
                ]
            },
            {
                q: 'What is due to the board committee this week?',
                intro: null,
                a: [
                    'Four items on the <b>Q3 memo</b> need your notes by <b>Friday 5pm</b>.',
                    'The finance summary is drafted and waiting on your review.',
                    'Nothing else is due before the <b>12th</b>.'
                ]
            }
        ],
        [
            {
                q: 'Add the donor reception to the calendar',
                intro: null,
                a: [
                    'Added &mdash; <b>Thursday, October 2</b> at <b>6:30pm</b>, the Whitcomb.',
                    'I blocked travel either side and invited <b>Charles</b>.',
                    'Attire is black tie; it&rsquo;s noted on the event.'
                ]
            },
            {
                q: 'Remind me to call Dad&rsquo;s care coordinator',
                intro: null,
                a: [
                    'Set for <b>tomorrow at 9:15am</b>, before your first call.',
                    'I attached her direct line and last week&rsquo;s notes.'
                ]
            },
            {
                q: 'Text Charles I&rsquo;m running late from the benefit dinner',
                intro: null,
                a: [
                    'Sent: <b>&ldquo;Running about 30 behind &mdash; start without me.&rdquo;</b>',
                    'I also pushed your <b>8:30</b> to <b>9:00</b> and let the sitter know.'
                ]
            }
        ]
    ];

    var THINKING_MS = 620;
    var MAX_TURNS = 3;   // older ones are under the fade anyway

    function initChat() {
        var root = document.querySelector('[data-chat]');
        var gallery = document.querySelector('[data-gallery]');
        if (!root || !gallery) return;

        var body = root.querySelector('[data-chat-body]');
        if (!body) return;

        var cards = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-item]'));
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var capability = -1;
        var timers = [];

        function clearTimers() {
            timers.forEach(clearTimeout);
            timers = [];
        }

        function markAsking(cap, idx) {
            gallery.querySelectorAll('.feature-list li').forEach(function (li) {
                li.classList.remove('is-asking');
            });
            if (cap == null) return;
            var btn = gallery.querySelector('[data-prompt="' + cap + '.' + idx + '"]');
            if (btn && btn.parentElement) btn.parentElement.classList.add('is-asking');
        }

        // One exchange: the question, the pause, the answer.
        function buildTurn(entry) {
            var turn = document.createElement('div');
            turn.className = 'chat-turn';

            var inner = document.createElement('div');
            inner.className = 'chat-turn-inner';

            var ask = document.createElement('p');
            ask.className = 'chat-ask';
            ask.innerHTML = entry.q;

            var typing = document.createElement('div');
            typing.className = 'chat-typing';
            typing.setAttribute('aria-hidden', 'true');
            typing.innerHTML = '<span></span><span></span><span></span>';

            var reply = document.createElement('div');
            reply.className = 'chat-reply';
            var replyInner = document.createElement('div');
            replyInner.className = 'chat-reply-inner';
            var card = document.createElement('div');
            card.className = 'chat-reply-card';

            if (entry.intro) {
                var intro = document.createElement('p');
                intro.className = 'chat-reply-intro';
                intro.innerHTML = entry.intro;
                card.appendChild(intro);
            }

            entry.a.forEach(function (line) {
                var p = document.createElement('p');
                p.className = 'chat-item';
                // The arrow is decoration in front of the line, not content.
                p.innerHTML = line.replace(/^&rarr;\s*/, '<span class="chat-arrow" aria-hidden="true">→</span>');
                card.appendChild(p);
            });

            replyInner.appendChild(card);
            reply.appendChild(replyInner);
            inner.appendChild(ask);
            inner.appendChild(typing);
            inner.appendChild(reply);
            turn.appendChild(inner);
            return turn;
        }

        function ask(cap, idx, opts) {
            var entry = CAPABILITIES[cap] && CAPABILITIES[cap][idx];
            if (!entry) return;

            if (opts && opts.reset) {
                clearTimers();
                body.innerHTML = '';
            }

            var turn = buildTurn(entry);
            body.appendChild(turn);

            while (body.children.length > MAX_TURNS) {
                body.removeChild(body.firstElementChild);
            }

            markAsking(cap, idx);

            if (reduced) {
                turn.classList.add('is-in', 'has-reply');
                return;
            }

            // Two frames: the row has to be measured collapsed before the
            // 0fr -> 1fr transition has anything to animate from.
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    turn.classList.add('is-in', 'is-thinking');
                });
            });

            timers.push(setTimeout(function () {
                turn.classList.remove('is-thinking');
                turn.classList.add('has-reply');
            }, THINKING_MS + 120));
        }

        // Switching capability starts that capability's conversation fresh,
        // rather than appending to the previous one — a new subject, not a
        // continuation.
        function setCapability(i) {
            if (i === capability || !CAPABILITIES[i]) return;
            capability = i;
            ask(i, 0, { reset: true });
        }

        gallery.addEventListener('gallery:change', function (e) {
            setCapability(e.detail.index);
        });

        // Tapping a prompt asks that one and keeps the thread going.
        gallery.addEventListener('click', function (e) {
            var btn = e.target.closest('.feature-prompt');
            if (!btn) return;

            var parts = (btn.getAttribute('data-prompt') || '').split('.');
            var cap = Number(parts[0]);
            var idx = Number(parts[1]);
            if (isNaN(cap) || isNaN(idx)) return;

            // Asking from a card you aren't on switches to it first.
            var fresh = cap !== capability;
            capability = cap;
            ask(cap, idx, { reset: fresh });
        });

        // The static first exchange in the HTML is the no-JS fallback. Now that
        // the controller is live, rebuild it through the same path so the two
        // can't drift apart.
        var start = cards.findIndex ? cards.findIndex(function (c) {
            return c.classList.contains('is-active');
        }) : -1;
        capability = -1;
        setCapability(start > -1 ? start : 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();
