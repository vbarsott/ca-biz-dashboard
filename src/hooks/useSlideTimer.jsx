/* =============================================================
   useSlideTimer.jsx
   Canadian Business Dashboard — Slide Rotation Hook

   Manages the active slide index and the cross-fade visibility
   flag. Drives the top-level slideshow in App.jsx.

   Usage:
     const { activeIndex, visible } = useSlideTimer({
       count:          4,          // total number of slides
       slideDurationMs: 10_000,    // how long each slide shows
       fadeDurationMs:    600,     // cross-fade duration (ms)
     });

   Contract:
     · activeIndex  — zero-based index of the slide to render
     · visible      — false during the cross-fade window;
                      use it to drive an opacity transition on
                      the slide container
   ============================================================= */

import { useState, useEffect } from "react";

export default function useSlideTimer({
  count,
  slideDurationMs = 10_000,
  fadeDurationMs  = 600,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible,     setVisible]     = useState(true);

  useEffect(() => {
    let fadeTimer;

    // Advance the slide index on a fixed interval
    const intervalId = setInterval(() => {
      // 1. Begin fade-out
      setVisible(false);

      // 2. After the fade completes: advance index and fade back in
      fadeTimer = setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % count);
        setVisible(true);
      }, fadeDurationMs);
    }, slideDurationMs);

    // Cleanup both timers on unmount or dependency change
    return () => {
      clearInterval(intervalId);
      clearTimeout(fadeTimer);
    };
  }, [count, slideDurationMs, fadeDurationMs]);

  return { activeIndex, visible };
}
