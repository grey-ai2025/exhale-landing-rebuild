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
                "q": "What do I need to know this week?",
                "intro": "Four things need you this week:",
                "a": [
                    "&rarr; <b>ELA practice packet</b> due <b>Monday, April 13</b>. No math homework.",
                    "&rarr; <b>Yearbook orders</b> close the same day &mdash; code <b>oakwood26</b>, before <b>6am</b>.",
                    "&rarr; <b>PTA meeting tonight</b>, <b>7pm</b> on Zoom.",
                    "&rarr; <b>Glow Auction</b> closes Monday midnight."
                ]
            },
            {
                "q": "Send me the latest updates",
                "intro": null,
                "a": [
                    "<b>Oakwood</b> &mdash; Principal Whitfield, <b>March 26</b>.",
                    "<b>Brookfield Hills</b> &mdash; Principal Marsh, <b>March 27</b>.",
                    "Both went out before spring break ended <b>April 7</b>."
                ]
            },
            {
                "q": "Is there anything I need to sign or send back?",
                "intro": null,
                "a": [
                    "The <b>recorder permission letter</b> from music, sent home <b>March 26</b>. It needs reading in full before it goes back.",
                    "The practice packet returned by <b>Monday</b> earns Maya <b>3 WOW board spots</b>.",
                    "Nothing outstanding for Theo."
                ]
            }
        ],
        [
            {
                "q": "What is the homework this week?",
                "intro": null,
                "a": [
                    "<b>Maya</b> &mdash; ELA practice packet all week. <b>No math homework.</b>",
                    "<b>Theo</b> &mdash; Math Module 4, <b>Lessons 27 to 29</b>: adding 2-digit numbers."
                ]
            },
            {
                "q": "What are the kids&rsquo; spelling words this week?",
                "intro": null,
                "a": [
                    "<b>Maya</b> &mdash; jellyfish, germy, digest, fringe, nudging, ridge, exchange&hellip; <b>20 words</b>.",
                    "<b>Theo</b> &mdash; tricky word <b>said</b>, plus the <b>/er/</b>, <b>/ar/</b> and <b>/or/</b> groups."
                ]
            },
            {
                "q": "What are they learning in class this week?",
                "intro": null,
                "a": [
                    "<b>Maya</b> &mdash; oral presentations, graded on <b>volume, clarity and enthusiasm</b>. She presents <b>Wednesday or Thursday</b>.",
                    "<b>Theo</b> &mdash; habitats, punctuation, and adding 2-digit numbers."
                ]
            }
        ],
        [
            {
                "q": "Is there anything going on with testing?",
                "intro": null,
                "a": [
                    "<b>ELA</b>: April <b>28</b>, <b>29</b>, <b>30</b> and <b>May 4</b>.",
                    "<b>Math</b>: May <b>15</b>, <b>19</b>, <b>20</b>, <b>21</b>.",
                    "Mrs. Alvarez asked that Maya be there for every one of them."
                ]
            },
            {
                "q": "Any days off or early dismissals coming up?",
                "intro": null,
                "a": [
                    "<b>Wednesday, April 15</b> &mdash; early release for both, end of term.",
                    "<b>Thursday, April 23</b> &mdash; Take Your Child to Work Day at Oakwood.",
                    "<b>Monday, April 20</b> &mdash; staff grading day, regular schedule."
                ]
            },
            {
                "q": "What should go on the calendar?",
                "intro": null,
                "a": [
                    "<b>April 10</b> &mdash; Open House, and Theo&rsquo;s Career Day.",
                    "<b>April 13</b> &mdash; picture day and Town Hall at <b>9am</b>.",
                    "<b>April 24</b> &mdash; Talent Show."
                ]
            }
        ]
    ];

    // The bubble Exhale answers in. Shared: on desktop it goes in the phone's
    // thread, on a phone it goes inside the card under the question that asked
    // for it. One renderer, so the two can never word things differently.
    function buildReplyCard(entry) {
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

        return card;
    }

    // Below this the phone is hidden and the cards carry their own answers.
    var STACKED = '(max-width: 900px)';

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
            replyInner.appendChild(buildReplyCard(entry));
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

        // Tapping a prompt asks that one and keeps the thread going. Only
        // where there is a phone to ask into — on a narrow screen the same tap
        // opens the answer inside the card instead (initCardAnswers).
        var stacked = window.matchMedia(STACKED);

        gallery.addEventListener('click', function (e) {
            if (stacked.matches) return;
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


    /**
     * The answer, inside the card
     *
     * On a phone there is no device to drive, so the prompt stops being a
     * remote control and becomes the question itself: tap it and Exhale
     * answers underneath. Same disclosure as the FAQ further down the page.
     *
     * The panels are built at every width and left to CSS to reveal, because
     * building them on a breakpoint change would throw away whichever one the
     * reader had open when they rotated the phone.
     */
    function initCardAnswers() {
        var gallery = document.querySelector('[data-gallery]');
        if (!gallery) return;

        var stacked = window.matchMedia(STACKED);
        var prompts = Array.prototype.slice.call(gallery.querySelectorAll('.feature-prompt'));
        var open = null;

        prompts.forEach(function (btn) {
            var parts = (btn.getAttribute('data-prompt') || '').split('.');
            var cap = Number(parts[0]);
            var idx = Number(parts[1]);
            var entry = CAPABILITIES[cap] && CAPABILITIES[cap][idx];
            var li = btn.parentElement;
            if (!entry || !li) return;

            var id = 'card-answer-' + cap + '-' + idx;
            var inner = document.createElement('div');
            inner.className = 'card-answer-inner';
            inner.appendChild(buildReplyCard(entry));

            var panel = document.createElement('div');
            panel.className = 'card-answer';
            panel.id = id;
            panel.appendChild(inner);
            li.appendChild(panel);

            btn.insertAdjacentHTML('afterbegin',
                '<svg class="feature-prompt-caret" viewBox="0 0 24 24" fill="none" ' +
                'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                'stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>');
        });

        function setOpen(li) {
            // One at a time. Three open answers make a card longer than the
            // screen, and the reader is comparing questions, not reading all
            // three at once.
            if (open && open !== li) {
                open.classList.remove('is-open');
                var was = open.querySelector('.feature-prompt');
                if (was) was.setAttribute('aria-expanded', 'false');
            }
            open = li;
        }

        gallery.addEventListener('click', function (e) {
            if (!stacked.matches) return;

            var btn = e.target.closest('.feature-prompt');
            if (!btn) return;

            var li = btn.parentElement;
            if (!li || !li.querySelector('.card-answer')) return;

            var wasOpen = li.classList.contains('is-open');
            setOpen(wasOpen ? null : li);
            li.classList.toggle('is-open', !wasOpen);
            btn.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
        });

        // Above the breakpoint the same button drives the phone and expands
        // nothing, so it must not claim to. The panels stay in the DOM either
        // way — only the promise made about them changes.
        function syncRole() {
            var isDisclosure = stacked.matches;
            prompts.forEach(function (btn) {
                var panel = btn.parentElement && btn.parentElement.querySelector('.card-answer');
                if (!panel) return;
                if (isDisclosure) {
                    btn.setAttribute('aria-controls', panel.id);
                    btn.setAttribute('aria-expanded',
                        btn.parentElement.classList.contains('is-open') ? 'true' : 'false');
                } else {
                    btn.removeAttribute('aria-controls');
                    btn.removeAttribute('aria-expanded');
                }
            });
        }

        // Widening the window hands the conversation back to the phone; an
        // answer left open in a card would sit there with nothing to close it.
        if (stacked.addEventListener) {
            stacked.addEventListener('change', function (e) {
                if (!e.matches) {
                    if (open) setOpen(null);
                    gallery.querySelectorAll('.feature-list li.is-open').forEach(function (li) {
                        li.classList.remove('is-open');
                    });
                }
                syncRole();
            });
        }

        syncRole();
    }

    function init() {
        initChat();
        initCardAnswers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
