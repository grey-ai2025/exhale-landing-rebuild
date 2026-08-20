// Per-section engagement tracking for the single-page marketing site.
//
// The analytics dashboard ranks GA4 "top pages" by pagePath. Because the whole
// marketing site lives at "/", every visit collapses into one row. To see which
// SECTION people actually engage with, we fire a GA4 virtual page_view the first
// time each <section> scrolls at least halfway into view.
//
// Contract (the dashboard depends on this exact shape):
//   event:         page_view
//   page_location: `${origin}/section/${sectionId}`   e.g. .../section/pricing
//   page_title:    `${friendlyName} (section)`
//   fired once per section per page load.
//
// Hooks into the same global `gtag` that /js/analytics.js sets up. If GPC opted
// the visitor out, analytics.js never defines gtag and we stay silent too — no
// second GA4 tag, no extra network calls. The initial page_view GA4 sends on
// load is untouched; these are additional events.

(function () {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

  // Turn a section id into a readable name: "how-it-works" -> "How It Works".
  // A `data-ga-name` attribute overrides this.
  function friendlyName(el) {
    return (
      el.getAttribute('data-ga-name') ||
      el.id.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); })
    );
  }

  function fire(el) {
    // gtag is undefined when GPC opted the visitor out — respect that.
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_location: window.location.origin + '/section/' + el.id,
      page_title: friendlyName(el) + ' (section)',
    });
  }

  function init() {
    var sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Fire when at least half the section is visible, OR — for sections
        // taller than the viewport (common on mobile), where 50% of the section
        // can never be on screen at once — when it fills at least half the
        // viewport.
        var halfSectionVisible = entry.intersectionRatio >= 0.5;
        var fillsHalfViewport =
          entry.intersectionRect.height / window.innerHeight >= 0.5;
        if (!halfSectionVisible && !fillsHalfViewport) return;
        fire(entry.target);
        observer.unobserve(entry.target); // once per section per page load
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    sections.forEach(function (section) { observer.observe(section); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
