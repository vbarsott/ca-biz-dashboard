/**
 * slideshow.js — Canadian Business Dashboard
 * ============================================================
 * Controls dynamic slide loading, timing, transitions,
 * chart-animation reset, preloading, and loop logic for
 * 14 bilingual HTML slides (7 EN + 7 FR, interleaved).
 *
 * Depends on:  index.html   (two <iframe> elements: #frame-a, #frame-b)
 *              slideshow.css (defines the .active opacity transition, 1.8 s)
 *
 * Single transition mode — crossfade for ALL slide changes:
 *   EN → FR  (even → odd index) : standard crossfade, TRANSITION_MS
 *   FR → EN  (odd  → even index): slow crossfade,     TRANSITION_LONG_MS
 *
 * Chart animation strategy:
 *   Chart.js runs its entrance animation on DOMContentLoaded inside
 *   each preloaded iframe — BEFORE the slide is visible. Charts are
 *   at their "completed" state by the time the slide is shown.
 *
 *   Fix: after each crossfade transition COMPLETES (slide fully visible),
 *   reach into the incoming iframe's contentWindow and call:
 *     chart.reset()  — rewinds to pre-animation state (one render frame,
 *                      imperceptible at 60 fps) — Chart.js 3.x + 4.x safe
 *     chart.update() — triggers the entrance animation from scratch
 *   Result: charts animate on a fully visible slide, every time.
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
  const SLIDE_DURATION_MS = 3000;

  /**
   * EN → FR crossfade duration (ms).
   * ⚠️  MUST match the CSS transition duration on .slide-frame in slideshow.css.
   */
  const TRANSITION_MS = 1800;

  /**
   * FR → EN crossfade duration (ms).
   * Same animation as EN → FR.
   * Applied as an inline style override — CSS base stays at TRANSITION_MS.
   */
  const TRANSITION_LONG_MS = 0;

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
     CHART RE-ANIMATION
     ============================================================
     Called AFTER a transition completes, when the incoming slide
     is fully visible at opacity: 1.

     Sequence per chart instance:
       1. chart.reset()  — snaps all elements back to their
                           pre-animation state (zero / start).
                           One render frame (~16 ms at 60 fps),
                           imperceptible to the viewer.
                           Chart.js 3.x: resets state, no animation.
                           Chart.js 4.x: reset() = update('reset'),
                             triggers animation; immediately calling
                             update() below re-queues from start.
       2. chart.update() — triggers the entrance animation from
                           whatever state the chart is in (0 / start).

     This is a safe no-op if:
       - The frame hasn't finished loading
       - The slide has no Chart.js instances (e.g. cover slide)
       - Cross-origin restrictions apply (all same origin — shouldn't happen)
     ============================================================ */

  /**
   * Re-animates charts in the given frame, but ONLY for English slides.
   * FR slides (odd index) must remain static — no reset(), no update().
   *
   * @param {string} frameLabel   'a' | 'b'
   * @param {number} slideIndex   index into SLIDES array (even = EN, odd = FR)
   */
  function reanimateCharts(frameLabel, slideIndex) {
    // FR slides (odd index) are always static — skip chart animation entirely.
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
          // reset() rewinds to pre-animation state (instant, one frame).
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
     Uses CSS opacity transition. A single function handles both
     directions; the only difference is the duration parameter:
       EN → FR : TRANSITION_MS       (standard, matches CSS)
       FR → EN : TRANSITION_LONG_MS  (slower, injected inline)

     z-index strategy:
       The incoming frame is elevated to z-index:3 (inline) for the
       duration of the transition so it always renders on top,
       regardless of DOM order. This prevents FR → EN (frame-b →
       frame-a) from being invisible behind the outgoing frame-b.
       The inline z-index is cleaned up after transition completes.

     Chart animation timing:
       Charts are NOT touched before the transition. The incoming
       slide fades in showing its preloaded (completed) chart state,
       which looks natural. Once the fade is fully complete and the
       slide is at opacity:1, reanimateCharts() is called — charts
       reset to zero and play their entrance animation on the now-
       fully-visible slide.
     ============================================================ */

  /**
   * @param {string} incomingLabel  'a' | 'b'
   * @param {number} incomingIndex  index into SLIDES array
   * @param {number} duration       ms for the opacity transition
   */
  function crossfade(incomingLabel, incomingIndex, duration) {
    var outgoingLabel = activeFrame;
    var outgoingIndex = currentIndex;
    var inEl = frames[incomingLabel];
    var outEl = frames[outgoingLabel];

    // ── Phase 1: Override transition duration if non-standard ───────────
    // The base CSS uses TRANSITION_MS. For FR → EN we need TRANSITION_LONG_MS,
    // injected inline so it overrides the stylesheet without modifying it.
    if (duration !== TRANSITION_MS) {
      inEl.style.transition = "opacity " + duration + "ms ease-in-out";
    }

    // ── Phase 2: Elevate incoming above outgoing ─────────────────────────
    // Both frames share z-index:2 via .active. DOM order would make
    // frame-a invisible behind frame-b for FR → EN. Inline z-index:3
    // overrides this, ensuring the incoming is always on top.
    inEl.style.zIndex = "3";

    // ── Phase 3: Begin fade-in (one rAF ensures Phase 1+2 are painted) ──
    requestAnimationFrame(function () {
      // Adding .active to the incoming frame triggers the opacity 0 → 1
      // transition (CSS or inline override, whichever applies).
      inEl.classList.add("active");

      notifyActivate(incomingLabel, incomingIndex);
      notifyDeactivate(outgoingLabel, outgoingIndex);

      // ── Phase 4: Cleanup after transition completes ──────────────────
      setTimeout(function () {
        // Snap the outgoing frame invisible without a CSS transition.
        // (If we let the CSS transition fire here it would fade the outgoing
        // from opacity:1 → 0 over 2 s — visible if it somehow peeked above
        // the incoming frame. Snapping is cleaner.)
        outEl.style.transition = "none";
        outEl.style.opacity = "0";
        outEl.classList.remove("active");

        // One rAF: wait for the browser to commit the above paint before
        // stripping the inline overrides (prevents accidental transition flash).
        requestAnimationFrame(function () {
          // Restore outgoing frame to clean CSS state.
          // computed opacity is already 0 (no .active, CSS = 0) → no transition fires.
          outEl.style.transition = "";
          outEl.style.opacity = "";
          outEl.style.zIndex = ""; // was never set on outEl, harmless

          // Restore incoming frame CSS overrides.
          // .active gives opacity:1 and z-index:2 via CSS — matching the
          // inline values we're removing, so no visible change occurs.
          inEl.style.transition = "";
          inEl.style.zIndex = "";

          // ── Phase 5: Re-animate charts ──────────────────────────────
          // The slide is now fully visible (opacity:1). Chart animations
          // reset and replay from scratch here — satisfying the requirement
          // that chart animations ONLY play on an active, visible slide.
          // FR slides (odd index) are skipped — their charts stay static.
          reanimateCharts(incomingLabel, incomingIndex);

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
     Routes to crossfade with the correct duration based on
     whether the current slide is FR (odd) → EN (even).
     ============================================================ */

  function advance() {
    var nextSlide = nextIdx(currentIndex);
    var nextLabel = otherFrame(activeFrame);
    var nextIframe = frames[nextLabel];

    // FR → EN transitions use the slower crossfade; all others standard.
    var duration = isFrToEn(currentIndex) ? TRANSITION_LONG_MS : TRANSITION_MS;

    // Is the idle frame already holding the right slide?
    var alreadyLoaded = nextIframe.dataset.loadedIndex === String(nextSlide);

    function doTransition() {
      crossfade(nextLabel, nextSlide, duration);
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
