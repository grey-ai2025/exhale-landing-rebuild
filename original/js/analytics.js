// GPC-gated Google Analytics 4 loader for exhale.bot (US-only, no consent banner).
//
// Two reasons this file looks paranoid:
//
//   1. Privacy promise. Our /privacy section 7 commits us to honoring the
//      Global Privacy Control browser signal. middleware.js sets the
//      `exhale_gpc=1` cookie for any request that arrived with `Sec-GPC: 1`.
//      We check that cookie BEFORE injecting gtag and exit silently if it's
//      set — no network call to googletagmanager.com, no dataLayer, nothing.
//
//   2. Conservative defaults. Even for non-GPC visitors we turn off Google
//      Signals (cross-device + ad-targeting features) and ad-personalization
//      signals, both of which would conflict with our "no cross-context
//      behavioral advertising" claim. IP anonymization is on (GA4 default;
//      kept explicit so future readers see the intent).
//
// Loaded only on marketing pages — NOT on /onboarding/start, /chat,
// /dashboard, or /admin (those have user-typed PII GA shouldn't see).
//
// To disable GA globally without touching every page: set MEASUREMENT_ID = ''.

(function () {
  var MEASUREMENT_ID = 'G-V8LB8BHEBM';
  if (!MEASUREMENT_ID) return;

  // GPC opt-out: middleware sets `exhale_gpc=1` whenever the request had Sec-GPC: 1
  if (/(^|;)\s*exhale_gpc=1(?:;|$)/.test(document.cookie)) return;

  // Avoid double-load if the script is included twice
  if (window.__exhaleGaLoaded) return;
  window.__exhaleGaLoaded = true;

  // Inject the canonical gtag loader
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(s);

  // gtag bootstrap
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    // Don't enable cross-device / ad-targeting features
    allow_google_signals: false,
    // Don't pass ad-personalization signals downstream
    allow_ad_personalization_signals: false,
    // GA4 default but kept explicit
    anonymize_ip: true,
  });
})();
