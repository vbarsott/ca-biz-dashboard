/**
 * slideshow.js — Canadian Business Dashboard
 * ============================================================
 * Controls dynamic slide loading, timing, transitions,
 * chart-animation reset, preloading, and loop logic for
 * 14 bilingual HTML slides (7 EN + 7 FR, interleaved).
 *
 * Depends on:  index.html   (two <iframe> elements: #frame-a, #frame-b)
 *              slideshow.css (defines the .active opacity transition, 0.8 s)
 *
 * Two transition modes:
 *   EN → FR  (even index → odd index)   : crossfade (CSS opacity)
 *   FR → EN  (odd index  → even index)  : horizontal slide (JS transform)
 *
 * Chart animation strategy:
 *   Chart.js runs its entrance animation on DOMContentLoaded inside
 *   each preloaded iframe — BEFORE the slide is visible. To ensure
 *   charts animate every time a slide becomes active:
 *     1. Reach into the incoming iframe's contentWindow.
 *     2. Call chart.reset() on every Chart.js instance (rewinds to
 *        before-animation state, invisible snap — slide is off-screen
 *        or at opacity 0 at this moment).
 *     3. Call chart.update() immediately after — this triggers the
 *        entrance animation from scratch.
 *   Result: charts animate in sync with the slide transition.
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
   * Order is non-negotiable.
   */
  const SLIDES = [
    "slides/slide-01-en-cover.html", //  0  EN
    "slides/slide-01-fr-cover.html", //  1  FR
    "slides/slide-02-en-national-overview.html", //  2  EN
    "slides/slide-02-fr-national-overview.html", //  3  FR
    "slides/slide-03-en-business-size.html", //  4  EN
    "slides/slide-03-fr-business-size.html", //  5  FR
    "slides/slide-04-en-regional-A.html", //  6  EN
    "slides/slide-04-fr-regional-A.html", //  7  FR
    "slides/slide-05-en-regional-B.html", //  8  EN
    "slides/slide-05-fr-regional-B.html", //  9  FR
    "slides/slide-06-en-regional-C.html", // 10  EN
    "slides/slide-06-fr-regional-C.html", // 11  FR
    "slides/slide-07-en-regional-D.html", // 12  EN
    "slides/slide-07-fr-regional-D.html", // 13  FR
  ];

  /**
   * How long each slide stays fully visible (ms).
   * Spec: 10,000–12,000 ms. Using 11,000 as the midpoint.
   */
  const SLIDE_DURATION_MS = 15000;

  /**
   * Transition duration in ms.
   * ⚠️  MUST match the CSS transition duration on .slide-frame in slideshow.css.
   */
  const TRANSITION_MS = 1800;

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

  /**
   * Returns true when the transition from fromIdx should be a
   * horizontal slide rather than a crossfade.
   *
   * FR slides have ODD indices (1, 3, 5, …).
   * EN slides have EVEN indices (0, 2, 4, …).
   * FR → EN transitions (odd → even) use horizontal slide.
   * EN → FR transitions (even → odd) use crossfade.
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

      function finish() {
        if (!settled) {
          settled = true;
          // Tag the frame so we can detect whether it's already preloaded
          iframe.dataset.loadedIndex = String(slideIndex);
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
     Problem:
       Chart.js runs its entrance animation immediately when each
       slide's iframe loads (DOMContentLoaded). Since iframes are
       preloaded in the background, charts have already finished
       animating by the time the slide becomes visible.

     Solution:
       Before each transition, reach into the incoming iframe's
       contentWindow, call chart.reset() + chart.update() on every
       Chart.js instance. This resets charts to their pre-animation
       state and triggers a fresh entrance animation.

     Timing:
       - For crossfade (EN→FR): called BEFORE adding .active, while
         the incoming frame is still at opacity:0. The chart resets
         without a visible jump, then animates as the slide fades in.
       - For horizontal slide (FR→EN): called BEFORE the transform
         transition starts, while the incoming frame is still off-screen
         at translateX(100%). Charts animate as the slide slides in.

     This function is a safe no-op if:
       - The frame hasn't finished loading
       - The slide has no Chart.js instances (e.g. cover slide)
       - Cross-origin restrictions apply (shouldn't happen — all files
         are served from the same origin)
     ============================================================ */

  function reanimateCharts(frameLabel) {
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
          // reset() rewinds chart to the pre-animation state (instant, no animation).
          // update() then triggers the entrance animation from scratch.
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
     TRANSITION A: CROSSFADE  (EN → FR)
     ============================================================
     Uses CSS opacity transition (.active class in slideshow.css).
     Charts are reset + re-animated before the fade begins so they
     play their entrance animation as the slide becomes visible.
     ============================================================ */

  function crossfade(incomingLabel, incomingIndex) {
    var outgoingLabel = activeFrame;
    var outgoingIndex = currentIndex;

    // Reset charts NOW while the incoming frame is still invisible (opacity:0).
    // This avoids a visible snap — charts rewind silently behind the veil.
    reanimateCharts(incomingLabel);

    // Wait one animation frame so the reset paint is committed before
    // we start the opacity transition.
    requestAnimationFrame(function () {
      // Fade the incoming slide in (CSS handles the 0.8 s transition)
      frames[incomingLabel].classList.add("active");

      notifyActivate(incomingLabel, incomingIndex);
      notifyDeactivate(outgoingLabel, outgoingIndex);

      // After the CSS transition completes, clean up the outgoing frame
      setTimeout(function () {
        frames[outgoingLabel].classList.remove("active");

        // Advance global state
        activeFrame = incomingLabel;
        currentIndex = incomingIndex;

        // Preload the slide after next into the now-idle outgoing frame
        var upcomingIdx = nextIdx(currentIndex);
        prefetchSlide(upcomingIdx);
        loadFrame(outgoingLabel, upcomingIdx);

        scheduleAdvance();
      }, TRANSITION_MS);
    });
  }

  /* ============================================================
     TRANSITION B: HORIZONTAL SLIDE  (FR → EN)
     ============================================================
     The incoming slide enters from the right (translateX 100% → 0).
     The outgoing slide exits to the left (translateX 0 → -100%).
     Both frames are fully opaque during the slide (opacity:1).

     CSS .active / opacity transitions are bypassed for this move
     by applying inline styles that override the stylesheet. The
     inline styles are carefully removed after the transition in the
     correct order to avoid any rogue opacity fade.

     Chart re-animation is triggered before the slide starts —
     while the incoming frame is still off-screen at translateX(100%).
     Charts animate as the slide enters the viewport.
     ============================================================ */

  function horizontalSlide(incomingLabel, incomingIndex) {
    var outgoingLabel = activeFrame;
    var outgoingIndex = currentIndex;
    var inEl = frames[incomingLabel];
    var outEl = frames[outgoingLabel];

    // ── Phase 1: Snap incoming to start position (off-screen right) ──────
    // Disable any ongoing transition so the initial position is instant.
    inEl.style.transition = "none";
    inEl.style.transform = "translateX(100%)";
    inEl.style.opacity = "1"; // override CSS opacity:0
    inEl.style.zIndex = "3"; // sit on top of outgoing
    outEl.style.zIndex = "2"; // outgoing below incoming

    // ── Phase 2: Reset charts while off-screen ────────────────────────────
    // Charts rewind to start state instantly (no visible jump — frame is
    // off-screen). They begin their animation here, so they'll be mid-play
    // as the slide enters the viewport, creating a natural sync.
    reanimateCharts(incomingLabel);

    // ── Phase 3: Force reflow so Phase 1 position is painted first ───────
    void inEl.offsetHeight;
    void outEl.offsetHeight;

    // ── Phase 4: Apply slide transition to both frames ────────────────────
    // Override CSS opacity transition with transform-only transition.
    // The easing matches CLAUDE.md §3.4 ("soft easing, ease-in-out").
    var t = "transform " + TRANSITION_MS + "ms cubic-bezier(0.45, 0, 0.55, 1)";
    inEl.style.transition = t;
    outEl.style.transition = t;

    // Trigger the animation
    inEl.style.transform = "translateX(0)";
    outEl.style.transform = "translateX(-100%)";

    notifyActivate(incomingLabel, incomingIndex);
    notifyDeactivate(outgoingLabel, outgoingIndex);

    // ── Phase 5: Clean up after transition completes ──────────────────────
    setTimeout(function () {
      // Stop transitions on outgoing BEFORE removing .active.
      // This prevents the CSS opacity transition from firing as we drop
      // the class (which would cause the frame to fade from 1→0 while
      // potentially snapping back to translateX(0) and becoming visible).
      outEl.style.transition = "none";
      outEl.style.opacity = "0"; // force invisible immediately
      outEl.classList.remove("active");

      // Move incoming into the clean .active state
      inEl.classList.add("active");

      // ── Phase 6: Restore inline styles one frame later ────────────────
      // Clearing the inline styles in the same frame as the class changes
      // above could race with the browser's style recalc. One RAF ensures
      // both frames are in their final painted state before we clean up.
      requestAnimationFrame(function () {
        // Outgoing: already invisible (opacity:0) and has no .active.
        // Restore CSS transition, then clear inline overrides.
        // computed opacity is already 0 (no .active, CSS = 0) → no transition fires.
        outEl.style.transition = "";
        outEl.style.opacity = ""; // CSS: opacity:0 (no .active) — no change
        outEl.style.transform = ""; // snaps to translateX(0), but invisible ✓
        outEl.style.zIndex = "";

        // Incoming: has .active (CSS opacity:1, z-index:2). Clear inline overrides.
        inEl.style.transition = "";
        inEl.style.transform = ""; // already translateX(0) from Phase 4
        inEl.style.opacity = ""; // CSS via .active: opacity:1 — no change ✓
        inEl.style.zIndex = "";
      });

      // Advance global state
      activeFrame = incomingLabel;
      currentIndex = incomingIndex;

      // Preload the slide after next into the now-idle outgoing frame
      var upcomingIdx = nextIdx(currentIndex);
      prefetchSlide(upcomingIdx);
      loadFrame(outgoingLabel, upcomingIdx);

      scheduleAdvance();
    }, TRANSITION_MS);
  }

  /* ============================================================
     ADVANCE
     Moves to the next slide. Called by the auto-advance timer.
     Routes to the appropriate transition type based on the
     current/next slide indices.
     ============================================================ */

  function advance() {
    var nextSlide = nextIdx(currentIndex);
    var nextLabel = otherFrame(activeFrame);
    var nextIframe = frames[nextLabel];

    // Is the idle frame already holding the right slide?
    var alreadyLoaded = nextIframe.dataset.loadedIndex === String(nextSlide);

    function doTransition() {
      if (isFrToEn(currentIndex)) {
        // FR → EN: horizontal slide
        horizontalSlide(nextLabel, nextSlide);
      } else {
        // EN → FR (or any other): crossfade
        crossfade(nextLabel, nextSlide);
      }
    }

    if (alreadyLoaded) {
      // Fast path — slide is ready, transition immediately
      doTransition();
    } else {
      // Slow path — load now, then transition.
      // This should be rare since preloading fires after every advance.
      loadFrame(nextLabel, nextSlide).then(doTransition);
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

      // Re-animate charts for slide 0 (cover has none — safe no-op).
      // Included for consistency; handles future slides at position 0.
      reanimateCharts("a");

      // Preload slide 1 into frame B while slide 0 is on screen
      prefetchSlide(1);
      loadFrame("b", 1);

      // Start the countdown to the first transition
      scheduleAdvance();
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
