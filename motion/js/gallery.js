/**
 * Exhale — Capabilities Gallery
 *
 * Native scrolling already carries momentum and rubber-banding on touch, so
 * the pointer handler below only takes over for a mouse, where the platform
 * gives you nothing.
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

            if (Math.abs(x) < 0.35 && Math.abs(v) < 12) {
                opts.onUpdate(target);
                if (opts.onDone) opts.onDone();
                return;
            }
            opts.onUpdate(target + x);
            frame = requestAnimationFrame(step);
        }

        frame = requestAnimationFrame(step);

        return {
            // Retarget without losing velocity — this is what keeps an
            // interrupted gesture continuous instead of hitting a wall.
            retarget: function (next) { x = target + x - next; target = next; },
            stop: function () { if (frame) cancelAnimationFrame(frame); }
        };
    }

    // Where a flick comes to rest, using the same exponential decay as
    // native scroll deceleration.
    function projectMomentum(velocity) {
        var d = 0.998;
        return (velocity / 1000) * d / (1 - d);
    }

    // Progressive resistance past a boundary — real things slow before they stop.
    function rubberband(overshoot, dimension) {
        var c = 0.55;
        return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
    }

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function initGallery() {
        var gallery = document.querySelector('[data-gallery]');
        if (!gallery) return;

        var viewport = gallery.querySelector('[data-gallery-viewport]');
        var track = gallery.querySelector('[data-gallery-track]');
        var items = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-item]'));
        var dotsWrap = gallery.querySelector('[data-gallery-dots]');
        var prevBtn = gallery.querySelector('[data-gallery-prev]');
        var nextBtn = gallery.querySelector('[data-gallery-next]');
        // Dots and arrows are optional chrome — the gallery is drag- and
        // scroll-driven, so it has to keep working without them in the markup.
        if (!viewport || !track || !items.length) return;

        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

        var snaps = [];
        var maxScroll = 0;
        var active = 0;
        var lastPrevDisabled = null;
        var lastNextDisabled = null;
        var scrollSpring = null;
        var bandSpring = null;

        function measure() {
            var base = items[0].offsetLeft;
            maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
            snaps = items.map(function (el) {
                return clamp(el.offsetLeft - base, 0, maxScroll);
            });
        }

        function nearestSnap(pos) {
            var best = 0, bestDist = Infinity;
            for (var i = 0; i < snaps.length; i++) {
                var d = Math.abs(snaps[i] - pos);
                if (d < bestDist) { bestDist = d; best = i; }
            }
            return best;
        }

        if (dotsWrap) {
            items.forEach(function (item, i) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'gallery-dot';
                var heading = item.querySelector('h3');
                dot.setAttribute('aria-label', heading ? heading.textContent.trim() : 'Capability ' + (i + 1));
                dot.appendChild(document.createElement('span')).className = 'gallery-dot-fill';
                dot.addEventListener('click', function () { goTo(i); });
                dotsWrap.appendChild(dot);
            });
        }
        var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

        function setActive(i) {
            if (i === active) return;
            active = i;
            dots.forEach(function (d, n) {
                d.classList.toggle('is-active', n === i);
                d.setAttribute('aria-current', n === i ? 'true' : 'false');
            });
        }

        // Called on every spring frame, so it must not write unless something
        // actually changed. setActive already guards itself.
        function syncControls() {
            var atStart = viewport.scrollLeft <= 2;
            var atEnd = viewport.scrollLeft >= maxScroll - 2;

            if (prevBtn && atStart !== lastPrevDisabled) {
                prevBtn.disabled = atStart;
                lastPrevDisabled = atStart;
            }
            if (nextBtn && atEnd !== lastNextDisabled) {
                nextBtn.disabled = atEnd;
                lastNextDisabled = atEnd;
            }

            setActive(nearestSnap(viewport.scrollLeft));
        }

        function goTo(i, velocity) {
            measure();
            var target = clamp(snaps[clamp(i, 0, snaps.length - 1)], 0, maxScroll);

            if (reduced.matches) {
                if (scrollSpring) { scrollSpring.stop(); scrollSpring = null; }
                viewport.scrollLeft = target;
                viewport.style.scrollSnapType = '';
                syncControls();
                return;
            }

            // A spring already in flight keeps its velocity and simply takes a
            // new target. Stopping and restarting at zero is the discontinuity
            // you feel as a wall when pressing the arrow twice quickly.
            if (scrollSpring && !velocity) {
                scrollSpring.retarget(target);
                syncControls();
                return;
            }
            if (scrollSpring) { scrollSpring.stop(); scrollSpring = null; }

            viewport.style.scrollSnapType = 'none';
            scrollSpring = makeSpring({
                from: viewport.scrollLeft,
                to: target,
                velocity: velocity || 0,
                response: 0.44,
                damping: 1,
                onUpdate: function (v) { viewport.scrollLeft = v; syncControls(); },
                onDone: function () {
                    scrollSpring = null;
                    viewport.style.scrollSnapType = '';
                    syncControls();
                }
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', function () { goTo(active - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { goTo(active + 1); });

        viewport.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
        });

        viewport.addEventListener('scroll', function () {
            if (!scrollSpring) syncControls();
        }, { passive: true });

        var dragging = false, pointerId = null, startX = 0, startScroll = 0, moved = 0, band = 0;
        var history = [];

        function setBand(px) {
            band = px;
            track.style.transform = px ? 'translate3d(' + px + 'px,0,0)' : '';
        }

        viewport.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            measure();
            if (maxScroll <= 0) return;

            dragging = true;
            pointerId = e.pointerId;
            startX = e.clientX;
            startScroll = viewport.scrollLeft;
            moved = 0;
            history = [{ x: e.clientX, t: e.timeStamp }];

            if (scrollSpring) { scrollSpring.stop(); scrollSpring = null; }
            if (bandSpring) { bandSpring.stop(); bandSpring = null; }

            viewport.setPointerCapture(e.pointerId);
            gallery.classList.add('is-dragging');
            viewport.style.scrollSnapType = 'none';
        });

        viewport.addEventListener('pointermove', function (e) {
            if (!dragging || e.pointerId !== pointerId) return;

            var dx = e.clientX - startX;
            moved = Math.max(moved, Math.abs(dx));

            history.push({ x: e.clientX, t: e.timeStamp });
            if (history.length > 6) history.shift();

            var wanted = startScroll - dx;
            var clamped = clamp(wanted, 0, maxScroll);
            viewport.scrollLeft = clamped;

            // Past an edge the content keeps following the pointer, just less
            // and less — a hard stop reads as frozen.
            var overshoot = wanted - clamped;
            setBand(overshoot ? -rubberband(overshoot, viewport.clientWidth) : 0);
        });

        function endDrag(e) {
            if (!dragging || (e && e.pointerId !== pointerId)) return;
            dragging = false;
            gallery.classList.remove('is-dragging');
            try { viewport.releasePointerCapture(pointerId); } catch (err) {}
            pointerId = null;

            // Velocity from the tail of the move history, in px/s.
            var velocity = 0;
            if (history.length > 1) {
                var a = history[0];
                var b = history[history.length - 1];
                var dt = b.t - a.t;
                if (dt > 0) velocity = ((b.x - a.x) / dt) * 1000;
            }
            var scrollVelocity = -velocity; // dragging left increases scrollLeft

            if (band) {
                bandSpring = makeSpring({
                    from: band, to: 0, response: 0.35, damping: 1,
                    onUpdate: setBand,
                    onDone: function () { bandSpring = null; setBand(0); }
                });
            }

            // Land where the flick was going, not where the pointer let go.
            var projected = viewport.scrollLeft + projectMomentum(scrollVelocity);
            goTo(nearestSnap(clamp(projected, 0, maxScroll)), scrollVelocity);
        }

        viewport.addEventListener('pointerup', endDrag);
        viewport.addEventListener('pointercancel', endDrag);

        // A drag that ends on a link shouldn't also count as a click.
        viewport.addEventListener('click', function (e) {
            if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
            moved = 0;
        }, true);

        viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { measure(); syncControls(); }, 150);
        });

        measure();
        active = -1;   // force the first sync to paint the indicators
        lastPrevDisabled = null;
        lastNextDisabled = null;
        syncControls();
    }

    /**
     * The gallery cannot use a scroll-driven timeline: `.gallery-viewport`
     * scrolls horizontally and `.feature-card` is `overflow: hidden`, and
     * either becomes the scroll container for a `view()` timeline inside it,
     * which freezes the animation at one end. So the card wipes and the icon
     * line-draw in craft.css are driven by this class instead.
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
