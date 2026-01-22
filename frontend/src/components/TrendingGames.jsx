import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import "./trendingGames.css";

export default function TrendingGames({
  title = "Trending Games",
  imageFiles = [
    "1.avif",
    "2.avif",
    "3.avif",
    "4.png",
    "5.png",
    "6.png",
    "7.png",
    "8.png",
  ],
}) {
  const items = useMemo(
    () =>
      imageFiles.map((file, idx) => ({
        id: `tg-${idx}`,
        src: `/trending-games/${file}`,
      })),
    [imageFiles]
  );

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  /* Measure 1 tile width + gap (same as TopSports) */
  const measureStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const tile = viewport.querySelector(".jw-trendingTile");
    if (!tile) return;

    const tileW = tile.getBoundingClientRect().width;

    const style = window.getComputedStyle(viewport);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;

    stepRef.current = tileW + gap;
  };

  useLayoutEffect(() => {
    measureStep();

    let ro;
    if (window.ResizeObserver && viewportRef.current) {
      ro = new ResizeObserver(measureStep);
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

    measureStep();

    const step = stepRef.current || viewport.clientWidth;
    const maxLeft = viewport.scrollWidth - viewport.clientWidth;

    const current = viewport.scrollLeft;
    let nextLeft = dir === "next" ? current + step : current - step;

    /* Wrap behavior (same as TopSports) */
    if (dir === "next" && current >= maxLeft - 1) nextLeft = 0;
    if (dir === "prev" && current <= 0) nextLeft = maxLeft;

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
  }, [items.length]);

  return (
    <section className="jw-trending" aria-label={title}>
      <div className="jw-trendingHeader">
        <div className="jw-trendingTitle">{title}</div>

        <div className="jw-trendingControls" aria-label={`${title} controls`}>
          <button
            type="button"
            className="jw-trendingBtn"
            aria-label="Scroll left"
            onClick={() => scrollByOne("prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="jw-trendingBtn"
            aria-label="Scroll right"
            onClick={() => scrollByOne("next")}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="jw-trendingScroller"
        ref={viewportRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        {items.map((it, idx) => (
          <button
            key={`${it.id}-${idx}`}
            type="button"
            className="jw-trendingTile"
            aria-label={it.id}
          >
            <img
              className="jw-trendingImg"
              src={it.src}
              alt={it.id}
              loading="lazy"
              onLoad={measureStep}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
