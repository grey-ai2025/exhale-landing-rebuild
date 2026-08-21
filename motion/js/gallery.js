/**
 * Exhale — Capabilities deck
 *
 * A stack the scroll wheel deals. Each card is sticky at the same offset, so
 * scrolling brings the next one up over the one before it; whichever card is
 * currently on top is the section's state, and the phone beside it shows that
 * capability's conversation.
 *
 * Scroll rather than a flick because scrolling is what a reader is already
 * doing. A gesture has to be discovered first — and on a page this is the only
 * place one would have been required.
 */
(function () {
    'use strict';

    function initGallery() {
        var gallery = document.querySelector('[data-gallery]');
        if (!gallery) return;

        var stack = gallery.querySelector('[data-deck]');
        var cards = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-item]'));
        if (!stack || !cards.length) return;

        var hint = gallery.querySelector('[data-deck-hint]');
        var active = -1;
        var ticking = false;

        // Below this the cards are a plain list and answer for themselves —
        // there is no pile to be on top of, and no phone to drive. Painting
        // depth here would dim two of the three cards for nothing.
        var stacked = window.matchMedia('(max-width: 900px)');

        function clear() {
            active = -1;
            cards.forEach(function (card) {
                card.classList.remove('is-active', 'is-covered');
                card.querySelectorAll('button, a').forEach(function (el) {
                    el.removeAttribute('tabindex');
                });
            });
            if (hint) hint.classList.remove('is-used');
        }

        function paint(i) {
            if (i === active) return;
            active = i;

            cards.forEach(function (card, n) {
                card.classList.toggle('is-active', n === i);
                // Covered, not gone: the cards you have read stay on screen
                // underneath, which is what keeps the pile reading as a pile.
                card.classList.toggle('is-covered', n < i);

                // A covered card's prompts can't be clicked — the card on top
                // is in the way — so they mustn't be tabbable either, or focus
                // lands on a control nobody can see.
                var buried = n !== i;
                card.querySelectorAll('button, a').forEach(function (el) {
                    if (buried) el.setAttribute('tabindex', '-1');
                    else el.removeAttribute('tabindex');
                });
            });

            if (hint) hint.classList.toggle('is-used', i > 0);

            gallery.dispatchEvent(new CustomEvent('gallery:change', {
                bubbles: true,
                detail: { index: i }
            }));
        }

        // The card on top is the last one that has reached its sticky rest
        // position. Reading it from geometry rather than from an observer means
        // it can't disagree with what is actually painted.
        function update() {
            ticking = false;

            if (stacked.matches) {
                if (active !== -1) clear();
                return;
            }

            // The rest line comes from the sticky offset itself, not from where
            // the first card happens to be. At the end of the stack every card
            // is pushed up together by the container, and reading the line off
            // card 0 there made the index jump backwards mid-scroll.
            var restLine = parseFloat(getComputedStyle(cards[0]).top) || 0;
            var top = 0;

            for (var i = 0; i < cards.length; i++) {
                var rect = cards[i].getBoundingClientRect();
                // Halfway, not all the way. A card covers the one beneath it
                // over its own height of scrolling; waiting for it to reach the
                // rest line means the phone still answers for a card that is
                // four fifths hidden. It changes hands when the incoming card
                // is the one you're actually reading.
                if (rect.top <= restLine + rect.height * 0.45) top = i;
            }

            paint(top);
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        // Crossing the breakpoint changes which mode is correct, and a resize
        // alone can leave the deck painted from the width it just left.
        if (stacked.addEventListener) stacked.addEventListener('change', update);
        update();
    }

    /**
     * The deck cannot use a scroll-driven timeline: `.feature-card` is
     * `overflow: hidden`, which becomes the scroll container for a `view()`
     * timeline inside it and freezes the animation at one end. So the card
     * wipes and the icon line-draw in craft.css are driven by this class.
     */
    function initGalleryReveal() {
        var gallery = document.querySelector('[data-gallery]');
        if (!gallery) return;

        if (!('IntersectionObserver' in window)) {
            gallery.classList.add('revealed');
            return;
        }

        // Toggled, not fired once. Every other reveal on this page is
        // scroll-coupled and replays on the way back up; unobserving here
        // would make this the one section that dies after a single pass.
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                entry.target.classList.toggle('revealed', entry.isIntersecting);
            });
        }, { rootMargin: '0px 0px -25% 0px', threshold: 0.15 });

        io.observe(gallery);
    }

    function init() {
        initGallery();
        initGalleryReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
