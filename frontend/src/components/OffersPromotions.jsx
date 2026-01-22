import React, { useEffect, useLayoutEffect, useRef } from "react";
import "./offersPromotions.css";

const DEFAULT_ITEMS = [
  {
    id: "promo-1",
    img: "/offers-promotions/p (1).avif",
    tag: "LIMITED OFFER",
    heading: "Fast Payouts Guaranteed",
    subHeading: "Withdraw your winnings instantly with no delay.",
    link: "#",
  },
  {
    id: "promo-2",
    img: "/offers-promotions/p (2).avif",
    tag: "NEW USERS",
    heading: "Welcome Bonus Awaits",
    subHeading: "Sign up today and unlock exciting rewards.",
    link: "#",
  },
  {
    id: "promo-3",
    img: "/offers-promotions/p (3).avif",
    tag: "HOT DEAL",
    heading: "Bet More, Win More",
    subHeading: "Higher odds on selected games.",
    link: "#",
  },
  {
    id: "promo-4",
    img: "/offers-promotions/p (4).avif",
    tag: "EXCLUSIVE",
    heading: "VIP Promotions",
    subHeading: "Special perks for our top players.",
    link: "#",
  },
];

export default function OffersPromotions({
  title = "Offers & Promotions",
  items = DEFAULT_ITEMS,
}) {
  const safeItems = items?.length ? items : DEFAULT_ITEMS;

  const viewportRef = useRef(null);
  const stepRef = useRef(0);
  const autoTimerRef = useRef(null);

  // Measure 1 "slide" width (card width + gap) using real DOM sizes like TopSports
  const measureStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const card = viewport.querySelector(".jw-offerCard");
    const track = viewport.querySelector(".jw-offersTrack");
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

    // Wrap behavior
    if (dir === "next" && current >= maxLeft - 1) nextLeft = 0;
    if (dir === "prev" && current <= 0) nextLeft = maxLeft;

    // Clamp
    nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));

    viewport.scrollTo({ left: nextLeft, behavior: "smooth" });
  };

  const startAuto = () => {
    stopAuto();
    autoTimerRef.current = setInterval(() => {
      scrollByOne("next");
    }, 3000);
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
    <section className="jw-offers" aria-label={title}>
      <div className="jw-offersHeader">
        <div className="jw-offersTitle">{title}</div>

        <div className="jw-offersControls">
          <button
            type="button"
            className="jw-offersBtn"
            aria-label="Scroll left"
            onClick={() => scrollByOne("prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="jw-offersBtn"
            aria-label="Scroll right"
            onClick={() => scrollByOne("next")}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="jw-offersViewport"
        ref={viewportRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        <div className="jw-offersTrack">
          {safeItems.map((it, idx) => (
            <article key={`${it.id}-${idx}`} className="jw-offerCard">
              <div className="jw-offerContent">
                <span className="jw-offerTag">{it.tag}</span>
                <h4 className="jw-offerHeading">{it.heading}</h4>
                <p className="jw-offerSub">{it.subHeading}</p>
                <a href={it.link} className="jw-offerLink">
                  Read More
                </a>
              </div>

              <div className="jw-offerImgWrap">
                <img
                  src={it.img}
                  alt={it.heading}
                  loading="lazy"
                  onLoad={measureStep}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
