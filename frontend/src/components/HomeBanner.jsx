import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GuestContentContext } from "../contexts/GuestContentContext";
import "./homeBanner.css";

const DRAG_CLICK_THRESHOLD_PX = 10;

export default function HomeBanner({ slides: slidesProp, intervalMs = 4000 }) {
  const guestCtx = useContext(GuestContentContext);
  const guestEnabled = guestCtx?.enabled ?? false;
  const [remoteSlides, setRemoteSlides] = useState(undefined);
  const containerRef = useRef(null);
  const [viewportW, setViewportW] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const dragStartRef = useRef(null);
  const suppressLinkClickRef = useRef(false);

  useEffect(() => {
    if (slidesProp !== undefined) return;
    let ignore = false;
    fetch("/api/home-banner-slides")
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        const list = Array.isArray(data.slides) ? data.slides : [];
        setRemoteSlides(list);
      })
      .catch(() => {
        if (!ignore) {
          setRemoteSlides([]);
        }
      });
    return () => {
      ignore = true;
    };
  }, [slidesProp]);

  const resolvedSlides = useMemo(() => {
    if (slidesProp !== undefined) return slidesProp;
    if (remoteSlides === undefined) return null;
    return remoteSlides;
  }, [slidesProp, remoteSlides]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const [active, setActive] = useState(0);

  const slideCount = resolvedSlides?.length ?? 0;

  useEffect(() => {
    setActive(0);
  }, [slideCount]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.offsetWidth;
      if (w > 0) setViewportW(w);
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w != null && w > 0) setViewportW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [resolvedSlides, slideCount]);

  useEffect(() => {
    if (prefersReducedMotion || slideCount <= 1 || isPointerDragging) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % slideCount);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, prefersReducedMotion, slideCount, isPointerDragging]);

  const trackTransform = useMemo(() => {
    if (viewportW <= 0 || slideCount <= 0) {
      return `translateX(-${active * 100}%)`;
    }
    let x = -active * viewportW + dragPx;
    if (slideCount > 1) {
      const minX = -(slideCount - 1) * viewportW;
      const maxX = 0;
      x = Math.max(minX, Math.min(maxX, x));
    }
    return `translateX(${x}px)`;
  }, [active, dragPx, slideCount, viewportW]);

  if (resolvedSlides === null) {
    return (
      <section className="jw-banner jw-banner--skeleton" aria-busy="true" aria-label="Loading banner">
        <div className="jw-bannerSkeletonInner" />
      </section>
    );
  }

  if (resolvedSlides.length === 0) {
    return (
      <section className="jw-banner jw-banner--empty" aria-label="Banner carousel">
        <p className="jw-bannerEmptyMsg">No banner slides are active.</p>
      </section>
    );
  }

  const safeSlides = resolvedSlides;
  const leftCount = Math.floor((safeSlides.length - 1) / 2);
  const rightCount = safeSlides.length - 1 - leftCount;
  const leftDots = Array.from({ length: leftCount }, (_, i) => i);
  const rightDots = Array.from({ length: rightCount }, (_, i) => i + leftCount);
  const currentSlide = safeSlides[active];

  function goTo(index) {
    setActive(index);
  }

  function isTargetInControls(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(target.closest(".jw-bannerControls"));
  }

  function endDrag(e) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setIsPointerDragging(false);
    setDragPx(0);
    try {
      if (e?.currentTarget && e.pointerId != null) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    const w = containerRef.current?.offsetWidth || viewportW;
    if (!start || w <= 0 || slideCount <= 1) return;
    const dx = e.clientX - start.startX;
    if (Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX) {
      suppressLinkClickRef.current = true;
    }
    const threshold = Math.min(56, w * 0.12);
    if (dx < -threshold) {
      setActive((prev) => Math.min(slideCount - 1, prev + 1));
    } else if (dx > threshold) {
      setActive((prev) => Math.max(0, prev - 1));
    }
  }

  function onBannerPointerDown(e) {
    if (slideCount <= 1) return;
    if (isTargetInControls(e.target)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartRef.current = { startX: e.clientX, pointerId: e.pointerId };
    setIsPointerDragging(true);
    setDragPx(0);
    suppressLinkClickRef.current = false;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onBannerPointerMove(e) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    setDragPx(e.clientX - dragStartRef.current.startX);
  }

  function onBannerPointerUp(e) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    endDrag(e);
  }

  function onBannerLostPointerCapture(e) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    dragStartRef.current = null;
    setIsPointerDragging(false);
    setDragPx(0);
  }

  function toSlideLink(slide) {
    const raw = String(slide?.linkUrl || "").trim();
    if (!raw) return null;
    if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
    return null;
  }

  function onNoLinkBannerActivate() {
    if (suppressLinkClickRef.current) {
      suppressLinkClickRef.current = false;
      return;
    }
    guestCtx?.handleContentUrl?.("", false);
  }

  return (
    <section
      ref={containerRef}
      className={`jw-banner${slideCount > 1 ? " jw-banner--draggable" : ""}`}
      aria-label="Banner carousel"
      onPointerDown={slideCount > 1 ? onBannerPointerDown : undefined}
      onPointerMove={slideCount > 1 ? onBannerPointerMove : undefined}
      onPointerUp={slideCount > 1 ? onBannerPointerUp : undefined}
      onPointerCancel={slideCount > 1 ? onBannerPointerUp : undefined}
      onLostPointerCapture={slideCount > 1 ? onBannerLostPointerCapture : undefined}
    >
      <div
        className={`jw-bannerTrack${isPointerDragging ? " is-dragging" : ""}`}
        style={{ transform: trackTransform }}
        onClickCapture={(ev) => {
          if (!suppressLinkClickRef.current) return;
          ev.preventDefault();
          ev.stopPropagation();
          suppressLinkClickRef.current = false;
        }}
      >
        {safeSlides.map((s) => {
          const desktop = s.imageDesktop || s.src || "";
          const mobile = s.imageMobile || desktop;
          const href = toSlideLink(s);
          const target = s.openInNewTab ? "_blank" : "_self";
          const rel = s.openInNewTab ? "noopener noreferrer" : undefined;
          return (
            <div key={s.id} className="jw-bannerSlide">
              {href ? (
                <a href={href} target={target} rel={rel} className="jw-bannerLink" aria-label={s.title || "Banner link"} draggable={false}>
                  <picture>
                    <source media="(max-width: 768px)" srcSet={mobile} />
                    <img className="jw-bannerImg" src={desktop} alt={s.title || ""} draggable={false} />
                  </picture>
                </a>
              ) : guestEnabled ? (
                <button
                  type="button"
                  className="jw-bannerNoLinkHit"
                  aria-label={s.title ? `${s.title} — sign in to continue` : "Banner — sign in to continue"}
                  onClick={onNoLinkBannerActivate}
                >
                  <picture>
                    <source media="(max-width: 768px)" srcSet={mobile} />
                    <img className="jw-bannerImg" src={desktop} alt={s.title || ""} draggable={false} />
                  </picture>
                </button>
              ) : (
                <picture>
                  <source media="(max-width: 768px)" srcSet={mobile} />
                  <img className="jw-bannerImg" src={desktop} alt={s.title || ""} draggable={false} />
                </picture>
              )}
            </div>
          );
        })}
      </div>

      <div className="jw-bannerControls">
        <div className="jw-bannerDots">
          {leftDots.map((i) => (
            <button
              key={`l-${i}`}
              className={`jw-dot ${active === i ? "is-active" : ""}`}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}

          <button
            className="jw-bannerTitleBtn"
            type="button"
            aria-label={`Current banner: ${currentSlide.title}`}
            onClick={() => {
              const href = toSlideLink(currentSlide);
              if (!href) {
                guestCtx?.handleContentUrl?.("", false);
                return;
              }
              if (currentSlide.openInNewTab) {
                window.open(href, "_blank", "noopener,noreferrer");
              } else {
                window.location.assign(href);
              }
            }}
          >
            {currentSlide.title}
          </button>

          {rightDots.map((iOffset) => {
            const slideIndex = iOffset + 1;
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
