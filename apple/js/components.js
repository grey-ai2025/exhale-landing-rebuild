/**
 * Components — built from the animation skill's recipes, not improvised.
 *
 * Each one notes the rule it implements. The recurring themes:
 *   - Transitions and springs, never keyframes, for anything a user can
 *     trigger twice in a second. Keyframes restart from zero; transitions
 *     and springs retarget from the current value.
 *   - Popovers scale from their trigger. Modals are exempt — they are not
 *     anchored to anything, so they stay centred.
 *   - Nothing enters from scale(0). Nothing in the real world appears from
 *     nothing.
 *   - Enter and exit along the same path, so dismissal feels obvious.
 *   - Reduced motion and pointer gating ship with the component.
 */
(function () {
    'use strict';

    var C = window.MotionCore;
    var animate = window.Motion ? window.Motion.animate : null;

    /* ================================================================== */
    /* Toast                                                              */
    /* Frequency: occasional. Purpose: completion feedback.               */
    /* Transitions, not keyframes — toasts stack and are added rapidly.   */
    /* Exits the edge it entered from, which is what makes swipe-to-      */
    /* dismiss feel intuitive.                                            */
    /* ================================================================== */
    var toastHost = null;

    function toast(message, opts) {
        opts = opts || {};
        if (!toastHost) {
            toastHost = document.createElement('div');
            toastHost.className = 'toast-host';
            toastHost.setAttribute('role', 'status');
            toastHost.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastHost);
        }

        var el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = '<span class="toast-dot" aria-hidden="true"></span><span class="toast-text"></span>';
        el.querySelector('.toast-text').textContent = message;
        toastHost.appendChild(el);

        // Enter: from below, the edge it will leave by.
        requestAnimationFrame(function () { el.classList.add('is-in'); });

        var timer = null;
        var dragging = false, startX = 0, dx = 0, startT = 0;

        function dismiss(direction) {
            clearTimeout(timer);
            el.classList.remove('is-in');
            if (direction) el.style.transform = 'translateX(' + direction * 120 + '%)';
            el.style.opacity = '0';
            setTimeout(function () { el.remove(); }, 320);
        }

        // Swipe to dismiss — velocity decides, not distance. A flick is enough.
        el.addEventListener('pointerdown', function (e) {
            dragging = true; startX = e.clientX; startT = e.timeStamp; dx = 0;
            el.setPointerCapture(e.pointerId);
            el.style.transition = 'none';
        });
        el.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            dx = e.clientX - startX;
            el.style.transform = 'translateX(' + dx + 'px)';
        });
        el.addEventListener('pointerup', function (e) {
            if (!dragging) return;
            dragging = false;
            el.style.transition = '';
            if (C.shouldDismiss(dx, e.timeStamp - startT, 80)) {
                C.haptic('tap');
                dismiss(dx > 0 ? 1 : -1);
            } else {
                el.style.transform = '';
            }
        });

        // Timers pause while the tab is hidden — a toast shouldn't expire
        // unseen. The kind of edge case nobody notices, which is the point.
        var remaining = opts.duration || 4000;
        var startedAt = Date.now();
        function start() { startedAt = Date.now(); timer = setTimeout(function () { dismiss(0); }, remaining); }
        function pause() { clearTimeout(timer); remaining -= Date.now() - startedAt; }
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) pause(); else if (remaining > 0) start();
        });
        start();

        return { dismiss: dismiss };
    }

    /* ================================================================== */
    /* Tooltip                                                            */
    /* Delay before the first one, then instant for the rest — that is    */
    /* what makes a toolbar feel fast without defeating the delay's       */
    /* purpose. Gated behind a fine pointer: touch fires false hovers.    */
    /* ================================================================== */
    var tipEl = null;
    var tipOpenUntil = 0;
    var tipTimer = null;

    function initTooltips() {
        if (!C.hasFinePointer()) return;

        tipEl = document.createElement('div');
        tipEl.className = 'tooltip';
        tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(tipEl);

        document.querySelectorAll('[data-tip]').forEach(function (trigger) {
            trigger.addEventListener('pointerenter', function () {
                var instant = Date.now() < tipOpenUntil;
                clearTimeout(tipTimer);
                tipTimer = setTimeout(function () { showTip(trigger, instant); }, instant ? 0 : 400);
            });
            trigger.addEventListener('pointerleave', hideTip);
            trigger.addEventListener('focus', function () { showTip(trigger, true); });
            trigger.addEventListener('blur', hideTip);
        });
    }

    function showTip(trigger, instant) {
        tipEl.textContent = trigger.getAttribute('data-tip');
        var r = trigger.getBoundingClientRect();
        tipEl.style.left = (r.left + r.width / 2) + 'px';
        tipEl.style.top = (r.top - 10) + 'px';
        tipEl.toggleAttribute('data-instant', !!instant);
        tipEl.classList.add('is-open');
    }

    function hideTip() {
        clearTimeout(tipTimer);
        tipEl.classList.remove('is-open');
        // Neighbouring tooltips open instantly for a moment afterwards.
        tipOpenUntil = Date.now() + 600;
    }

    /* ================================================================== */
    /* Popover                                                            */
    /* Origin-aware: it grows out of the control that opened it, not out  */
    /* of its own centre. That is the whole point of a popover.           */
    /* ================================================================== */
    function initPopovers() {
        document.querySelectorAll('[data-popover-trigger]').forEach(function (trigger) {
            var panel = document.getElementById(trigger.getAttribute('data-popover-trigger'));
            if (!panel) return;
            var releaseTrap = null;

            function open() {
                var t = trigger.getBoundingClientRect();
                panel.style.top = (t.bottom + 10) + 'px';
                panel.style.right = (window.innerWidth - t.right) + 'px';
                // Scale out of the trigger's corner, not the panel's middle.
                panel.style.transformOrigin = 'top right';
                panel.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                releaseTrap = C.trapFocus(panel);
                document.addEventListener('pointerdown', onOutside, true);
                document.addEventListener('keydown', onEsc);
            }

            function close() {
                panel.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
                if (releaseTrap) { releaseTrap(); releaseTrap = null; }
                document.removeEventListener('pointerdown', onOutside, true);
                document.removeEventListener('keydown', onEsc);
            }

            function onOutside(e) {
                if (!panel.contains(e.target) && !trigger.contains(e.target)) close();
            }
            function onEsc(e) { if (e.key === 'Escape') { close(); trigger.focus(); } }

            trigger.addEventListener('click', function () {
                panel.classList.contains('is-open') ? close() : open();
            });
        });
    }

    /* ================================================================== */
    /* Modal                                                              */
    /* Exempt from the origin rule — a modal is not anchored to a trigger, */
    /* so it stays centred. Paired with a dimming scrim: a blocking task   */
    /* dims to focus, where a parallel panel would not.                    */
    /* ================================================================== */
    function initModals() {
        document.querySelectorAll('[data-modal-trigger]').forEach(function (trigger) {
            var modal = document.getElementById(trigger.getAttribute('data-modal-trigger'));
            if (!modal) return;
            var releaseTrap = null;
            var lastFocus = null;

            function open() {
                lastFocus = document.activeElement;
                modal.classList.add('is-open');
                document.body.style.overflow = 'hidden';
                releaseTrap = C.trapFocus(modal);
                var first = modal.querySelector(C.FOCUSABLE);
                if (first) first.focus();
                document.addEventListener('keydown', onEsc);
            }
            function close() {
                modal.classList.remove('is-open');
                document.body.style.overflow = '';
                if (releaseTrap) { releaseTrap(); releaseTrap = null; }
                document.removeEventListener('keydown', onEsc);
                if (lastFocus) lastFocus.focus();
            }
            function onEsc(e) { if (e.key === 'Escape') close(); }

            trigger.addEventListener('click', open);
            modal.querySelectorAll('[data-modal-close]').forEach(function (b) {
                b.addEventListener('click', close);
            });
            modal.addEventListener('pointerdown', function (e) {
                if (e.target === modal) close();   // scrim click
            });
        });
    }

    /* ================================================================== */
    /* Drawer / bottom sheet                                              */
    /* The gesture recipe: springs rather than durations, because the user */
    /* can reverse mid-motion. 1:1 tracking, friction past the boundary    */
    /* instead of a wall, and velocity — not distance — decides dismissal. */
    /* ================================================================== */
    function initDrawers() {
        document.querySelectorAll('[data-drawer-trigger]').forEach(function (trigger) {
            var drawer = document.getElementById(trigger.getAttribute('data-drawer-trigger'));
            if (!drawer) return;

            var sheet = drawer.querySelector('.drawer-sheet');
            var releaseTrap = null;
            var lastFocus = null;
            var dragging = false, startY = 0, dy = 0, startT = 0, height = 0;

            function open() {
                lastFocus = document.activeElement;
                drawer.classList.add('is-open');
                document.body.style.overflow = 'hidden';
                releaseTrap = C.trapFocus(sheet);
                C.haptic('tap');
                var first = sheet.querySelector(C.FOCUSABLE);
                if (first) first.focus();
                document.addEventListener('keydown', onEsc);
            }

            function close() {
                drawer.classList.remove('is-open');
                sheet.style.transform = '';
                document.body.style.overflow = '';
                if (releaseTrap) { releaseTrap(); releaseTrap = null; }
                document.removeEventListener('keydown', onEsc);
                if (lastFocus) lastFocus.focus();
            }
            function onEsc(e) { if (e.key === 'Escape') close(); }

            trigger.addEventListener('click', open);
            drawer.querySelectorAll('[data-drawer-close]').forEach(function (b) {
                b.addEventListener('click', close);
            });
            drawer.addEventListener('pointerdown', function (e) {
                if (e.target === drawer) close();
            });

            var handle = sheet.querySelector('.drawer-handle');
            if (!handle) return;

            handle.addEventListener('pointerdown', function (e) {
                dragging = true;
                startY = e.clientY;
                startT = e.timeStamp;
                dy = 0;
                height = sheet.getBoundingClientRect().height;
                handle.setPointerCapture(e.pointerId);
                sheet.style.transition = 'none';
            });

            handle.addEventListener('pointermove', function (e) {
                if (!dragging) return;
                dy = e.clientY - startY;
                // Upward drag is allowed, with rising friction — an invisible
                // wall feels worse than resistance.
                var offset = dy < 0 ? -C.rubberband(-dy, height) : dy;
                sheet.style.transform = 'translateY(' + offset + 'px)';
            });

            function endDrag(e) {
                if (!dragging) return;
                dragging = false;
                sheet.style.transition = '';
                if (C.shouldDismiss(dy, e.timeStamp - startT, height * 0.3)) {
                    C.haptic('commit');
                    close();
                } else {
                    // Settle back with a spring, carrying the release velocity
                    // so there is no seam between dragging and animating.
                    if (animate && !C.prefersReduced()) {
                        animate(sheet, { transform: 'translateY(0px)' }, C.SPRING.drawer);
                    } else {
                        sheet.style.transform = '';
                    }
                }
            }
            handle.addEventListener('pointerup', endDrag);
            handle.addEventListener('pointercancel', endDrag);
        });
    }

    /* ================================================================== */
    /* Accordion                                                          */
    /* height is tolerated here — it is the one case with no transform     */
    /* equivalent. Opacity is offset slightly from height so the text does */
    /* not appear before there is room for it.                             */
    /* ================================================================== */
    function initAccordions() {
        document.querySelectorAll('[data-accordion] > .acc-item').forEach(function (item) {
            var btn = item.querySelector('.acc-trigger');
            var panel = item.querySelector('.acc-panel');
            if (!btn || !panel) return;

            btn.addEventListener('click', function () {
                var open = item.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                panel.style.height = open ? panel.scrollHeight + 'px' : '0px';
            });

            panel.addEventListener('transitionend', function (e) {
                // Let an open panel reflow with its content afterwards.
                if (e.propertyName === 'height' && item.classList.contains('is-open')) {
                    panel.style.height = 'auto';
                }
            });
        });
    }

    /* ================================================================== */
    /* Hold to confirm                                                    */
    /* Asymmetric by design: slow where the user is deciding (2s linear,   */
    /* because a progress fill should not ease), snappy where the system   */
    /* responds (200ms ease-out on release).                               */
    /* ================================================================== */
    function initHoldToConfirm() {
        document.querySelectorAll('[data-hold]').forEach(function (btn) {
            var fill = btn.querySelector('.hold-fill');
            var label = btn.querySelector('.hold-label');
            var timer = null;
            var held = false;

            function start() {
                held = true;
                btn.classList.add('is-holding');
                timer = setTimeout(function () {
                    if (!held) return;
                    btn.classList.remove('is-holding');
                    btn.classList.add('is-done');
                    C.haptic('commit');
                    btn.dispatchEvent(new CustomEvent('holdconfirm', { bubbles: true }));
                    setTimeout(function () { btn.classList.remove('is-done'); }, 1200);
                }, 2000);
            }
            function cancel() {
                held = false;
                clearTimeout(timer);
                btn.classList.remove('is-holding');
            }

            btn.addEventListener('pointerdown', start);
            btn.addEventListener('pointerup', cancel);
            btn.addEventListener('pointerleave', cancel);
            btn.addEventListener('pointercancel', cancel);
            // Keyboard: space/enter held is not a thing, so a confirm dialog
            // stands in rather than making the action unreachable.
            btn.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (window.confirm(btn.getAttribute('data-hold-confirm') || 'Are you sure?')) {
                        btn.dispatchEvent(new CustomEvent('holdconfirm', { bubbles: true }));
                    }
                }
            });
            if (fill && label) { /* styled in CSS */ }
        });
    }

    /* ================================================================== */
    /* Before / after slider                                              */
    /* clip-path on the overlay, no extra DOM, fully composited.          */
    /* ================================================================== */
    function initCompare() {
        document.querySelectorAll('[data-compare]').forEach(function (root) {
            var overlay = root.querySelector('.compare-after');
            var handle = root.querySelector('.compare-handle');
            if (!overlay || !handle) return;

            var pct = 50;
            function set(p) {
                pct = C.clamp(p, 0, 100);
                overlay.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
                handle.style.left = pct + '%';
                handle.setAttribute('aria-valuenow', Math.round(pct));
            }
            set(pct);

            function fromEvent(e) {
                var r = root.getBoundingClientRect();
                set(((e.clientX - r.left) / r.width) * 100);
            }

            handle.addEventListener('pointerdown', function (e) {
                handle.setPointerCapture(e.pointerId);
                root.classList.add('is-dragging');
            });
            handle.addEventListener('pointermove', function (e) {
                if (!handle.hasPointerCapture(e.pointerId)) return;
                fromEvent(e);
            });
            handle.addEventListener('pointerup', function () { root.classList.remove('is-dragging'); });
            handle.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowLeft') { e.preventDefault(); set(pct - 4); }
                if (e.key === 'ArrowRight') { e.preventDefault(); set(pct + 4); }
            });
        });
    }

    /* ================================================================== */
    function init() {
        initTooltips();
        initPopovers();
        initModals();
        initDrawers();
        initAccordions();
        initHoldToConfirm();
        initCompare();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ExhaleUI = { toast: toast };
})();
