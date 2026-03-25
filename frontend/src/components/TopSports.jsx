import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./topSports.css";

export default function TopSports({ items = undefined, title = "Top Sports" }) {
  const [remoteItems, setRemoteItems] = useState(undefined);
  const safeItems = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (remoteItems === undefined) return [];
    return Array.isArray(remoteItems) ? remoteItems : [];
  }, [items, remoteItems]);

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(items)) return;
    let ignore = false;
    fetch("/api/top-sports")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setRemoteItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!ignore) setRemoteItems([]);
      });
    return () => {
      ignore = true;
    };
  }, [items]);

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
    if (!safeItems.length) return;
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

      {!safeItems.length ? (
        <div style={{ color: "#4f5b78", fontSize: 13, padding: "6px 0" }}>No Top Sports items configured.</div>
      ) : null}

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
              key={`${it.id}-${idx}`}
              type="button"
              className="jw-topSportsCard"
              aria-label={it.id}
              onClick={() => {
                const raw = String(it.linkUrl || "").trim();
                if (!raw) return;
                if (!(raw.startsWith("/") || /^https?:\/\//i.test(raw))) return;
                if (it.openInNewTab) window.open(raw, "_blank", "noopener,noreferrer");
                else window.location.assign(raw);
              }}
            >
              <img
                className="jw-topSportsImg"
                src={it.imagePath || it.src}
                alt={it.name || it.id}
                loading="lazy"
                onLoad={measureStep}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
