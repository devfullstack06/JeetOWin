import React, { useEffect, useLayoutEffect, useRef } from "react";
import "./topSports.css";

/**
 * Where to upload images for now:
 * ✅ Put them here:
 *   frontend/public/top-sports/
 *
 * Example:
 *   frontend/public/top-sports/cricket.png
 *
 * Then use:
 *   "/top-sports/cricket.png"
 */

const DEFAULT_ITEMS = [
  { id: "cricket", src: "/top-sports/cricket.png" },
  { id: "soccer", src: "/top-sports/soccer.png" },
  { id: "tennis", src: "/top-sports/tennis.png" },
  { id: "horseracing", src: "/top-sports/horseracing.png" },
];

export default function TopSports({ items = DEFAULT_ITEMS, title = "Top Sports" }) {
  const safeItems = items?.length ? items : DEFAULT_ITEMS;

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  // Measure how much "1 card" is (card width + gap) using real DOM sizes
  const measureStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const card = viewport.querySelector(".jw-topSportsCard");
    const track = viewport.querySelector(".jw-topSportsTrack");
    if (!card || !track) return;

    const cardW = card.getBoundingClientRect().width;

    // Get the gap from CSS (gap is applied on track)
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;

    stepRef.current = cardW + gap;
  };

  useLayoutEffect(() => {
    measureStep();

    // Re-measure on resize and when layout changes
    let ro;
    if (window.ResizeObserver && viewportRef.current) {
      ro = new ResizeObserver(() => measureStep());
      ro.observe(viewportRef.current);
    }

    window.addEventListener("resize", measureStep);

    return () => {
      window.removeEventListener("resize", measureStep);
      if (ro) ro.disconnect();
    };
  }, []);

  const scrollByOne = (dir) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Always re-measure before scrolling (images may have loaded)
    measureStep();

    const step = stepRef.current || viewport.clientWidth;
    const maxLeft = viewport.scrollWidth - viewport.clientWidth;

    const current = viewport.scrollLeft;
    let nextLeft = dir === "next" ? current + step : current - step;

    // Wrap behavior (infinite looping without duplicating tiles)
    if (dir === "next" && current >= maxLeft - 1) nextLeft = 0;
    if (dir === "prev" && current <= 0) nextLeft = maxLeft;

    // Clamp (just in case)
    nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));

    viewport.scrollTo({ left: nextLeft, behavior: "smooth" });
  };

  const startAuto = () => {
    stopAuto();
    autoTimerRef.current = setInterval(() => {
      scrollByOne("next");
    }, 2000);
  };

  const stopAuto = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  useEffect(() => {
    startAuto();
    return () => stopAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeItems.length]);

  return (
    <section className="jw-topSports" aria-label={title}>
      <div className="jw-topSportsHead">
        <h3 className="jw-topSportsTitle">{title}</h3>

        <div className="jw-topSportsBtns" aria-label="Top Sports controls">
          <button
            type="button"
            className="jw-topSportsBtn"
            aria-label="Scroll left"
            onClick={() => scrollByOne("prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="jw-topSportsBtn"
            aria-label="Scroll right"
            onClick={() => scrollByOne("next")}
          >
            ›
          </button>
        </div>
      </div>

      {/* ✅ Native scroll container = no width expansion issues + smooth */}
      <div
        className="jw-topSportsViewport"
        ref={viewportRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        <div className="jw-topSportsTrack">
          {safeItems.map((it, idx) => (
            <button
              key={`${it.id}-${idx}`} /* ✅ always unique */
              type="button"
              className="jw-topSportsCard"
              aria-label={it.id}
              onClick={() => {
                // no action for now; popup later
              }}
            >
              <img
                className="jw-topSportsImg"
                src={it.src}
                alt={it.id}
                loading="lazy"
                onLoad={measureStep} /* ✅ re-measure once images load */
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
