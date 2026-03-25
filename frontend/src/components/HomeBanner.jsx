import React, { useEffect, useMemo, useState } from "react";
import "./homeBanner.css";

export default function HomeBanner({ slides: slidesProp, intervalMs = 2000 }) {
  const [remoteSlides, setRemoteSlides] = useState(undefined);

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
    if (prefersReducedMotion || slideCount <= 1) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % slideCount);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, prefersReducedMotion, slideCount]);

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

  function toSlideLink(slide) {
    const raw = String(slide?.linkUrl || "").trim();
    if (!raw) return null;
    if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
    return null;
  }

  return (
    <section className="jw-banner" aria-label="Banner carousel">
      <div className="jw-bannerTrack" style={{ transform: `translateX(-${active * 100}%)` }}>
        {safeSlides.map((s) => {
          const desktop = s.imageDesktop || s.src || "";
          const mobile = s.imageMobile || desktop;
          const href = toSlideLink(s);
          const target = s.openInNewTab ? "_blank" : "_self";
          const rel = s.openInNewTab ? "noopener noreferrer" : undefined;
          return (
            <div key={s.id} className="jw-bannerSlide">
              {href ? (
                <a href={href} target={target} rel={rel} className="jw-bannerLink" aria-label={s.title || "Banner link"}>
                  <picture>
                    <source media="(max-width: 768px)" srcSet={mobile} />
                    <img className="jw-bannerImg" src={desktop} alt={s.title || ""} />
                  </picture>
                </a>
              ) : (
                <picture>
                  <source media="(max-width: 768px)" srcSet={mobile} />
                  <img className="jw-bannerImg" src={desktop} alt={s.title || ""} />
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
              if (!href) return;
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
