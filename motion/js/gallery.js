/**
 * Exhale — Capabilities deck
 *
 * A stack you flick through rather than a rail you scroll. The rule that makes
 * it feel responsive is that **velocity decides, not distance**: a fast flick
 * commits even if the card barely moved. Requiring a drag threshold is exactly
 * what makes a swipe feel like it needs permission first.
 *
 * The front card is the section's state — the phone beside the deck shows that
 * capability's conversation — so every change announces itself once, here.
 */
(function () {
    'use strict';

    // Apple's spring parameterisation: a damping ratio and a response time,
    // not mass/stiffness/damping. damping 1.0 = critically damped, no
    // overshoot. It integrates from wherever the value currently is, so a
    // running spring can be retargeted mid-flight without a jump.
    function makeSpring(opts) {
        var response = opts.response || 0.4;
        var damping = opts.damping == null ? 1 : opts.damping;
        var w = (2 * Math.PI) / response;
        var x = opts.from - opts.to;
        var v = opts.velocity || 0;
        var target = opts.to;
        var last = null;
        var frame = null;

        function step(now) {
            if (last === null) last = now;
            var dt = Math.min((now - last) / 1000, 1 / 30); // a stalled tab can't explode it
            last = now;

            var a = -w * w * x - 2 * damping * w * v;
            v += a * dt;
            x += v * dt;

            var eps = opts.epsilon || 0.35;
            var vEps = opts.vEpsilon || 12;
            if (Math.abs(x) < eps && Math.abs(v) < vEps) {
                opts.onUpdate(target);
                if (opts.onDone) opts.onDone();
                return;
            }
            opts.onUpdate(target + x);
            frame = requestAnimationFrame(step);
        }

        frame = requestAnimationFrame(step);

        return { stop: function () { if (frame) cancelAnimationFrame(frame); } };
    }

    /**
     * A card leaving the deck is a one-way trip, so it gets a tween rather than
     * a spring. A spring's tail is asymptotic: the card is off screen in 300ms
     * but the integrator keeps chasing the last pixel for seconds, and the deck
     * can't accept another flick until it lands. Duration scales with the
     * throw — a hard flick should leave faster than a slow shove.
     */
    function tween(opts) {
        var start = null;
        var frame = null;

        function step(now) {
            if (start === null) start = now;
            var t = Math.min((now - start) / opts.duration, 1);
            var eased = 1 - Math.pow(1 - t, 3);
            opts.onUpdate(opts.from + (opts.to - opts.from) * eased);
            if (t < 1) frame = requestAnimationFrame(step);
            else if (opts.onDone) opts.onDone();
        }

        frame = requestAnimationFrame(step);
        return { stop: function () { if (frame) cancelAnimationFrame(frame); } };
    }

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    /* Velocity-based commit: a flick should be enough, regardless of how far it
       travelled. 0.11 px/ms is the threshold used across this project. */
    function shouldCommit(distance, elapsedMs, threshold) {
        var velocity = Math.abs(distance) / Math.max(elapsedMs, 1);
        return Math.abs(distance) >= (threshold || 110) || velocity > 0.11;
    }

    function initGallery() {
        var gallery = document.querySelector('[data-gallery]');
        if (!gallery) return;

        var stack = gallery.querySelector('[data-deck]');
        var cards = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-item]'));
        if (!stack || cards.length < 2) return;

        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // order[0] is the card on top. Flicking moves the front card to the
        // back, so the deck cycles rather than running out.
        var order = cards.map(function (_, i) { return i; });
        var busy = false;

        function paint() {
            order.forEach(function (cardIndex, depth) {
                var card = cards[cardIndex];
                card.setAttribute('data-depth', String(Math.min(depth, 2)));
                card.classList.toggle('is-active', depth === 0);
                // Only the front card is reachable; the ones behind it are
                // decoration until they come forward.
                card.setAttribute('aria-hidden', depth === 0 ? 'false' : 'true');
                card.querySelectorAll('button, a').forEach(function (el) {
                    if (depth === 0) el.removeAttribute('tabindex');
                    else el.setAttribute('tabindex', '-1');
                });
            });

            gallery.dispatchEvent(new CustomEvent('gallery:change', {
                bubbles: true,
                detail: { index: order[0] }
            }));
        }

        function setX(card, x, opacity) {
            card.style.transform = x
                ? 'translate3d(' + x + 'px, 0, 0) rotate(' + (x / 34).toFixed(2) + 'deg)'
                : '';
            card.style.opacity = opacity == null ? '' : String(opacity);
        }

        // Send the front card away and bring the next one forward.
        function advance(direction, velocity) {
            if (busy) return;
            var card = cards[order[0]];
            busy = true;

            function land() {
                card.classList.remove('is-gone', 'is-grabbing');
                card.style.transform = '';
                card.style.opacity = '';
                order.push(order.shift());
                paint();
                busy = false;
            }

            if (reduced) { land(); return; }

            var width = stack.offsetWidth || 320;
            var to = direction * (width + 140);
            var start = parseFloat(card.dataset.x || '0');

            card.classList.add('is-gone');
            tween({
                from: start,
                to: to,
                duration: clamp(340 - Math.abs(velocity || 0) / 12, 190, 340),
                onUpdate: function (x) {
                    // Solid until it's genuinely on its way out — a card that
                    // dims as it moves lets the pile beneath read through it.
                    var past = Math.max(0, Math.abs(x) - width * 0.35);
                    setX(card, x, Math.max(0, 1 - past / (width * 0.45)));
                },
                onDone: land
            });
        }

        // Bring the last card back to the front, entering from the side it left.
        function retreat() {
            if (busy) return;
            busy = true;
            order.unshift(order.pop());
            var card = cards[order[0]];
            paint();

            if (reduced) { busy = false; return; }

            var width = stack.offsetWidth || 320;
            card.classList.add('is-gone');
            setX(card, -(width + 140), 0);

            // Coming back is an arrival, so it settles rather than stopping —
            // but with a looser epsilon than a short spring would need, or the
            // last pixel of a 900px journey holds the deck for a second.
            makeSpring({
                from: -(width + 140),
                to: 0,
                response: 0.46,
                damping: 1,
                epsilon: 1.5,
                vEpsilon: 60,
                onUpdate: function (x) {
                    setX(card, x, Math.min(1, 1 - Math.abs(x) / (width * 0.9)));
                },
                onDone: function () {
                    card.classList.remove('is-gone');
                    card.style.transform = '';
                    card.style.opacity = '';
                    busy = false;
                }
            });
        }

        /* --- the gesture ---------------------------------------------------- */
        var dragging = false, pointerId = null, startX = 0, startT = 0, dx = 0;
        var moved = 0, pressed = null, springBack = null;

        stack.addEventListener('pointerdown', function (e) {
            if (busy || e.button > 0) return;
            var card = cards[order[0]];
            if (!card.contains(e.target)) return;

            dragging = true;
            pointerId = e.pointerId;
            startX = e.clientX;
            startT = e.timeStamp;
            dx = 0;
            moved = 0;
            // A tap that lands on a prompt has to survive the pointer capture
            // below, which retargets the click to the capturing element.
            pressed = e.target.closest ? e.target.closest('button, a, [role="button"]') : null;

            if (springBack) { springBack.stop(); springBack = null; }
            card.setPointerCapture(e.pointerId);
            card.classList.add('is-grabbing');
        });

        stack.addEventListener('pointermove', function (e) {
            if (!dragging || e.pointerId !== pointerId) return;
            var card = cards[order[0]];

            dx = e.clientX - startX;
            moved = Math.max(moved, Math.abs(dx));
            card.dataset.x = String(dx);
            setX(card, dx);
        });

        function endDrag(e) {
            if (!dragging || (e && e.pointerId !== pointerId)) return;
            dragging = false;

            var card = cards[order[0]];
            try { card.releasePointerCapture(pointerId); } catch (err) {}
            pointerId = null;
            card.classList.remove('is-grabbing');

            var elapsed = (e ? e.timeStamp : startT) - startT;
            var velocity = (dx / Math.max(elapsed, 1)) * 1000;   // px/s for the spring
            card.dataset.x = String(dx);

            if (dx !== 0 && shouldCommit(dx, elapsed)) {
                advance(dx > 0 ? 1 : -1, velocity);
                return;
            }

            // Not enough — it comes back, carrying whatever speed it had.
            if (reduced) { setX(card, 0); card.dataset.x = '0'; return; }
            springBack = makeSpring({
                from: dx,
                to: 0,
                velocity: velocity,
                response: 0.4,
                damping: 0.82,   // a little overshoot: it snaps back, not eases back
                onUpdate: function (x) { setX(card, x); },
                onDone: function () {
                    setX(card, 0);
                    card.dataset.x = '0';
                    springBack = null;
                }
            });
        }

        stack.addEventListener('pointerup', endDrag);
        stack.addEventListener('pointercancel', endDrag);

        // Pointer capture retargets the click to the card, so a tap on a prompt
        // inside would otherwise never reach it. A real drag eats the click.
        stack.addEventListener('click', function (e) {
            if (moved > 6) {
                e.preventDefault();
                e.stopPropagation();
                moved = 0;
                pressed = null;
                return;
            }
            moved = 0;
            if (pressed && e.target !== pressed) {
                var target = pressed;
                pressed = null;
                target.click();
            }
        }, true);

        stack.addEventListener('dragstart', function (e) { e.preventDefault(); });

        stack.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                advance(1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                retreat();
            }
        });

        /* --- the affordance -------------------------------------------------
           A fanned pile says "there are more"; it doesn't say "this one moves".
           So the first time the deck is on screen and still untouched, the top
           card pulls a few pixels toward the exit and springs back — the same
           gesture the reader would make, performed once. */
        var hint = gallery.querySelector('[data-deck-hint]');
        var touched = false;

        function markTouched() {
            if (touched) return;
            touched = true;
            if (hint) hint.classList.add('is-used');
        }

        function nudge() {
            if (touched || busy || reduced) return;
            var card = cards[order[0]];
            card.classList.add('is-nudging');
            makeSpring({
                from: 0,
                to: 0,
                velocity: -260,     // a push, not a move to somewhere
                response: 0.55,
                damping: 0.55,      // loose enough to swing back and settle
                onUpdate: function (x) { if (!touched) setX(card, x); },
                onDone: function () {
                    card.classList.remove('is-nudging');
                    if (!touched) setX(card, 0);
                }
            });
        }

        stack.addEventListener('pointerdown', markTouched);
        stack.addEventListener('keydown', markTouched);

        if ('IntersectionObserver' in window) {
            var seen = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    seen.disconnect();
                    setTimeout(nudge, 900);
                });
            }, { threshold: 0.55 });
            seen.observe(stack);
        }

        paint();
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
