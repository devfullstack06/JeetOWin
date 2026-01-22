import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import "./brandsAvailable.css";

export default function BrandsAvailable({
  title = "Brands Available",
  imageFiles = [
    "b (1).png",
    "b (2).png",
    "b (3).png",
    "b (4).png",
    "b (5).png",
    "b (6).png",
  ],
}) {
  const items = useMemo(
    () =>
      imageFiles.map((file, idx) => ({
        id: `brand-${idx}`,
        src: `/brands-available/${file}`,
      })),
    [imageFiles]
  );

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  /* Measure one tile + gap (same as TopSports) */
  const measureStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const tile = viewport.querySelector(".jw-brandsTile");
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
    <section className="jw-brands" aria-label={title}>
      <div className="jw-brandsHeader">
        <div className="jw-brandsTitle">{title}</div>

        <div className="jw-brandsControls">
          <button
            type="button"
            className="jw-brandsBtn"
            aria-label="Scroll left"
            onClick={() => scrollByOne("prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="jw-brandsBtn"
            aria-label="Scroll right"
            onClick={() => scrollByOne("next")}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="jw-brandsScroller"
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
            className="jw-brandsTile"
            aria-label={it.id}
          >
            <img
              className="jw-brandsImg"
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
