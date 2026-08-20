/**
 * Motion lab — each demo is the recipe, run.
 * Values come from the animation skills; nothing here is guessed.
 */
(function () {
    'use strict';

    var C = window.MotionCore;
    var M = window.Motion;
    var animate = M.animate;
    var stagger = M.stagger;

    var reduced = C.prefersReduced();

    var state = document.getElementById('motionState');
    if (state) {
        state.textContent = reduced
            ? 'prefers-reduced-motion is on — demos run in their gentler form.'
            : 'prefers-reduced-motion is off — demos run in full.';
    }

    function on(name, fn) {
        document.querySelectorAll('[data-run="' + name + '"]').forEach(function (b) {
            b.addEventListener('click', fn);
        });
    }

    /* 1 — Easing --------------------------------------------------------- */
    on('ease', function () {
        var track = document.querySelector('.ease-track').clientWidth - 60;
        var builtin = document.querySelector('[data-ease="builtin"]');
        var custom = document.querySelector('[data-ease="custom"]');
        [builtin, custom].forEach(function (el) { el.style.transform = 'translateX(0px)'; });
        requestAnimationFrame(function () {
            animate(builtin, { transform: ['translateX(0px)', 'translateX(' + track + 'px)'] },
                { duration: 0.6, ease: 'ease-out' });
            animate(custom, { transform: ['translateX(0px)', 'translateX(' + track + 'px)'] },
                { duration: 0.6, ease: C.EASE.out });
        });
    });

    /* 2 — Spring --------------------------------------------------------- */
    var bounceIn = document.getElementById('springBounce');
    var durIn = document.getElementById('springDur');
    var bounceOut = document.getElementById('springBounceOut');
    var durOut = document.getElementById('springDurOut');

    function syncSpringLabels() {
        bounceOut.textContent = bounceIn.value;
        durOut.textContent = durIn.value + 's';
    }
    if (bounceIn) {
        bounceIn.addEventListener('input', syncSpringLabels);
        durIn.addEventListener('input', syncSpringLabels);
        syncSpringLabels();
    }

    on('spring', function () {
        var ball = document.getElementById('springBall');
        var stage = ball.parentElement.clientWidth - 64;
        var to = ball.dataset.at === 'end' ? 0 : stage;
        ball.dataset.at = to === 0 ? 'start' : 'end';
        animate(ball, { transform: 'translateX(' + to + 'px)' }, {
            type: 'spring',
            bounce: parseFloat(bounceIn.value),
            duration: parseFloat(durIn.value)
        });
    });

    /* 3 — Stagger -------------------------------------------------------- */
    function runStagger(delay) {
        var items = document.querySelectorAll('#staggerRow span');
        animate(items, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] },
            { duration: 0.42, ease: C.EASE.out, delay: delay });
    }
    on('stagger', function () { runStagger(stagger(0.06)); });
    on('stagger-none', function () { runStagger(0); });

    /* 4 — Tab indicator, clipped ----------------------------------------- */
    (function tabs() {
        var root = document.getElementById('clipTabs');
        if (!root) return;
        var active = root.querySelector('.tabs-active');
        var buttons = root.querySelectorAll('.tabs-row:not(.tabs-active) button');
        buttons.forEach(function (b, i) {
            b.addEventListener('click', function () {
                var n = buttons.length;
                var left = (i / n) * 100;
                var right = 100 - ((i + 1) / n) * 100;
                // One element being revealed, rather than two colours interpolating.
                active.style.clipPath = 'inset(0 ' + right + '% 0 ' + left + '% round 999px)';
            });
        });
    })();

    /* 5 — Squash & stretch ----------------------------------------------- */
    on('drop', function () {
        var ball = document.getElementById('dropBall');
        var fall = ball.parentElement.clientHeight - 12 - 36 - 12;
        if (reduced) { animate(ball, { opacity: [0.4, 1] }, { duration: 0.2 }); return; }

        // Anticipation, fall, impact deformation, follow-through.
        // Motion takes a keyframes object with per-property arrays and `times`
        // in the options — not WAAPI's array of keyframe objects.
        animate(ball, {
            transform: [
                'translateY(-8px) scale(1, 1)',                       // wind up
                'translateY(' + fall + 'px) scale(0.92, 1.12)',       // stretched by the fall
                'translateY(' + fall + 'px) scale(1.25, 0.75)',       // squashed on impact
                'translateY(' + (fall - 22) + 'px) scale(0.96, 1.06)',// follow-through
                'translateY(' + fall + 'px) scale(1, 1)'              // settle
            ]
        }, {
            duration: 1.1,
            times: [0, 0.45, 0.58, 0.76, 1],
            ease: C.EASE.inOut
        });
    });

    /* 6 — Number ticker -------------------------------------------------- */
    on('ticker', function () {
        [document.getElementById('tickerGood'), document.getElementById('tickerBad')].forEach(function (el) {
            var target = 1000 + Math.floor(Math.random() * 8000);
            // A motionValue, not animate(0, target, …) — Motion 13 reads a bare
            // number as an animation target, not as a starting value.
            var mv = M.motionValue(0);
            mv.on("change", function (v) { el.textContent = Math.round(v).toLocaleString(); });
            animate(mv, target, { duration: reduced ? 0.2 : 1.4, ease: C.EASE.out });
        });
    });

    /* 7 — 3D flip -------------------------------------------------------- */
    on('flip', function () {
        document.getElementById('flipCard').classList.toggle('is-flipped');
    });

    /* 8 — Typewriter ----------------------------------------------------- */
    on('type', function () {
        var el = document.getElementById('typed');
        var text = 'What do I need to know today?';
        el.classList.remove('is-done');
        if (reduced) { el.textContent = text; el.classList.add('is-done'); return; }
        el.textContent = '';
        var i = 0;
        var timer = setInterval(function () {
            el.textContent = text.slice(0, ++i);
            if (i >= text.length) { clearInterval(timer); el.classList.add('is-done'); }
        }, 28);
    });

    /* 9 — Drag to dismiss ------------------------------------------------ */
    (function dismiss() {
        var card = document.getElementById('dismissCard');
        var read = document.getElementById('dismissRead');
        if (!card) return;
        var dragging = false, startX = 0, startT = 0, dx = 0;

        card.addEventListener('pointerdown', function (e) {
            dragging = true; startX = e.clientX; startT = e.timeStamp; dx = 0;
            card.setPointerCapture(e.pointerId);
            card.style.transition = 'none';
        });
        card.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            dx = e.clientX - startX;
            card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 30).toFixed(2) + 'deg)';
            card.style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 260));
        });
        function end(e) {
            if (!dragging) return;
            dragging = false;
            var elapsed = e.timeStamp - startT;
            var v = Math.abs(dx) / Math.max(elapsed, 1);
            read.textContent = 'velocity: ' + v.toFixed(3) + (v > 0.11 ? '  → dismissed (flick)' : '  → returned');
            card.style.transition = '';
            if (C.shouldDismiss(dx, elapsed, 120)) {
                C.haptic('tap');
                animate(card, { transform: 'translateX(' + (dx > 0 ? 400 : -400) + 'px)', opacity: 0 },
                    { duration: 0.32, ease: C.EASE.out }).then(function () {
                        card.style.transform = ''; card.style.opacity = '';
                        animate(card, { opacity: [0, 1] }, { duration: 0.3, delay: 0.3 });
                    });
            } else {
                animate(card, { transform: 'translateX(0px) rotate(0deg)', opacity: 1 }, C.SPRING.ui);
            }
        }
        card.addEventListener('pointerup', end);
        card.addEventListener('pointercancel', end);
    })();

    /* 10 — WAAPI --------------------------------------------------------- */
    on('waapi', function () {
        var box = document.getElementById('waapiBox');
        box.animate(
            [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
            { duration: reduced ? 1 : 800, fill: 'forwards', easing: 'cubic-bezier(0.77, 0, 0.175, 1)' }
        );
    });

    /* 11 — @starting-style ----------------------------------------------- */
    var chipWords = ['Inbox', 'Calendar', 'Vet', 'School', 'Board', 'Care', 'Gala', 'Trip'];
    var chipIndex = 0;
    on('starting', function () {
        var stage = document.getElementById('startStage');
        var chip = document.createElement('span');
        chip.className = 'start-chip';
        chip.textContent = chipWords[chipIndex++ % chipWords.length];
        stage.appendChild(chip);
        if (stage.children.length > 8) stage.removeChild(stage.firstElementChild);
    });

    /* 12 — Motion blur --------------------------------------------------- */
    function travel(withBlur) {
        var box = document.getElementById('blurBox');
        var d = box.parentElement.clientWidth - 72;
        var to = box.dataset.at === 'end' ? 0 : d;
        box.dataset.at = to === 0 ? 'start' : 'end';

        animate(box, { transform: 'translateX(' + to + 'px)' }, { duration: 0.36, ease: C.EASE.inOut });
        if (withBlur && !reduced) {
            animate(box, { filter: ['blur(0px)', 'blur(3px)', 'blur(0px)'] },
                { duration: 0.36, ease: 'linear' });
        }
    }
    on('blur-on', function () { travel(true); });
    on('blur-off', function () { travel(false); });
})();
