/**
 * Exhale — The Reality scrollytelling section
 *
 * A zero-height band across the middle of the viewport decides which step is
 * active: whichever explanation is crossing the centre line owns the canvas.
 * That keeps the pinned visual and the copy you are actually reading in sync,
 * which a plain "is it visible" test does not.
 */
(function () {
    'use strict';

    function initScrolly() {
        var root = document.querySelector('[data-scrolly]');
        if (!root) return;

        var scenes = Array.prototype.slice.call(root.querySelectorAll('[data-scene]'));
        var steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
        if (!scenes.length || scenes.length !== steps.length) return;

        var current = -1;

        function setActive(i) {
            if (i === current) return;
            current = i;

            scenes.forEach(function (scene, n) {
                scene.classList.toggle('is-active', n === i);
                // Everything already read stays on screen, receded — it does
                // not vanish, so the stack reads as a deck you are moving through.
                scene.classList.toggle('is-past', n < i);
            });

            steps.forEach(function (step, n) {
                step.classList.toggle('is-active', n === i);
            });
        }

        // Start on the first frame so the canvas is never empty on arrival.
        setActive(0);

        if (!('IntersectionObserver' in window)) {
            // No observer: show every step at full strength rather than
            // leaving three of them dimmed to 25% forever.
            steps.forEach(function (step) { step.classList.add('is-active'); });
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
