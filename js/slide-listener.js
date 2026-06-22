/**
 * slide-listener.js — Canadian Business Dashboard
 * ============================================================
 * Runs inside each slide iframe. Listens for the slide:activate
 * postMessage sent by slideshow.js after each crossfade completes,
 * then resets and re-triggers all Chart.js entrance animations.
 *
 * WHY THIS EXISTS
 * ---------------
 * slideshow.js preloads slides in hidden iframes. Chart.js runs its
 * entrance animation on DOMContentLoaded — while the slide is still
 * invisible. By the time the slide becomes visible the animation is
 * already over and charts appear static.
 *
 * The parent fixes this by accessing iframe.contentWindow directly
 * (reanimateCharts in slideshow.js), which works over HTTP because
 * parent and iframes share the same origin. However, when the file
 * is opened directly via file://, each file URL is treated as a
 * unique origin by the browser and contentWindow access is blocked.
 *
 * postMessage with "*" works across all origins — including file://.
 * slideshow.js already calls notifyActivate() which sends
 * { type: "slide:activate" } to the iframe after every transition.
 * This script catches that message and triggers the re-animation
 * from within the slide itself, bypassing the cross-origin limit.
 *
 * COMPATIBILITY
 * -------------
 * Safe to include in slides that have no charts — the handler
 * checks for window.Chart before doing anything.
 * ============================================================
 */
(function () {
  "use strict";

  window.addEventListener("message", function (event) {
    // Only handle the activate signal from slideshow.js.
    if (!event.data || event.data.type !== "slide:activate") return;

    // Guard: Chart.js may not be present on this slide.
    if (!window.Chart || !window.Chart.instances) return;

    // Re-animate every Chart.js instance on this slide.
    Object.keys(window.Chart.instances).forEach(function (id) {
      var chart = window.Chart.instances[id];
      if (!chart) return;
      try {
        // reset() rewinds to the pre-animation state (single frame,
        // imperceptible at 60 fps). update() fires the entrance
        // animation from scratch on the now-visible slide.
        chart.reset();
        chart.update();
      } catch (e) {
        // Swallow — chart may have been destroyed between frames.
      }
    });
  });
})();
