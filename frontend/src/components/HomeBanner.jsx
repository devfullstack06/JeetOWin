import React, { useEffect, useMemo, useRef, useState } from "react";
import "./homeBanner.css";

/**
 * Placeholder data for now (admin will manage later).
 * Replace `src` with real URLs when backend/admin is ready.
 */
const DEFAULT_SLIDES = [
  { id: 1, title: "Upcoming Matches", src: "/banner-login-desktop.jpg" },
  { id: 2, title: "Big Wins Today", src: "/banner-login-mobile.jpg" },
  { id: 3, title: "Top Promotions", src: "/banner-login-desktop.jpg" },
  { id: 4, title: "Live Cricket", src: "/banner-login-mobile.jpg" },
  { id: 5, title: "Fast Payouts", src: "/banner-login-desktop.jpg" },
];

export default function HomeBanner({
  slides = DEFAULT_SLIDES,
  intervalMs = 2000,
}) {
  const safeSlides = slides?.length ? slides : DEFAULT_SLIDES;

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const [active, setActive] = useState(0);

  // Autoplay every 2s (unless reduced motion)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % safeSlides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, prefersReducedMotion, safeSlides.length]);

  // Split dots around center button:
  // Example N=5 => 2 left, 2 right (center is button)
  const leftCount = Math.floor((safeSlides.length - 1) / 2);
  const rightCount = safeSlides.length - 1 - leftCount;

  const leftDots = Array.from({ length: leftCount }, (_, i) => i);
  const rightDots = Array.from({ length: rightCount }, (_, i) => i + leftCount);

  const currentSlide = safeSlides[active];

  function goTo(index) {
    setActive(index);
  }

  return (
    <section className="jw-banner" aria-label="Banner carousel">
      {/* Track */}
      <div
        className="jw-bannerTrack"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {safeSlides.map((s) => (
          <div key={s.id} className="jw-bannerSlide">
            <img className="jw-bannerImg" src={s.src} alt={s.title} />
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="jw-bannerControls">
        <div className="jw-bannerDots">
          {/* Left dots */}
          {leftDots.map((i) => (
            <button
              key={`l-${i}`}
              className={`jw-dot ${active === i ? "is-active" : ""}`}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}

          {/* Center title button */}
          <button
            className="jw-bannerTitleBtn"
            type="button"
            aria-label={`Current banner: ${currentSlide.title}`}
            onClick={() => {
              // Later: could navigate to promo/game based on slide data
            }}
          >
            {currentSlide.title}
          </button>

          {/* Right dots (shifted by +1 because center is not a dot) */}
          {rightDots.map((iOffset) => {
            const slideIndex = iOffset + 1; // remaining dots map to slides 1..n-1
            return (
              <button
                key={`r-${slideIndex}`}
                className={`jw-dot ${active === slideIndex ? "is-active" : ""}`}
                type="button"
                aria-label={`Go to slide ${slideIndex + 1}`}
                onClick={() => goTo(slideIndex)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
