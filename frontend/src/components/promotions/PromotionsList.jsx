import React from "react";
import PromotionsCard from "./PromotionsCard";
import "./PromotionsList.css";

export default function PromotionsList({ items = [] }) {
  if (!items?.length) {
    return (
      <div className="jw-promosEmpty">
        No promotions available right now.
      </div>
    );
  }

  return (
    <div className="jw-promosList">
      {items.map((promo) => (
        <PromotionsCard key={promo.id} promo={promo} variant="list" />
      ))}
    </div>
  );
}
