import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GuestContentContext } from "../contexts/GuestContentContext";
import { isNavigableContentUrl } from "../utils/contentLinks";
import "./brandsAvailable.css";

export default function BrandsAvailable({ title = "Brands Available", items: itemsProp = undefined }) {
  const navigate = useNavigate();
  const guestCtx = useContext(GuestContentContext);
  const [remoteItems, setRemoteItems] = useState(undefined);
  const items = useMemo(() => {
    if (Array.isArray(itemsProp)) return itemsProp;
    if (remoteItems === undefined) return [];
    return Array.isArray(remoteItems) ? remoteItems : [];
  }, [itemsProp, remoteItems]);

  useEffect(() => {
    if (Array.isArray(itemsProp)) return;
    let ignore = false;
    fetch("/api/brands/home")
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
  }, [itemsProp]);

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

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
    if (!items.length) return undefined;
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

      {!items.length ? (
        <div style={{ color: "#4f5b78", fontSize: 13, padding: "6px 0" }}>No brands configured for home.</div>
      ) : null}

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
            aria-label={it.name || String(it.id)}
            onClick={() => {
              if (guestCtx?.enabled) {
                guestCtx.handleContentUrl(it.linkUrl, !!it.openInNewTab);
                return;
              }
              if (guestCtx && !guestCtx.enabled) {
                navigate("/accounts");
                return;
              }
              const raw = String(it.linkUrl || "").trim();
              if (!isNavigableContentUrl(raw)) return;
              if (it.openInNewTab) window.open(raw, "_blank", "noopener,noreferrer");
              else window.location.assign(raw);
            }}
          >
            <img
              className="jw-brandsImg"
              src={it.iconPath || it.src}
              alt={it.name || ""}
              loading="lazy"
              onLoad={measureStep}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
