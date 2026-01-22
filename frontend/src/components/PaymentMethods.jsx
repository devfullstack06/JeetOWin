import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import "./paymentMethods.css";

export default function PaymentMethods({
  title = "Payment Methods",
  // ✅ Assuming PNG extension. If yours are .svg/.webp, change here.
  imageFiles = [
    "pm (1).svg",
    "pm (2).svg",
    "pm (3).svg",
    "pm (4).svg",
    "pm (5).svg",
    "pm (6).svg",
    "pm (7).svg",
    "pm (8).svg",
    "pm (9).svg",
  ],
}) {
  const items = useMemo(
    () =>
      imageFiles.map((file, idx) => ({
        id: `pm-${idx}`,
        src: `/payment-methods/${file}`,
      })),
    [imageFiles]
  );

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  const measureStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const tile = viewport.querySelector(".jw-paymentsTile");
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
    <section className="jw-payments" aria-label={title}>
      <div className="jw-paymentsHeader">
        <div className="jw-paymentsTitle">{title}</div>

        <div className="jw-paymentsControls">
          <button
            type="button"
            className="jw-paymentsBtn"
            aria-label="Scroll left"
            onClick={() => scrollByOne("prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="jw-paymentsBtn"
            aria-label="Scroll right"
            onClick={() => scrollByOne("next")}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="jw-paymentsScroller"
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
            className="jw-paymentsTile"
            aria-label={it.id}
          >
            <img
              className="jw-paymentsImg"
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
