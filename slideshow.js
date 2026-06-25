/**
 * slideshow.js — Canadian Business Dashboard
 * ============================================================
 * Controls dynamic slide loading, timing, transitions,
 * chart-animation reset, preloading, and loop logic for
 * 12 bilingual HTML slides (6 EN + 6 FR, interleaved).
 *
 * Depends on:  index.html   (two <iframe> elements: #frame-a, #frame-b)
 *              slideshow.css (defines the .active opacity transition, 1.8 s)
 *
 * Two transition modes:
 *   EN → FR  (even → odd index) : plain opacity crossfade, TRANSITION_MS
 *   FR → EN  (odd  → even index): dark-to-light reveal,   TRANSITION_LONG_MS
 *                                  (opacity + brightness filter, distinct effect)
 *
 * Chart animation strategy:
 *   Chart.js runs its entrance animation on DOMContentLoaded inside
 *   each preloaded iframe — BEFORE the slide is visible. Charts are
 *   at their "completed" state by the time the slide is shown.
 *
 *   EN → FR  : no chart animation needed (FR slides are static).
 *
 *   FR → EN  : charts must animate on the fully visible slide.
 *              Fix — two-phase approach:
 *                Phase A (before crossfade, frame at opacity:0):
 *                  chart.reset()  — snaps charts to pre-animation state.
 *                  Frame is invisible, so the snap is never seen.
 *                Phase B (after crossfade completes):
 *                  chart.update() — triggers entrance animation from zero.
 *              This prevents charts from appearing "fully drawn" during
 *              the dark-to-light fade-in, and eliminates the jarring
 *              reset-after-reveal that forced TRANSITION_LONG_MS = 0.
 *
 * z-index strategy:
 *   During every transition, the incoming frame is elevated to z-index:3
 *   so it always renders on top regardless of DOM order (which would
 *   otherwise make frame-a invisible behind frame-b for FR → EN moves).
 *   The inline z-index is cleared after cleanup.
 *
 * Does NOT modify any slide file content.
 * ============================================================
 */

(function () {
  "use strict";

  /* ============================================================
     CONFIGURATION
     ============================================================ */

  /**
   * Ordered slide manifest.
   * Paths are relative to index.html (project root).
   * Slides alternate EN (even index) / FR (odd index).
   * Order is non-negotiable per CLAUDE.md §8.
   */
  const SLIDES = [
    "slides/sld01-en-national-overview.html", //  1  EN
    "slides/sld01-fr-national-overview.html", //  2  FR
    "slides/sld02-en-business-size.html", //  3  EN
    "slides/sld02-fr-business-size.html", //  4  FR
    "slides/sld03-en-regional-growth-ranking.html", //  5  EN
    "slides/sld03-fr-regional-growth-ranking.html", //  6  FR
    "slides/sld04-en-regional-business-ratio.html", // 7  EN
    "slides/sld04-fr-regional-business-ratio.html", // 8 FR
    "slides/sld05-en-regional-business-per-capita.html", // 9  EN
    "slides/sld05-fr-regional-business-per-capita.html", // 10  FR
    "slides/sld06-en-sector-business-comparison.html", // 11  EN
    "slides/sld06-fr-sector-business-comparison.html", // 12  FR
  ];

  /**
   * How long each slide stays fully visible (ms).
   */
  const SLIDE_DURATION_MS = 20000;

  /**
   * EN → FR crossfade duration (ms).
   * ⚠️  MUST match the CSS transition duration on .slide-frame in slideshow.css.
   */
  const TRANSITION_MS = 1800;

  /**
   * FR → EN dark-to-light reveal duration (ms).
   * Uses a combined opacity + brightness filter transition (distinct from EN → FR).
   * Applied entirely as inline style overrides — CSS base stays at TRANSITION_MS.
   *
   * Previously set to 0 to avoid charts appearing fully drawn during the fade.
   * That workaround is no longer needed: charts are now pre-reset before the
   * transition starts (while the frame is at opacity:0), so they are always in
   * their zero/start state by the time the fade-in begins.
   */
  const TRANSITION_LONG_MS = 1800;

  /**
   * Maximum time to wait for an iframe to load before advancing anyway.
   * Prevents the show from stalling if a slide file is slow or missing.
   */
  const LOAD_TIMEOUT_MS = 3000;

  /* ============================================================
     STATE
     ============================================================ */

  /** Index of the slide currently displayed (0-based) */
  let currentIndex = 0;

  /** Which physical frame is the active (visible) one: 'a' | 'b' */
  let activeFrame = "a";

  /** Handle for the pending advance setTimeout */
  let advanceTimer = null;

  /* ============================================================
     DOM REFERENCES
     ============================================================ */

  const stage = document.getElementById("slideshow-stage");

  /** Map from frame label to iframe element */
  const frames = {
    a: document.getElementById("frame-a"),
    b: document.getElementById("frame-b"),
  };

  /* ============================================================
     UTILITIES
     ============================================================ */

  /** Return the label of the OTHER frame ('a' → 'b', 'b' → 'a') */
  function otherFrame(label) {
    return label === "a" ? "b" : "a";
  }

  /** Return the next slide index, wrapping around to 0 after the last */
  function nextIdx(idx) {
    return (idx + 1) % SLIDES.length;
  }

  /** Return the previous slide index, wrapping around to the last after 0 */
  function prevIdx(idx) {
    return (idx - 1 + SLIDES.length) % SLIDES.length;
  }

  /**
   * Returns true when the transition FROM fromIdx is FR → EN.
   * FR slides have ODD indices; EN slides have EVEN indices.
   * FR → EN transitions (odd → even) use the slower crossfade.
   */
  function isFrToEn(fromIdx) {
    return fromIdx % 2 === 1;
  }

  /* ============================================================
     16:9 STAGE SCALING
     Maintains aspect ratio with letterboxing on any screen size.
     ============================================================ */

  function scaleStage() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const TARGET_RATIO = 16 / 9;
    const viewportRatio = vw / vh;

    let stageW, stageH;

    if (viewportRatio > TARGET_RATIO) {
      // Viewport wider than 16:9 → pillar-box (black bars left/right)
      stageH = vh;
      stageW = vh * TARGET_RATIO;
    } else {
      // Viewport taller than 16:9 → letter-box (black bars top/bottom)
      stageW = vw;
      stageH = vw / TARGET_RATIO;
    }

    stage.style.width = Math.floor(stageW) + "px";
    stage.style.height = Math.floor(stageH) + "px";
  }

  /* ============================================================
     IFRAME LOADING
     Loads a slide URL into the specified frame and resolves once
     the iframe fires its load event (or LOAD_TIMEOUT_MS elapses).
     ============================================================ */

  /**
   * @param {string} frameLabel  'a' | 'b'
   * @param {number} slideIndex  index into SLIDES array
   * @returns {Promise<void>}    resolves when ready to display
   */
  function loadFrame(frameLabel, slideIndex) {
    return new Promise(function (resolve) {
      var iframe = frames[frameLabel];
      var url = SLIDES[slideIndex];
      var settled = false;

      // Tag the frame IMMEDIATELY (before src changes) so that any concurrent
      // advance() / retreat() call sees the correct target index and never
      // treats this frame as "already loaded" with a stale previous value.
      // Previously this was set inside finish() — too late. Between the moment
      // iframe.src is reassigned and the onload event fires, data-loaded-index
      // still held the OLD value. retreat() could match that stale value against
      // prevIdx(currentIndex), falsely skip loading, and crossfade to a frame
      // showing blank or wrong content — causing the black screen.
      iframe.dataset.loadedIndex = String(slideIndex);

      function finish() {
        if (!settled) {
          settled = true;
          resolve();
        }
      }

      // Safety net — never let a slow slide stall the whole show
      var timeout = setTimeout(finish, LOAD_TIMEOUT_MS);

      iframe.onload = function () {
        clearTimeout(timeout);
        finish();
      };
      iframe.onerror = function () {
        clearTimeout(timeout);
        console.warn("[Slideshow] Could not load: " + url);
        finish();
      };

      iframe.src = url;
    });
  }

  /* ============================================================
     PREFETCH HINT
     Tells the browser to fetch and cache a slide resource before
     it is needed. The cached resource is used when the iframe
     later sets its src, resulting in near-instant load.
     ============================================================ */

  function prefetchSlide(slideIndex) {
    var url = SLIDES[slideIndex];
    if (document.querySelector('link[rel="prefetch"][href="' + url + '"]'))
      return;
    var link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  }

  /* ============================================================
     CHART HELPERS
     ============================================================
     Three focused helpers replace the old single reanimateCharts():

     resetChartsOnly(frameLabel)
       Called BEFORE a FR→EN transition starts, while the incoming
       English frame is still at opacity:0 (invisible to the viewer).
       Snaps every chart to its pre-animation (zero/start) state.
         Chart.js 3.x: reset() is instant — snaps to zero, no animation.
         Chart.js 4.x: reset() = update('reset'), starts a brief animation
           to zero (invisible since frame is still opaque-0; completes well
           within the 1800 ms transition window).
       After this call the frame's charts are at their start state, so
       no "fully drawn" chart is ever visible during the fade-in.

     animateChartsOnly(frameLabel)
       Called AFTER a FR→EN transition completes (slide fully visible).
       Triggers only update() — no reset() — because the charts are
       already at their zero/start state from the earlier resetChartsOnly().
       This fires the entrance animation on the now-visible slide.

     reanimateCharts(frameLabel, slideIndex)
       Legacy helper used for EN slides reached via retreat() (manual
       navigation). Does the full reset() + update() pair since we
       don't pre-reset charts for manual navigation transitions.
       FR slides (odd index) are always skipped — no chart animation.
     ============================================================ */

  /**
   * Phase A of FR→EN chart strategy.
   * Resets all charts to their start state BEFORE the transition begins.
   * Safe to call while the frame is at opacity:0 — the snap is invisible.
   *
   * @param {string} frameLabel  'a' | 'b'
   */
  function resetChartsOnly(frameLabel) {
    try {
      var cw = frames[frameLabel].contentWindow;
      if (!cw || !cw.Chart) return;

      var instances = cw.Chart.instances;
      if (!instances) return;

      Object.keys(instances).forEach(function (id) {
        var chart = instances[id];
        if (!chart) return;
        try {
          chart.reset(); // snap to zero (3.x instant; 4.x brief invisible animation)
        } catch (e) {
          console.warn(
            "[Slideshow] Chart pre-reset failed (id=" + id + "):",
            e,
          );
        }
      });
    } catch (e) {
      /* Safe to swallow — frame not ready or cross-origin */
    }
  }

  /**
   * Phase B of FR→EN chart strategy.
   * Triggers the entrance animation AFTER the dark-to-light transition
   * completes and the slide is fully visible.
   * Charts are already at zero/start state from resetChartsOnly().
   *
   * @param {string} frameLabel  'a' | 'b'
   */
  function animateChartsOnly(frameLabel) {
    try {
      var cw = frames[frameLabel].contentWindow;
      if (!cw || !cw.Chart) return;

      var instances = cw.Chart.instances;
      if (!instances) return;

      Object.keys(instances).forEach(function (id) {
        var chart = instances[id];
        if (!chart) return;
        try {
          chart.update(); // play entrance animation from zero/start state
        } catch (e) {
          console.warn(
            "[Slideshow] Chart animate-only failed (id=" + id + "):",
            e,
          );
        }
      });
    } catch (e) {
      /* Safe to swallow — cross-origin or frame not ready */
    }
  }

  /**
   * Full reset + animate. Used for EN slides reached via manual retreat().
   * FR slides (odd index) are always skipped — their charts stay static.
   *
   * @param {string} frameLabel   'a' | 'b'
   * @param {number} slideIndex   index into SLIDES array (even = EN, odd = FR)
   */
  function reanimateCharts(frameLabel, slideIndex) {
    // FR slides (odd index) are always static — no chart animation.
    if (slideIndex % 2 === 1) return;

    try {
      var cw = frames[frameLabel].contentWindow;
      if (!cw || !cw.Chart) return;

      var instances = cw.Chart.instances;
      if (!instances) return;

      // Chart.js 4.x: instances is a Record<string, Chart>
      Object.keys(instances).forEach(function (id) {
        var chart = instances[id];
        if (!chart) return;
        try {
          // reset() rewinds to pre-animation state.
          // update() triggers the entrance animation from scratch.
          chart.reset();
          chart.update();
        } catch (e) {
          console.warn(
            "[Slideshow] Chart re-animation failed (id=" + id + "):",
            e,
          );
        }
      });
    } catch (e) {
      /* Safe to swallow — cross-origin or frame not ready */
    }
  }

  /* ============================================================
     POST-MESSAGE NOTIFICATIONS (optional slide protocol)

     Slides may optionally listen for these events to perform
     custom logic on activate/deactivate (e.g. pausing timers).
     Slides that do not implement a listener are unaffected —
     postMessage calls are fire-and-forget.

     Message shapes:
       { type: 'slide:activate',   index: <number>, url: <string> }
       { type: 'slide:deactivate', index: <number>, url: <string> }
     ============================================================ */

  function notifyActivate(frameLabel, slideIndex) {
    try {
      frames[frameLabel].contentWindow.postMessage(
        { type: "slide:activate", index: slideIndex, url: SLIDES[slideIndex] },
        "*",
      );
    } catch (e) {
      /* Safe to swallow */
    }
  }

  function notifyDeactivate(frameLabel, slideIndex) {
    try {
      frames[frameLabel].contentWindow.postMessage(
        {
          type: "slide:deactivate",
          index: slideIndex,
          url: SLIDES[slideIndex],
        },
        "*",
      );
    } catch (e) {
      /* Safe to swallow */
    }
  }

  /* ============================================================
     TIMER
     ============================================================ */

  function scheduleAdvance() {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(advance, SLIDE_DURATION_MS);
  }

  /* ============================================================
     CROSSFADE  (all transitions — EN → FR and FR → EN)
     ============================================================
     Uses CSS opacity transition. Accepts an optional frToEn flag
     to apply the distinct FR→EN dark-to-light reveal effect.

       EN → FR (frToEn=false): plain opacity crossfade, TRANSITION_MS.
                               Matches the CSS base transition exactly.

       FR → EN (frToEn=true) : combined opacity + brightness filter
                               transition, TRANSITION_LONG_MS.
                               Starts at brightness(0.15) → brightness(1),
                               visually distinct from the EN→FR crossfade.
                               Charts are pre-reset before this call so
                               no "fully drawn" chart appears during the
                               fade-in; animateChartsOnly() fires after.

     z-index strategy:
       The incoming frame is elevated to z-index:3 (inline) for the
       duration of the transition so it always renders on top,
       regardless of DOM order. This prevents FR → EN (frame-b →
       frame-a) from being invisible behind the outgoing frame-b.
       The inline z-index is cleaned up after transition completes.

     Chart animation timing (FR→EN only):
       Phase A — resetChartsOnly() is called by advance() BEFORE
         crossfade() is invoked, while the frame is at opacity:0.
         Charts snap to their zero/start state invisibly.
       Phase B — animateChartsOnly() is called here AFTER the
         transition completes. Charts play their entrance animation
         on the now-fully-visible slide.
     ============================================================ */

  /**
   * @param {string}  incomingLabel  'a' | 'b'
   * @param {number}  incomingIndex  index into SLIDES array
   * @param {number}  duration       ms for the opacity transition
   * @param {boolean} [frToEn]       true → apply dark-to-light FR→EN effect
   */
  function crossfade(incomingLabel, incomingIndex, duration, frToEn) {
    var outgoingLabel = activeFrame;
    var outgoingIndex = currentIndex;
    var inEl = frames[incomingLabel];
    var outEl = frames[outgoingLabel];

    // ── Phase 1: Override transition properties ──────────────────────────
    // The base CSS uses TRANSITION_MS (opacity only).
    // FR → EN also transitions filter (brightness), both injected inline.
    if (frToEn) {
      // Dark-to-light reveal: start at near-black brightness.
      // Frame is still at opacity:0 (not .active) — the snap is invisible.
      inEl.style.filter = "brightness(0.15)";
      inEl.style.transition =
        "opacity " +
        duration +
        "ms ease-in-out, " +
        "filter " +
        duration +
        "ms ease-in-out";
    } else if (duration !== TRANSITION_MS) {
      // Non-standard duration override (kept for forward compatibility).
      inEl.style.transition = "opacity " + duration + "ms ease-in-out";
    }

    // ── Phase 2: Elevate incoming above outgoing ─────────────────────────
    // Both frames share z-index:2 via .active. DOM order would make
    // frame-a invisible behind frame-b for FR → EN. Inline z-index:3
    // overrides this, ensuring the incoming is always on top.
    inEl.style.zIndex = "3";

    // ── Phase 3: Begin fade-in (one rAF ensures Phase 1+2 are painted) ──
    requestAnimationFrame(function () {
      // Adding .active triggers the opacity 0 → 1 transition.
      inEl.classList.add("active");

      // FR → EN: a second rAF commits the initial brightness(0.15) paint
      // before we transition to brightness(1). Without this beat the browser
      // may coalesce the two filter writes and skip the transition entirely.
      if (frToEn) {
        requestAnimationFrame(function () {
          inEl.style.filter = "brightness(1)";
        });
      }

      notifyActivate(incomingLabel, incomingIndex);
      notifyDeactivate(outgoingLabel, outgoingIndex);

      // ── Phase 4: Cleanup after transition completes ──────────────────
      setTimeout(function () {
        // Snap the outgoing frame invisible without a CSS transition.
        outEl.style.transition = "none";
        outEl.style.opacity = "0";
        outEl.classList.remove("active");

        // One rAF: wait for the browser to commit the above paint before
        // stripping the inline overrides (prevents accidental flash).
        requestAnimationFrame(function () {
          // Restore outgoing frame to clean CSS state.
          outEl.style.transition = "";
          outEl.style.opacity = "";
          outEl.style.zIndex = ""; // was never set on outEl, harmless

          // Restore incoming frame to clean CSS state.
          // .active gives opacity:1 and z-index:2 via CSS so removing the
          // inline overrides causes no visible change.
          inEl.style.transition = "";
          inEl.style.zIndex = "";
          if (frToEn) {
            inEl.style.filter = ""; // CSS has no filter — removing is safe
          }

          // ── Phase 5: Chart animation ─────────────────────────────────
          // FR → EN: charts were pre-reset to zero before this crossfade;
          //   only update() is needed to play the entrance animation.
          // EN → FR: FR slides are always static — reanimateCharts() skips.
          // Manual retreat (EN→EN or FR→FR): full reset+update via reanimateCharts().
          if (frToEn) {
            animateChartsOnly(incomingLabel);
          } else {
            reanimateCharts(incomingLabel, incomingIndex);
          }

          // ── Phase 6: Advance global state ───────────────────────────
          activeFrame = incomingLabel;
          currentIndex = incomingIndex;

          // Preload the next upcoming slide into the now-idle outgoing frame
          var upcomingIdx = nextIdx(currentIndex);
          prefetchSlide(upcomingIdx);
          loadFrame(outgoingLabel, upcomingIdx);

          scheduleAdvance();
        });
      }, duration);
    });
  }

  /* ============================================================
     ADVANCE
     Moves to the next slide. Called by the auto-advance timer.
     Routes to crossfade with the correct duration and effect flag
     based on whether the current slide is FR (odd) → EN (even).

     FR → EN sequence:
       1. Pre-reset charts on the incoming English frame BEFORE
          calling crossfade(). Frame is still at opacity:0 here,
          so the snap to zero is invisible to the viewer.
       2. Call crossfade() with frToEn=true to trigger the
          dark-to-light reveal and schedule animateChartsOnly()
          after the transition completes.
     ============================================================ */

  function advance() {
    var nextSlide = nextIdx(currentIndex);
    var nextLabel = otherFrame(activeFrame);
    var nextIframe = frames[nextLabel];

    var frToEn = isFrToEn(currentIndex);
    var duration = frToEn ? TRANSITION_LONG_MS : TRANSITION_MS;

    // Is the idle frame already holding the right slide?
    var alreadyLoaded = nextIframe.dataset.loadedIndex === String(nextSlide);

    function doTransition() {
      // FR → EN: pre-reset charts while the frame is invisible (opacity:0).
      // This must happen immediately before crossfade() so there is no
      // window where a completed chart could appear during the fade-in.
      if (frToEn) {
        resetChartsOnly(nextLabel);
      }
      crossfade(nextLabel, nextSlide, duration, frToEn);
    }

    if (alreadyLoaded) {
      // Fast path — slide is ready, transition immediately
      doTransition();
    } else {
      // Slow path — load now, then transition.
      // Should be rare since preloading fires after every advance.
      loadFrame(nextLabel, nextSlide).then(doTransition);
    }
  }

  /* ============================================================
     DEV-ONLY: retreat — moves to the previous slide.
     Called by the left arrow button in index.html.
     Cancels the pending auto-advance and resets the timer so the
     current slide gets a full SLIDE_DURATION_MS after navigation.
     ============================================================ */

  function retreat() {
    if (advanceTimer) clearTimeout(advanceTimer);

    var prevSlide = prevIdx(currentIndex);
    var prevLabel = otherFrame(activeFrame);
    var prevIframe = frames[prevLabel];

    // Use the standard crossfade duration for manual navigation
    var duration = TRANSITION_MS;

    var alreadyLoaded = prevIframe.dataset.loadedIndex === String(prevSlide);

    function doTransition() {
      crossfade(prevLabel, prevSlide, duration);
    }

    if (alreadyLoaded) {
      doTransition();
    } else {
      loadFrame(prevLabel, prevSlide).then(doTransition);
    }
  }

  /* ============================================================
     INITIALISATION
     ============================================================ */

  function init() {
    // Set initial stage size and respond to screen resize
    scaleStage();
    window.addEventListener("resize", scaleStage);

    // Load the first slide into frame A
    loadFrame("a", 0).then(function () {
      // Make frame A visible
      frames.a.classList.add("active");
      activeFrame = "a";
      currentIndex = 0;

      notifyActivate("a", 0);

      // The first slide (cover) has no charts — reanimateCharts is a safe
      // no-op here. Included for consistency with any future slide at position 0.
      requestAnimationFrame(function () {
        reanimateCharts("a", 0);
      });

      // Preload slide 1 into frame B while slide 0 is on screen
      prefetchSlide(1);
      loadFrame("b", 1);

      // Start the countdown to the first transition
      scheduleAdvance();

      // Dev-only arrow listeners — wire up after init so advance/retreat exist
      var btnPrev = document.getElementById("dev-arrow-prev");
      var btnNext = document.getElementById("dev-arrow-next");
      if (btnPrev)
        btnPrev.addEventListener("click", function () {
          retreat();
        });
      if (btnNext)
        btnNext.addEventListener("click", function () {
          if (advanceTimer) clearTimeout(advanceTimer);
          advance();
        });
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
