/**
 * Motion core — shared vocabulary for the Apple rebuild.
 *
 * Every value in here comes from the animation skills, not from taste:
 *   - Curves: the three strong custom easings. Built-in CSS easings are too
 *     weak for deliberate animation.
 *   - Durations: press 100-160ms, tooltip 125-200ms, dropdown 150-250ms,
 *     modal/drawer 200-500ms. UI stays under 300ms; marketing may go longer.
 *   - Springs: Apple's damping-ratio + response parameterisation, not
 *     mass/stiffness/damping. damping 1.0 = critically damped, no overshoot.
 *     Bounce only where a gesture carried momentum.
 *
 * Motion (motion.dev) is loaded as a UMD bundle, so this is all plain script
 * tags — no bundler, no build step, same deploy story as the rest of the site.
 */
window.MotionCore = (function () {
    'use strict';

    var M = window.Motion;
    if (!M) console.error('[motion-core] Motion failed to load; falling back to CSS only.');

    /* ------------------------------------------------------------------ */
    /* Curves                                                              */
    /* ------------------------------------------------------------------ */
    var EASE = {
        // Strong ease-out — entrances, exits, anything responding to input.
        out: [0.23, 1, 0.32, 1],
        // Strong ease-in-out — things already on screen moving A to B.
        inOut: [0.77, 0, 0.175, 1],
        // iOS drawer curve (Ionic).
        drawer: [0.32, 0.72, 0, 1],
        // Constant — progress fills and marquees only.
        linear: 'linear'
    };

    /* ------------------------------------------------------------------ */
    /* Durations, in seconds for Motion                                    */
    /* ------------------------------------------------------------------ */
    var DUR = {
        press: 0.16,     // 100-160ms
        tooltip: 0.18,   // 125-200ms
        dropdown: 0.22,  // 150-250ms
        modal: 0.32,     // 200-500ms
        drawer: 0.42,
        marketing: 0.6   // may exceed 300ms
    };

    /* ------------------------------------------------------------------ */
    /* Springs                                                             */
    /* ------------------------------------------------------------------ */
    var SPRING = {
        // Default UI: critically damped, no overshoot.
        ui: { type: 'spring', bounce: 0, duration: 0.4 },
        // Momentum interactions only — a flick, a throw, a drag release.
        momentum: { type: 'spring', bounce: 0.2, duration: 0.4 },
        // Sheets and drawers.
        drawer: { type: 'spring', bounce: 0.12, duration: 0.45 }
    };

    /* ------------------------------------------------------------------ */
    /* User preferences                                                    */
    /* ------------------------------------------------------------------ */
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    function prefersReduced() { return reduced.matches; }
    function hasFinePointer() { return finePointer.matches; }

    /**
     * Reduced motion means fewer and gentler animations, not zero. Movement is
     * dropped; opacity and colour survive so state changes stay legible.
     */
    function motionSafe(full, gentle) {
        return prefersReduced() ? (gentle || { duration: 0.2, ease: 'linear' }) : full;
    }

    /* ------------------------------------------------------------------ */
    /* Multimodal feedback                                                 */
    /* Causality, harmony, utility: fire on the causal event, on the same   */
    /* frame as the visual, and only where it earns its place.             */
    /* ------------------------------------------------------------------ */
    var HAPTIC = { tap: 8, commit: [12, 40, 18], warn: [24, 60, 24] };

    function haptic(kind) {
        if (prefersReduced()) return;
        if (!('vibrate' in navigator)) return;
        // Only meaningful moments — over-feedback trains people to ignore it.
        try { navigator.vibrate(HAPTIC[kind] || HAPTIC.tap); } catch (e) {}
    }

    /* ------------------------------------------------------------------ */
    /* Momentum projection — where a flick comes to rest.                  */
    /* Apple's exponential decay, not the v^2/2a textbook form.            */
    /* ------------------------------------------------------------------ */
    function project(velocity, decelerationRate) {
        var d = decelerationRate === undefined ? 0.998 : decelerationRate;
        return (velocity / 1000) * d / (1 - d);
    }

    /* Progressive resistance past a boundary — real things slow before they
       stop. A hard stop reads as frozen. */
    function rubberband(overshoot, dimension, constant) {
        var c = constant === undefined ? 0.55 : constant;
        return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
    }

    /* Velocity-based dismissal: a flick should be enough, regardless of how
       far it travelled. */
    function shouldDismiss(distance, elapsedMs, threshold) {
        var velocity = Math.abs(distance) / Math.max(elapsedMs, 1);
        return Math.abs(distance) >= (threshold || 100) || velocity > 0.11;
    }

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    /* ------------------------------------------------------------------ */
    /* Focus management for overlay surfaces                               */
    /* ------------------------------------------------------------------ */
    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),' +
                    'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    function trapFocus(container) {
        function onKey(e) {
            if (e.key !== 'Tab') return;
            var items = container.querySelectorAll(FOCUSABLE);
            if (!items.length) return;
            var first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        container.addEventListener('keydown', onKey);
        return function () { container.removeEventListener('keydown', onKey); };
    }

    return {
        M: M,
        EASE: EASE,
        DUR: DUR,
        SPRING: SPRING,
        prefersReduced: prefersReduced,
        hasFinePointer: hasFinePointer,
        motionSafe: motionSafe,
        haptic: haptic,
        project: project,
        rubberband: rubberband,
        shouldDismiss: shouldDismiss,
        clamp: clamp,
        trapFocus: trapFocus,
        FOCUSABLE: FOCUSABLE
    };
})();
