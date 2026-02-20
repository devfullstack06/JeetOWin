import React from "react";
import "./PromotionsCard.css";

export default function PromotionsCard({ promo, variant = "rail" }) {
  if (!promo) return null;

  const {
    tag,
    title,
    description,
    image,
    buttonLabel = "Read More",
    ctaLink = "#",
  } = promo;

  // variant: "rail" | "list"
  const rootClass =
    variant === "list" ? "jw-promoCard jw-promoCardList" : "jw-promoCard";

  return (
    <article className={rootClass}>
      <div className="jw-promoContent">
        {tag ? <span className="jw-promoTag">{tag}</span> : null}
        <h4 className="jw-promoHeading">{title}</h4>
        <p className="jw-promoSub">{description}</p>

        <a
          href={ctaLink}
          className="jw-promoLink"
          target={ctaLink?.startsWith("http") ? "_blank" : undefined}
          rel={ctaLink?.startsWith("http") ? "noreferrer" : undefined}
        >
          {buttonLabel}
        </a>
      </div>

      <div className="jw-promoImgWrap" aria-hidden="true">
        <img src={image} alt={title} loading="lazy" />
      </div>
    </article>
  );
}
