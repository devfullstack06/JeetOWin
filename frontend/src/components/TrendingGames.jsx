import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GuestContentContext } from "../contexts/GuestContentContext";
import { isNavigableContentUrl } from "../utils/contentLinks";
import "./trendingGames.css";

export default function TrendingGames({
  title = "Trending Games",
  items = undefined,
}) {
  const guestCtx = useContext(GuestContentContext);
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
    fetch("/api/trending-games")
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
    if (!safeItems.length) return;
    startAuto();
    return () => stopAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeItems.length]);

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

      {!safeItems.length ? (
        <div style={{ color: "#4f5b78", fontSize: 13, padding: "6px 0" }}>No Trending items configured.</div>
      ) : null}

      <div
        className="jw-trendingScroller"
        ref={viewportRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        {safeItems.map((it, idx) => (
          <button
            key={`${it.id}-${idx}`}
            type="button"
            className="jw-trendingTile"
            aria-label={it.name || String(it.id)}
            onClick={() => {
              if (guestCtx?.handleContentUrl) {
                guestCtx.handleContentUrl(it.linkUrl, !!it.openInNewTab);
                return;
              }
              const raw = String(it.linkUrl || "").trim();
              if (!isNavigableContentUrl(raw)) return;
              if (it.openInNewTab) window.open(raw, "_blank", "noopener,noreferrer");
              else window.location.assign(raw);
            }}
          >
            <img
              className="jw-trendingImg"
              src={it.imagePath || it.src}
              alt={it.name || String(it.id)}
              loading="lazy"
              onLoad={measureStep}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
