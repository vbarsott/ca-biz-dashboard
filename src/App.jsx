/* =============================================================
   App.jsx
   Canadian Business Dashboard — Root Component

   Renders one slide at a time inside the #hero canvas.
   Slide order follows the bilingual pairing rule:
     EN slide → FR slide → EN slide → FR slide → loop

   To add a new screen: import it and append two entries to
   SLIDES (one per language).
   ============================================================= */

import IntroScreen           from "./screens/IntroScreen";
import NationalOverviewLight from "./screens/NationalOverviewLight";
import useSlideTimer         from "./hooks/useSlideTimer";
import "./App.css";

/* ── Slide sequence ──────────────────────────────────────────
   Each entry maps to one 10-second slot.
   Component  — which screen to render
   lang       — "en" or "fr", passed as a prop to the screen
   ─────────────────────────────────────────────────────────── */
const SLIDES = [
  { Component: IntroScreen,           lang: "en" }, // Slide 1
  { Component: IntroScreen,           lang: "fr" }, // Slide 2
  { Component: NationalOverviewLight, lang: "en" }, // Slide 3
  { Component: NationalOverviewLight, lang: "fr" }, // Slide 4
];

/* ── Timing ──────────────────────────────────────────────────
   SLIDE_DURATION_MS — how long each slide is fully visible
   FADE_MS           — cross-fade window between slides;
                       must match the CSS transition below
   ─────────────────────────────────────────────────────────── */
const SLIDE_DURATION_MS = 10_000; // 10 s per slide
const FADE_MS           =    600; // 0.6 s cross-fade

function App() {
  const { activeIndex, visible } = useSlideTimer({
    count:           SLIDES.length,
    slideDurationMs: SLIDE_DURATION_MS,
    fadeDurationMs:  FADE_MS,
  });

  const { Component, lang } = SLIDES[activeIndex];

  return (
    <div id="tv-container">
      {/*
        Single #hero canvas — styled in global.css as a 16:9
        letterboxed stage. The opacity transition drives the
        cross-fade between slides; FADE_MS must match above.
      */}
      <section
        id="hero"
        aria-label={`Slide ${activeIndex + 1} of ${SLIDES.length}`}
        style={{
          opacity:    visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      >
        <Component lang={lang} />
      </section>
    </div>
  );
}

export default App;
