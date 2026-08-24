/**
 * Exhale - Scroll Effects, Theme & Form Handling
 */

// ===========================================
// Configuration
// ===========================================
const CONFIG = {
    webhookUrl: 'https://greyai.app.n8n.cloud/webhook/ec0cd3e4-87b0-4d52-b23e-3d642f2e3b80'
};

// ===========================================
// Initialize on DOM Load
// ===========================================
// When the browser can drive motion from the scroll position itself, the
// scroll-driven block in styles.css owns the reveals and the hero exit.
// Running the JS equivalents as well would only fight it.
const scrollDriven =
    typeof CSS !== 'undefined' &&
    CSS.supports &&
    CSS.supports('animation-timeline: view()') &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    if (!scrollDriven) {
        initParallax();
        initScrollReveal();
    }
    initCursorGlow();
    initVideoPlayer();
    initScrollHint();
    initChromeAutoHide();
});

// ===========================================
// Theme Toggle (Dark/Light Mode)
// ===========================================
function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    // Check for saved preference or default to dark
    const savedTheme = localStorage.getItem('theme');

    // Default is dark mode (no class), light mode adds 'light-mode' class
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');

        // The cursor glow used to be recoloured here with an inline style.
        // `body.light-mode .cursor-glow` in styles.css does it now, and has to:
        // the glow also swaps blend mode between themes, and an inline
        // background would have outranked the rule that pairs with it.
    });

    // Listen for system theme changes (only if no saved preference)
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.body.classList.add('light-mode');
            } else {
                document.body.classList.remove('light-mode');
            }
        }
    });
}

// ===========================================
// Parallax Effects - Lightweight
// ===========================================
function initParallax() {
    const heroContent = document.querySelector('.hero-content');

    // Only apply hero fade, skip orb parallax for performance
    if (!heroContent) return;

    let lastScrollY = 0;
    let ticking = false;

    const updateParallax = () => {
        const scrollY = lastScrollY;

        // Hero content fade on scroll (only in hero section)
        if (scrollY < window.innerHeight) {
            heroContent.style.opacity = Math.max(0, 1 - scrollY / 500);
        }

        ticking = false;
    };

    window.addEventListener('scroll', () => {
        lastScrollY = window.pageYOffset;

        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });
}

// ===========================================
// Scroll Reveal Animations - Optimized
// ===========================================
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    // Lighter stagger delays for smoother feel
    const staggerConfig = {
        '.pain-card': 50,
        '.feature-card': 60,
        '.step': 80
    };

    Object.entries(staggerConfig).forEach(([selector, stagger]) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            el.style.transitionDelay = `${index * stagger}ms`;
        });
    });

    // Intersection Observer with better threshold
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.05
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Use requestAnimationFrame for smoother class addition
                requestAnimationFrame(() => {
                    entry.target.classList.add('revealed');
                });
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
}

// ===========================================
// Form Handler with Webhook
// ===========================================
function initFormHandler(formId, emailId, btnId, groupId, successId) {
    const form = document.getElementById(formId);
    const emailInput = document.getElementById(emailId);
    const submitBtn = document.getElementById(btnId);
    const inputGroup = document.getElementById(groupId);
    const successMsg = document.getElementById(successId);

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput?.value.trim();

        // Validate email
        if (!email || !isValidEmail(email)) {
            shakeElement(inputGroup);
            return;
        }

        // Update button state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Joining...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                // Success - animate out form and show success
                inputGroup.style.transform = 'translateY(-10px)';
                inputGroup.style.opacity = '0';
                inputGroup.style.transition = 'all 0.4s ease';

                setTimeout(() => {
                    inputGroup.classList.add('hidden');
                    successMsg.classList.add('show');
                }, 400);
            } else {
                // Server returned an error
                const errorData = await response.json().catch(() => ({}));
                console.error('Webhook error:', errorData);
                throw new Error('Submission failed');
            }
        } catch (error) {
            console.error('Submission error:', error);
            submitBtn.textContent = 'Try again';
            submitBtn.disabled = false;

            setTimeout(() => {
                submitBtn.textContent = originalText;
            }, 2000);
        }
    });
}

// ===========================================
// Cursor Glow Effect
// ===========================================
function initCursorGlow() {
    // Skip on touch devices
    if ('ontouchstart' in window) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    let seen = false;
    let frame = null;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // The first move places it rather than easing to it from 0,0 — a light
        // sliding in from the top-left corner announces the effect instead of
        // just being there.
        if (!seen) {
            seen = true;
            glowX = mouseX;
            glowY = mouseY;
            glow.classList.add('is-lit');
        }
        if (!frame) frame = requestAnimationFrame(animateGlow);
    });

    // Off the page, the light goes with it.
    document.addEventListener('mouseleave', () => glow.classList.remove('is-lit'));
    document.addEventListener('mouseenter', () => { if (seen) glow.classList.add('is-lit'); });

    function animateGlow() {
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;

        // left/top would lay out the page on every frame; a transform is a
        // composite. The -50% keeps it centred on the pointer.
        glow.style.transform =
            `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;

        // Park the loop once it has caught up, so an idle pointer isn't
        // holding a rAF open for the life of the page.
        if (Math.abs(mouseX - glowX) > 0.5 || Math.abs(mouseY - glowY) > 0.5) {
            frame = requestAnimationFrame(animateGlow);
        } else {
            frame = null;
        }
    }
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Shakes an element to indicate error
 * @param {HTMLElement} element - Element to shake
 */
function shakeElement(element) {
    if (!element) return;

    element.style.animation = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.animation = 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both';

    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// ===========================================
// Video Player
// ===========================================
function initVideoPlayer() {
    const container = document.querySelector('.video-container');
    if (!container) return;

    const video = container.querySelector('video');
    const btn = container.querySelector('.video-play-btn');
    if (!video || !btn) return;

    const playSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const pauseSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

    // Autoplay muted on load. Browsers only allow autoplay when muted, and some
    // need the property set (not just the attribute); a blocked play() rejects
    // silently, leaving the manual play button as the fallback.
    video.muted = true;
    const autoplay = video.play();
    if (autoplay && typeof autoplay.catch === 'function') autoplay.catch(function () {});

    btn.addEventListener('click', function() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });

    video.addEventListener('play', function() {
        container.classList.add('playing');
        btn.innerHTML = pauseSVG;
    });

    video.addEventListener('pause', function() {
        container.classList.remove('playing');
        btn.innerHTML = playSVG;
    });

    video.addEventListener('ended', function() {
        container.classList.remove('playing');
        btn.innerHTML = playSVG;
    });
}

// ===========================================
// Scroll Hint
// ===========================================
// The bounce is a real affordance — it points in the direction of the gesture
// for a first-time visitor. It just should not keep running for the rest of
// the session once the hero has scrolled away.
//
// A scroll-driven timeline is the wrong tool for this one: it would map the
// bounce iterations onto scroll position, so the arrow would bounce as you
// scroll rather than on its own. A class toggle keeps the animation on its own
// clock and simply stops it when nobody can see it.
function initScrollHint() {
    const hint = document.querySelector('.scroll-indicator');
    if (!hint) return;

    if (!('IntersectionObserver' in window)) {
        hint.classList.add('is-hinting');
        return;
    }

    new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            hint.classList.toggle('is-hinting', entry.isIntersecting);
        });
    }, { threshold: 0.1 }).observe(hint);
}

// ===========================================
// Fixed corners that get out of the way
// ===========================================
// The nav pill and the theme toggle sit above everything and cross whatever
// scrolls under them. Scrolling down tucks them away, scrolling up returns
// them — the direction is the whole input, so nothing has to be tapped to
// dismiss and nothing is ever more than a flick from coming back.
function initChromeAutoHide() {
    const chrome = [
        document.querySelector('.top-nav'),
        document.getElementById('themeToggle')
    ].filter(Boolean);

    if (!chrome.length) return;

    // Near the top they always show — that's where they're expected to be.
    const TOP_ZONE = 90;
    // Below this a scroll is a wobble, not a direction. Without it the chrome
    // flickers on every rubber-band and trackpad twitch.
    const DELTA = 6;

    let lastY = window.pageYOffset;
    let tucked = false;
    let ticking = false;

    function setTucked(next) {
        if (next === tucked) return;
        tucked = next;
        chrome.forEach(el => el.classList.toggle('is-tucked', next));
    }

    function update() {
        ticking = false;
        const y = window.pageYOffset;
        const dy = y - lastY;

        if (y < TOP_ZONE) { lastY = y; setTucked(false); return; }
        if (Math.abs(dy) < DELTA) return;   // keep lastY: small moves accumulate

        lastY = y;
        setTucked(dy > 0);
    }

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    // Tabbing to something tucked away has to bring it back, or the focus ring
    // lands on nothing.
    chrome.forEach(el => el.addEventListener('focusin', () => setTucked(false)));

    update();
}
