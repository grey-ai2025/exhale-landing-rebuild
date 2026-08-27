/**
 * Exhale — The Reality scrollytelling section
 *
 * A zero-height band across the middle of the viewport decides which step is
 * active: whichever explanation is crossing the centre line owns the phone.
 * That keeps the pinned visual and the copy you are actually reading in sync,
 * which a plain "is it visible" test does not.
 *
 * Everything on the lockscreen is a function of that step index rather than a
 * timer, so the pile-up is paced by the reader and unwinds correctly when they
 * scroll back up. A timed version desyncs the moment someone scrolls fast.
 */
(function () {
    'use strict';

    // One entry per step of the copy. The counts are the totals a person would
    // actually be carrying by then — well past what the stack can show, which
    // is the point: the visible cards are the top of a pile, not the pile.
    // The lockscreen photo changes with the step, the way iOS Photo Shuffle
    // does. The story runs from Thursday morning to Friday morning, so a
    // wallpaper that turns over across it reads as a day passing rather than
    // as a different phone — everything that identifies the device (the bezel,
    // the layout, the names in the notifications) stays put.
    //
    // Cloudinary, through the same f_auto,q_auto transform as everything else;
    // w_620 is twice the 280px the screen is ever drawn at.
    var WALL = 'https://res.cloudinary.com/dayr3egl3/image/upload/f_auto,q_auto,w_620/';

    var STATES = [
        { count: 3,  time: '7:12', meridiem: 'AM', date: 'Thursday, September 4', night: false,
          photo: WALL + 'v1787865702/exhale-phone-background_viclkd.jpg' },
        { count: 7,  time: '2:04', meridiem: 'PM', date: 'Thursday, September 4', night: false,
          photo: WALL + 'v1787864618/Gemini_Generated_Image_oyy8c3oyy8c3oyy8_geugob.jpg' },
        { count: 12, time: '3:47', meridiem: 'AM', date: 'Friday, September 5',   night: true,
          photo: WALL + 'v1787864618/Gemini_Generated_Image_44k7t44k7t44k7t4_ge1byn.jpg' },
        { count: 18, time: '6:58', meridiem: 'AM', date: 'Friday, September 5',   night: false,
          photo: WALL + 'v1787864618/Gemini_Generated_Image_dk2c2gdk2c2gdk2c_x27pqs.jpg' }
    ];

    // The point at which the number stops reading as a busy morning.
    var BURIED_AT = 12;

    // Warms the browser cache for every wallpaper, once. Below the breakpoint
    // the CSS never references --lock-photo, so there is nothing to warm and
    // a narrow screen still downloads no photographs at all.
    var preloaded = false;
    function preload() {
        if (preloaded || !window.matchMedia('(min-width: 901px)').matches) return;
        preloaded = true;
        STATES.forEach(function (s) {
            if (s.photo) { var img = new Image(); img.src = s.photo; }
        });
    }

    function initScrolly() {
        var root = document.querySelector('[data-scrolly]');
        if (!root) return;

        var steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
        if (!steps.length) return;

        var phone = root.querySelector('[data-phone]');
        var notifs = phone
            ? Array.prototype.slice.call(phone.querySelectorAll('[data-notif-step]'))
            : [];

        var countEl = phone && phone.querySelector('[data-phone-count]');
        var clockEl = phone && phone.querySelector('[data-phone-clock]');
        var meridiemEl = phone && phone.querySelector('[data-phone-meridiem]');
        var dateEl = phone && phone.querySelector('[data-phone-date]');
        var statusTimeEl = phone && phone.querySelector('[data-phone-status-time]');

        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var current = -1;
        var shownCount = 0;
        var countFrame = null;

        // Counting up is what sells accumulation — a number that cuts from 7 to
        // 12 is a fact, a number that climbs is a feeling.
        function setCount(target) {
            if (!countEl) return;
            if (countFrame) { cancelAnimationFrame(countFrame); countFrame = null; }

            if (reduced) {
                shownCount = target;
                countEl.textContent = target;
                return;
            }

            var from = shownCount;
            var delta = target - from;
            if (!delta) return;
            var start = null;

            countFrame = requestAnimationFrame(function step(now) {
                if (start === null) start = now;
                var t = Math.min((now - start) / 520, 1);
                var eased = 1 - Math.pow(1 - t, 3);
                shownCount = Math.round(from + delta * eased);
                countEl.textContent = shownCount;
                countFrame = t < 1 ? requestAnimationFrame(step) : null;
            });
        }

        // Text that changes mid-scroll fades out and back rather than cutting.
        // The pending swap is held on the element so a fast scroll retargets it
        // instead of queueing a second one behind the first.
        function setText(el, value) {
            if (!el || el.textContent === value) return;

            if (reduced) { el.textContent = value; return; }

            if (el._swap) clearTimeout(el._swap);
            el.classList.add('is-swapping');
            el._swap = setTimeout(function () {
                el.textContent = value;
                el.classList.remove('is-swapping');
                el._swap = null;
            }, 180);
        }

        function setActive(i) {
            if (i === current) return;
            current = i;

            steps.forEach(function (step, n) {
                step.classList.toggle('is-active', n === i);
            });

            var state = STATES[Math.min(i, STATES.length - 1)];

            // Everything up to and including this step has landed. Scrolling
            // back up removes the class, and the 0fr row closes again.
            notifs.forEach(function (el) {
                el.classList.toggle('is-in', Number(el.getAttribute('data-notif-step')) <= i);
            });

            if (!phone) return;

            phone.classList.toggle('is-night', !!state.night);
            phone.classList.toggle('is-buried', state.count >= BURIED_AT);

            // The scrim lives in the stylesheet and the photo under it comes
            // from here, so the CSS keeps one rule and this keeps one list.
            // Only written on a change: setActive runs on every scroll frame,
            // and reassigning an identical background-image is still a repaint.
            if (state.photo && phone.dataset.photo !== state.photo) {
                phone.dataset.photo = state.photo;
                phone.style.setProperty('--lock-photo', 'url("' + state.photo + '")');
            }

            // The moment the reader starts moving, fetch the rest, so a step
            // change never lands on a wallpaper that hasn't arrived. Not on
            // load: someone who stops at the hero should pay for none of them.
            if (i > 0) preload();

            setCount(state.count);
            setText(clockEl, state.time);
            setText(statusTimeEl, state.time);
            setText(dateEl, state.date);
            if (meridiemEl) meridiemEl.textContent = state.meridiem;
        }

        // Start on the first frame so the screen is never empty on arrival.
        setActive(0);

        if (!('IntersectionObserver' in window)) {
            // No observer: show every step at full strength rather than
            // leaving three of them dimmed to 25% forever, and settle the
            // phone on its final state.
            steps.forEach(function (step) { step.classList.add('is-active'); });
            setActive(steps.length - 1);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var i = steps.indexOf(entry.target);
                if (i !== -1) setActive(i);
            });
        }, {
            // Collapses the root to a line at the vertical centre.
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        });

        steps.forEach(function (step) { observer.observe(step); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrolly);
    } else {
        initScrolly();
    }
})();
