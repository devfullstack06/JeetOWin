import React, { useEffect, useLayoutEffect, useRef } from "react";
import PromotionsCard from "./PromotionsCard";
import "./PromotionsRail.css";

export default function PromotionsRail({
  title = "Offers & Promotions",
  items = [],
  onCardActivate,
  preview = false,
}) {
  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  const measureStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const card = viewport.querySelector(".jw-promoRailCard");
    const track = viewport.querySelector(".jw-promoRailTrack");
    if (!card || !track) return;

    const cardW = card.getBoundingClientRect().width;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;

    stepRef.current = cardW + gap;
  };

  useLayoutEffect(() => {
    measureStep();

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
    autoTimerRef.current = setInterval(() => scrollByOne("next"), 3000);
  };

  const stopAuto = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!items?.length) return;
    startAuto();
    return () => stopAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length]);

  return (
    <section className="jw-promoRail" aria-label={title}>
      <div className="jw-promoRailHeader">
        <div className="jw-promoRailTitle">{title}</div>

        <div className="jw-promoRailControls">
          <button
            type="button"
            className="jw-promoRailBtn"
            aria-label="Scroll left"
            onClick={() => scrollByOne("prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="jw-promoRailBtn"
            aria-label="Scroll right"
            onClick={() => scrollByOne("next")}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="jw-promoRailViewport"
        ref={viewportRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        <div className="jw-promoRailTrack">
          {items.map((promo, idx) => (
            <div key={`${promo.id}-${idx}`} className="jw-promoRailCard">
              <PromotionsCard promo={promo} variant="rail" onActivate={onCardActivate} preview={preview} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
