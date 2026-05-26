/* ═══════════════════════════════════════════════════════════════════════════
   transitions.js — Animation utilities for the Canadian Business Dashboard
   All animations use CSS opacity + transform (GPU-composited, no layout).
   Called on DOMContentLoaded — targets elements with class .fade-in.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fade an element in from transparent/shifted to opaque/resting position.
 * @param {HTMLElement} el       - Target element
 * @param {number}      duration - Animation duration in ms (default 500)
 * @param {number}      delay    - Start delay in ms (default 0)
 */
function fadeIn(el, duration = 500, delay = 0) {
  el.style.opacity = "0";
  el.style.transform = "translateY(10px)";
  el.style.transition = `opacity ${duration}ms ease-out ${delay}ms,
                          transform ${duration}ms ease-out ${delay}ms`;

  /* Trigger reflow so the transition fires */
  void el.offsetHeight;

  el.style.opacity = "1";
  el.style.transform = "translateY(0)";
}

/**
 * Fade in a list of elements with a staggered delay between each.
 * @param {NodeList|Array} els        - Elements to animate
 * @param {number}         stagger    - Delay between items in ms (default 100)
 * @param {number}         duration   - Per-element duration in ms (default 400)
 * @param {number}         startDelay - Initial delay before first item (default 0)
 */
function staggerFadeIn(els, stagger = 100, duration = 400, startDelay = 0) {
  Array.from(els).forEach(function (el, i) {
    fadeIn(el, duration, startDelay + i * stagger);
  });
}

/**
 * Slide an element up from below while fading it in.
 * @param {HTMLElement} el       - Target element
 * @param {number}      duration - Animation duration in ms (default 500)
 * @param {number}      delay    - Start delay in ms (default 0)
 */
function slideInUp(el, duration = 500, delay = 0) {
  el.style.opacity = "0";
  el.style.transform = "translateY(24px)";
  el.style.transition = `opacity ${duration}ms ease-out ${delay}ms,
                          transform ${duration}ms ease-out ${delay}ms`;

  void el.offsetHeight;

  el.style.opacity = "1";
  el.style.transform = "translateY(0)";
}

/**
 * Initialise fade-in animations for all elements matching `selector`.
 * Elements with class .fade-in start invisible (opacity:0 set by main.css)
 * and are animated via staggerFadeIn on DOMContentLoaded.
 *
 * @param {string} selector  - CSS selector (default '.fade-in')
 * @param {number} stagger   - Stagger delay in ms (default 100)
 */
function initSlideAnimations(selector = ".fade-in", stagger = 100) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  staggerFadeIn(els, stagger, 500, 80);
}

document.addEventListener("DOMContentLoaded", function () {
  initSlideAnimations(".fade-in");
});
