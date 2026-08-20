/**
 * Exhale — landing behaviour, built on Motion.
 *
 * Division of labour, per the skills:
 *   - CSS owns predetermined motion (press feedback, hover, entrances). It
 *     runs off the main thread and stays smooth while the page is loading.
 *   - Motion owns dynamic, interruptible, gesture-driven motion — springs
 *     that carry velocity through an interruption, which CSS cannot do.
 */
(function () {
    'use strict';

    var C = window.MotionCore;
    var M = window.Motion;
    var animate = M && M.animate;
    var inView = M && M.inView;
    var stagger = M && M.stagger;
    var scroll = M && M.scroll;
    var springValue = M && M.springValue;

    var root = document.documentElement;

    /* ------------------------------------------------------------------ */
    /* Hero entrance — staggered, 30-80ms between items                    */
    /* ------------------------------------------------------------------ */
    function initLoad() {
        var items = document.querySelectorAll('[data-load]');
        if (!items.length) return;

        if (!animate || C.prefersReduced()) {
            root.classList.add('is-loaded');
            return;
        }

        root.classList.add('is-loaded');
        animate(
            items,
            { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] },
            { duration: C.DUR.marketing, ease: C.EASE.out, delay: stagger(0.06) }
        );
    }

    /* ------------------------------------------------------------------ */
    /* Scroll reveals                                                      */
    /* inView, not a scroll listener — the browser does the intersection    */
    /* work and we only pay when something actually crosses.               */
    /* ------------------------------------------------------------------ */
    function initReveal() {
        var els = document.querySelectorAll('.reveal');
        if (!els.length) return;

        if (!inView || !animate) {
            els.forEach(function (el) { el.classList.add('is-in'); });
            return;
        }

        if (C.prefersReduced()) {
            // Under reduced motion the content is simply present. Gating it on
            // scroll position buys nothing — there is no entrance to see — and
            // anything the observer misses would be stranded invisible, which
            // is a far worse failure than a missing animation.
            els.forEach(function (el) { el.classList.add('is-in'); });
            return;
        }

        inView(els, function (el) {
            var group = el.querySelectorAll('.card, .step, .acc-item');
            animate(el,
                { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
                { duration: 0.55, ease: C.EASE.out }
            );
            if (group.length > 1) {
                animate(group,
                    { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] },
                    { duration: 0.5, ease: C.EASE.out, delay: stagger(0.06) }
                );
            }
            el.classList.add('is-in');
            // Leave it observed: reveals replay on the way back up, matching
            // the rest of the site.
        }, { amount: 0.15, margin: '0px 0px -10% 0px' });
    }

    /* ------------------------------------------------------------------ */
    /* Line drawing                                                        */
    /* Every shape carries pathLength="100", so one dash length draws them  */
    /* all regardless of real geometry.                                     */
    /* ------------------------------------------------------------------ */
    function initLineDraw() {
        // Content icons only. Persistent chrome must never start undrawn: it is
        // always on screen, so there is no entrance to hook the draw to, and a
        // nav icon at dashoffset 100 is simply an invisible button.
        var icons = document.querySelectorAll('.card-icon svg');
        if (!icons.length || !inView || !animate || C.prefersReduced()) return;

        icons.forEach(function (svg) {
            var shapes = svg.querySelectorAll('[pathLength]');
            if (!shapes.length) return;
            shapes.forEach(function (s) {
                s.style.strokeDasharray = '100';
                s.style.strokeDashoffset = '100';
            });
            inView(svg, function () {
                animate(shapes, { strokeDashoffset: [100, 0] },
                    { duration: 0.8, ease: C.EASE.out, delay: stagger(0.08) });
            }, { amount: 0.6 });
        });
    }

    /* ------------------------------------------------------------------ */
    /* Hero recedes as you leave it — scroll-linked, not a scroll handler   */
    /* ------------------------------------------------------------------ */
    function initHeroExit() {
        var heroInner = document.querySelector('.hero-inner');
        if (!heroInner || !scroll || !animate || C.prefersReduced()) return;

        scroll(
            animate(heroInner,
                { opacity: [1, 0], transform: ['translateY(0px) scale(1)', 'translateY(-48px) scale(0.96)'] },
                { ease: 'linear' }
            ),
            { target: document.querySelector('.hero'), offset: ['center start', 'end start'] }
        );
    }

    /* ------------------------------------------------------------------ */
    /* Pointer parallax                                                    */
    /* Decorative, and sanctioned as such on a marketing page. Tying the    */
    /* value straight to the pointer feels artificial because it has no     */
    /* momentum — a spring gives it some.                                   */
    /* ------------------------------------------------------------------ */
    function initParallax() {
        var layer = document.querySelector('[data-parallax]');
        if (!layer || !springValue || !C.hasFinePointer() || C.prefersReduced()) return;

        var x = springValue(0, { stiffness: 90, damping: 20 });
        var y = springValue(0, { stiffness: 90, damping: 20 });

        function apply() {
            layer.style.transform = 'translate3d(' + x.get().toFixed(2) + 'px,' + y.get().toFixed(2) + 'px,0)';
        }
        x.on('change', apply);
        y.on('change', apply);

        window.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            var cx = (e.clientX / window.innerWidth) - 0.5;
            var cy = (e.clientY / window.innerHeight) - 0.5;
            x.set(cx * 28);
            y.set(cy * 20);
        }, { passive: true });
    }

    /* ------------------------------------------------------------------ */
    /* Marquee — built from copy already on the page                       */
    /* ------------------------------------------------------------------ */
    function initMarquee() {
        var track = document.querySelector('[data-marquee]');
        if (!track) return;

        var items = [
            'School newsletters', 'Vet reminders', 'Board papers', 'Care schedules',
            'Gala invitations', 'Specialist appointments', 'PTA threads', 'Field trip forms',
            'Caregiver updates', 'Committee deadlines'
        ];

        // Rendered twice so translateX(-50%) loops seamlessly.
        var html = items.concat(items).map(function (t) {
            return '<span class="marquee-item"><span class="marquee-dot" aria-hidden="true"></span>' + t + '</span>';
        }).join('');
        track.innerHTML = html;
    }

    /* ------------------------------------------------------------------ */
    /* Theme                                                               */
    /* ------------------------------------------------------------------ */
    function initTheme() {
        var btn = document.getElementById('themeToggle');
        var label = document.getElementById('prefTheme');

        function describe() {
            var saved = null;
            try { saved = localStorage.getItem('theme'); } catch (e) {}
            if (label) label.textContent = saved ? (saved === 'dark' ? 'Dark' : 'Light') : 'System';
        }
        describe();

        if (!btn) return;
        btn.addEventListener('click', function () {
            root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
            C.haptic('tap');
            describe();
        });

        var motionLabel = document.getElementById('prefMotion');
        if (motionLabel) motionLabel.textContent = C.prefersReduced() ? 'Reduced' : 'Full';

        // Hold-to-confirm in the preferences popover clears saved state.
        document.addEventListener('holdconfirm', function () {
            try { localStorage.removeItem('theme'); } catch (e) {}
            root.dataset.theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            describe();
            if (window.ExhaleUI) window.ExhaleUI.toast('Saved preferences cleared');
        });
    }

    /* ------------------------------------------------------------------ */
    /* Nav — materialises once content scrolls under it                    */
    /* ------------------------------------------------------------------ */
    function initNav() {
        var nav = document.getElementById('nav');
        if (!nav) return;
        var ticking = false;

        function update() {
            // Hysteresis, so scrolling near the threshold cannot thrash it.
            var y = window.scrollY;
            if (y > 24) nav.classList.add('is-stuck');
            else if (y < 8) nav.classList.remove('is-stuck');
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        update();
    }

    /* ------------------------------------------------------------------ */
    /* Video                                                               */
    /* ------------------------------------------------------------------ */
    function initVideo() {
        var frame = document.querySelector('.video-frame');
        var video = document.getElementById('filmVideo');
        var btn = document.getElementById('videoBtn');
        if (!frame || !video || !btn) return;

        var userPaused = false;
        video.muted = true;
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () {});

        btn.addEventListener('click', function () {
            if (video.paused) { userPaused = false; video.play(); }
            else { userPaused = true; video.pause(); }
            C.haptic('tap');
        });

        function sync() {
            frame.classList.toggle('is-playing', !video.paused);
            btn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
        }
        video.addEventListener('play', sync);
        video.addEventListener('pause', sync);
        sync();

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        if (!userPaused && video.paused) {
                            var pr = video.play();
                            if (pr && pr.catch) pr.catch(function () {});
                        }
                    } else if (!video.paused) video.pause();
                });
            }, { threshold: 0.15 }).observe(video);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Sign-up drawer — load the embed only when it is asked for, and show  */
    /* a skeleton rather than an empty box while it arrives.                */
    /* ------------------------------------------------------------------ */
    function initSignupForm() {
        var trigger = document.querySelectorAll('[data-drawer-trigger="signupDrawer"]');
        var skeleton = document.getElementById('formSkeleton');
        var shell = document.getElementById('typeformShell');
        if (!trigger.length || !shell) return;

        var loaded = false;
        function load() {
            if (loaded) return;
            loaded = true;
            var s = document.createElement('script');
            s.src = 'https://embed.typeform.com/next/embed.js';
            s.onload = function () {
                // Give the embed a beat to paint before swapping the skeleton.
                setTimeout(function () {
                    if (skeleton) skeleton.hidden = true;
                    shell.hidden = false;
                }, 400);
            };
            s.onerror = function () {
                if (skeleton) skeleton.hidden = true;
                shell.hidden = false;
            };
            document.head.appendChild(s);
        }

        trigger.forEach(function (t) { t.addEventListener('click', load); });
    }

    /* ------------------------------------------------------------------ */
    /* Capabilities gallery                                                */
    /* Native scrolling already carries momentum on touch. The pointer      */
    /* handler only takes over for a mouse, where the platform gives you    */
    /* nothing.                                                             */
    /* ------------------------------------------------------------------ */
    function initGallery() {
        var gallery = document.querySelector('[data-gallery]');
        if (!gallery) return;

        var viewport = gallery.querySelector('[data-gallery-viewport]');
        var track = gallery.querySelector('[data-gallery-track]');
        var items = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-item]'));
        var dotsWrap = gallery.querySelector('[data-gallery-dots]');
        var prevBtn = gallery.querySelector('[data-gallery-prev]');
        var nextBtn = gallery.querySelector('[data-gallery-next]');
        if (!viewport || !track || !items.length || !dotsWrap) return;

        var snaps = [], maxScroll = 0, active = 0;
        var lastPrev = null, lastNext = null;
        var running = null;

        function measure() {
            var base = items[0].offsetLeft;
            maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
            snaps = items.map(function (el) { return C.clamp(el.offsetLeft - base, 0, maxScroll); });
        }

        function nearest(pos) {
            var best = 0, dist = Infinity;
            snaps.forEach(function (s, i) { var d = Math.abs(s - pos); if (d < dist) { dist = d; best = i; } });
            return best;
        }

        items.forEach(function (item, i) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'gallery-dot';
            var h = item.querySelector('h3');
            dot.setAttribute('aria-label', h ? h.textContent.trim() : 'Capability ' + (i + 1));
            dot.appendChild(document.createElement('span')).className = 'gallery-dot-fill';
            dot.addEventListener('click', function () { goTo(i); });
            dotsWrap.appendChild(dot);
        });
        var dots = Array.prototype.slice.call(dotsWrap.children);

        function setActive(i) {
            if (i === active) return;
            active = i;
            dots.forEach(function (d, n) {
                d.classList.toggle('is-active', n === i);
                d.setAttribute('aria-current', n === i ? 'true' : 'false');
            });
        }

        function sync() {
            var atStart = viewport.scrollLeft <= 2;
            var atEnd = viewport.scrollLeft >= maxScroll - 2;
            if (prevBtn && atStart !== lastPrev) { prevBtn.disabled = atStart; lastPrev = atStart; }
            if (nextBtn && atEnd !== lastNext) { nextBtn.disabled = atEnd; lastNext = atEnd; }
            setActive(nearest(viewport.scrollLeft));
        }

        function goTo(i, velocity) {
            measure();
            var target = C.clamp(snaps[C.clamp(i, 0, snaps.length - 1)], 0, maxScroll);

            if (running) { running.stop && running.stop(); running = null; }

            if (!animate || C.prefersReduced()) {
                viewport.scrollLeft = target;
                viewport.style.scrollSnapType = '';
                sync();
                return;
            }

            viewport.style.scrollSnapType = 'none';
            var mv = M.motionValue(viewport.scrollLeft);
            mv.on('change', function (v) { viewport.scrollLeft = v; sync(); });

            // A spring, not a duration: the user can reverse mid-flight, and a
            // spring carries velocity through the interruption. Bounce only
            // because a flick preceded it.
            var config = velocity ? C.SPRING.momentum : C.SPRING.ui;
            running = animate(mv, target, Object.assign({}, config, { velocity: velocity || 0 }));
            running.then(function () {
                running = null;
                viewport.style.scrollSnapType = '';
                sync();
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', function () { goTo(active - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { goTo(active + 1); });

        viewport.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
        });
        viewport.addEventListener('scroll', function () { if (!running) sync(); }, { passive: true });

        /* -------- mouse drag -------- */
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
            dragging = true; pointerId = e.pointerId; startX = e.clientX;
            startScroll = viewport.scrollLeft; moved = 0;
            history = [{ x: e.clientX, t: e.timeStamp }];
            if (running) { running.stop && running.stop(); running = null; }
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
            var clamped = C.clamp(wanted, 0, maxScroll);
            viewport.scrollLeft = clamped;
            var overshoot = wanted - clamped;
            setBand(overshoot ? -C.rubberband(overshoot, viewport.clientWidth) : 0);
        });

        function endDrag(e) {
            if (!dragging || (e && e.pointerId !== pointerId)) return;
            dragging = false;
            gallery.classList.remove('is-dragging');
            try { viewport.releasePointerCapture(pointerId); } catch (err) {}
            pointerId = null;

            var velocity = 0;
            if (history.length > 1) {
                var a = history[0], b = history[history.length - 1];
                var dt = b.t - a.t;
                if (dt > 0) velocity = ((b.x - a.x) / dt) * 1000;
            }
            var scrollVelocity = -velocity;

            if (band) {
                if (animate) {
                    var bv = M.motionValue(band);
                    bv.on("change", setBand);
                    animate(bv, 0, { duration: 0.35, ease: C.EASE.out });
                } else setBand(0);
            }

            // Very fast motion reads better with a hint of blur than as a hard
            // sharp streak — it encodes speed the way a camera would.
            var speed = Math.abs(scrollVelocity);
            if (speed > 900 && !C.prefersReduced() && animate) {
                animate(track, { filter: ['blur(' + Math.min(speed / 700, 3).toFixed(1) + 'px)', 'blur(0px)'] },
                        { duration: 0.36, ease: C.EASE.out });
            }

            var projected = viewport.scrollLeft + C.project(scrollVelocity);
            goTo(nearest(C.clamp(projected, 0, maxScroll)), scrollVelocity);
        }

        viewport.addEventListener('pointerup', endDrag);
        viewport.addEventListener('pointercancel', endDrag);
        viewport.addEventListener('click', function (e) {
            if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
            moved = 0;
        }, true);
        viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { measure(); sync(); }, 150);
        });

        measure();
        active = -1;
        sync();
    }

    /* ------------------------------------------------------------------ */
    function init() {
        initMarquee();
        initLoad();
        initNav();
        initTheme();
        initReveal();
        initLineDraw();
        initHeroExit();
        initParallax();
        initVideo();
        initGallery();
        initSignupForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
