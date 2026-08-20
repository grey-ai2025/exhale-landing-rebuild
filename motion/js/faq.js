/**
 * Exhale — FAQ disclosure list
 *
 * The height animation lives in CSS (grid-template-rows: 0fr -> 1fr), which
 * keeps it interruptible and correct when the answer reflows. This only owns
 * state: the open class, aria-expanded, and keeping a collapsed answer out of
 * the tab order and the accessibility tree.
 */
(function () {
    'use strict';

    function init() {
        var lists = document.querySelectorAll('[data-accordion]');
        if (!lists.length) return;

        Array.prototype.forEach.call(lists, function (list) {
            var items = list.querySelectorAll('.faq-item');

            Array.prototype.forEach.call(items, function (item) {
                var trigger = item.querySelector('.faq-trigger');
                var panel = item.querySelector('.faq-panel');
                if (!trigger || !panel) return;

                // Collapsed panels are visually clipped, not removed, so
                // without this their links and text stay reachable by Tab and
                // by a screen reader.
                setInert(panel, true);

                trigger.addEventListener('click', function () {
                    var open = !item.classList.contains('is-open');
                    item.classList.toggle('is-open', open);
                    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
                    setInert(panel, !open);
                });
            });
        });
    }

    function setInert(el, on) {
        if ('inert' in el) {
            el.inert = on;
            return;
        }
        // Older browsers: aria-hidden alone still hides it from assistive tech.
        if (on) el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
