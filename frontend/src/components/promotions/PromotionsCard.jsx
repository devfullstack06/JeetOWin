import React, { useContext } from "react";
import { GuestContentContext } from "../../contexts/GuestContentContext";
import "./PromotionsCard.css";

export default function PromotionsCard({ promo, variant = "rail" }) {
  const guestCtx = useContext(GuestContentContext);
  const isGuest = guestCtx?.enabled ?? false;

  if (!promo) return null;

  const {
    tag,
    title,
    description,
    image,
    buttonLabel = "Read More",
    ctaLink = "#",
  } = promo;

  const openCtaInNewTab = /^https?:\/\//i.test(String(ctaLink || ""));

  function onGuestCardActivate() {
    guestCtx?.handleContentUrl?.(ctaLink, openCtaInNewTab);
  }

  // variant: "rail" | "list"
  const rootClass =
    variant === "list" ? "jw-promoCard jw-promoCardList" : "jw-promoCard";

  return (
    <article
      className={rootClass}
      role={isGuest ? "button" : undefined}
      tabIndex={isGuest ? 0 : undefined}
      onClick={isGuest ? onGuestCardActivate : undefined}
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

        {isGuest ? (
          <span className="jw-promoLink jw-promoLink--guest">{buttonLabel}</span>
        ) : (
          <a
            href={ctaLink}
            className="jw-promoLink"
            target={ctaLink?.startsWith("http") ? "_blank" : undefined}
            rel={ctaLink?.startsWith("http") ? "noreferrer" : undefined}
          >
            {buttonLabel}
          </a>
        )}
      </div>

      <div className="jw-promoImgWrap" aria-hidden="true">
        <img src={image} alt={title} loading="lazy" />
      </div>
    </article>
  );
}
