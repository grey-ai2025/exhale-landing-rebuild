/**
 * Exhale — Built for the family CEO
 *
 * Hover does the opening on its own in CSS. This owns the two things hover
 * can't: the tap, and the keyboard. `is-open` is what keeps a column pinned
 * once a pointer has left it.
 *
 * Photos are requested here rather than in the markup so a column that has no
 * photo set — or whose file 404s — falls back to the tinted plate its <li>
 * carries, and the rack never renders an empty box.
 */
(function () {
    'use strict';

    function init() {
        var rack = document.getElementById('benefitsRack');
        if (!rack) return;

        var cols = Array.prototype.slice.call(rack.querySelectorAll('.col'));
        var hits = cols.map(function (col) { return col.querySelector('.col__hit'); });

        cols.forEach(function (col) {
            var img = col.querySelector('.col__photo');
            var src = img && img.getAttribute('data-src');
            if (!img) return;
            if (src) {
                // A missing file falls back to the designed plate.
                img.addEventListener('error', function () { img.remove(); });
                img.src = src;
            } else {
                img.remove();
            }
        });

        function open(index) {
            cols.forEach(function (col, i) {
                var on = i === index;
                col.classList.toggle('is-open', on);
                hits[i].setAttribute('aria-expanded', String(on));
            });
        }

        hits.forEach(function (hit, i) {
            hit.addEventListener('click', function () {
                open(cols[i].classList.contains('is-open') ? -1 : i);
            });

            hit.addEventListener('keydown', function (e) {
                var step = 0;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step = 1;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step = -1;
                else if (e.key === 'Home') { e.preventDefault(); hits[0].focus(); return; }
                else if (e.key === 'End') { e.preventDefault(); hits[hits.length - 1].focus(); return; }
                if (!step) return;
                e.preventDefault();
                hits[(i + step + hits.length) % hits.length].focus();
            });
        });

        // Touch has no hover, so the rack opens on the first column rather than
        // sitting at rest with nothing to read.
        if (!window.matchMedia('(hover: hover)').matches) open(0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
