import React, { useContext, useState } from "react";
import { GuestContentContext } from "../../contexts/GuestContentContext";
import PromotionDetailPopup from "./PromotionDetailPopup";
import "./PromotionsCard.css";

export default function PromotionsCard({ promo, variant = "rail", onActivate, preview = false }) {
  const guestCtx = useContext(GuestContentContext);
  const isGuest = guestCtx?.enabled ?? false;
  const [detailOpen, setDetailOpen] = useState(false);

  if (!promo) return null;

  const {
    tag,
    title,
    description,
    image,
    buttonLabel = "Read More",
    ctaLink = "#",
    ctaMode = "link",
    detailsMarkdown = "",
  } = promo;

  const isPopup = ctaMode === "popup";
  const openCtaInNewTab = /^https?:\/\//i.test(String(ctaLink || ""));

  function fireActivate() {
    onActivate?.(promo);
  }

  function onGuestCardActivate() {
    fireActivate();
    if (isPopup) {
      setDetailOpen(true);
    } else {
      guestCtx?.handleContentUrl?.(ctaLink, openCtaInNewTab);
    }
  }

  function onCardClick() {
    if (preview) return;
    if (isGuest) {
      onGuestCardActivate();
      return;
    }
    if (!isPopup) {
      fireActivate();
    }
  }

  function onPopupCtaClick(e) {
    if (preview) return;
    e.preventDefault();
    e.stopPropagation();
    fireActivate();
    setDetailOpen(true);
  }

  const rootClass =
    variant === "list" ? "jw-promoCard jw-promoCardList" : "jw-promoCard";

  const ctaEl = preview ? (
    <span className="jw-promoLink jw-promoLink--preview">{buttonLabel}</span>
  ) : isPopup ? (
    <button type="button" className="jw-promoLink jw-promoLink--button" onClick={onPopupCtaClick}>
      {buttonLabel}
    </button>
  ) : isGuest ? (
    <span className="jw-promoLink jw-promoLink--guest">{buttonLabel}</span>
  ) : (
    <a
      href={ctaLink}
      className="jw-promoLink"
      onClick={() => fireActivate()}
      target={ctaLink?.startsWith("http") ? "_blank" : undefined}
      rel={ctaLink?.startsWith("http") ? "noreferrer" : undefined}
    >
      {buttonLabel}
    </a>
  );

  return (
    <>
      <article
        className={rootClass}
        role={isGuest ? "button" : undefined}
        tabIndex={isGuest ? 0 : undefined}
        onClick={onCardClick}
        onKeyDown={
          isGuest
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onGuestCardActivate();
                }
              }
            : undefined
        }
      >
        <div className="jw-promoContent">
          {tag ? <span className="jw-promoTag">{tag}</span> : null}
          <h4 className="jw-promoHeading">{title}</h4>
          <p className="jw-promoSub">{description}</p>

          {isPopup && !preview ? (
            <div onClick={(e) => e.stopPropagation()}>{ctaEl}</div>
          ) : (
            ctaEl
          )}
        </div>

        <div className="jw-promoImgWrap" aria-hidden="true">
          <img src={image} alt={title} loading="lazy" />
        </div>
      </article>

      {!preview && isPopup ? (
        <PromotionDetailPopup
          open={detailOpen}
          title={title}
          imageSrc={image}
          markdown={detailsMarkdown}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}
