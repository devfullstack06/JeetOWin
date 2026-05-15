import React, { useEffect } from "react";
import { X } from "lucide-react";
import { markdownToHtml } from "../../utils/simpleMarkdown";
import "./PromotionDetailPopup.css";

export default function PromotionDetailPopup({ open, title, imageSrc, markdown, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const html = markdownToHtml(markdown || "");

  return (
    <div className="jw-promoDetailOverlay" role="dialog" aria-modal="true" aria-label={title || "Promotion details"}>
      <button type="button" className="jw-promoDetailBackdrop" aria-label="Close" onClick={onClose} />
      <div className="jw-promoDetailModal" onClick={(e) => e.stopPropagation()}>
        <div className="jw-promoDetailModal__header">
          <h2 className="jw-promoDetailModal__title">{title || "Promotion"}</h2>
          <button type="button" className="jw-promoDetailModal__close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {imageSrc ? (
          <div className="jw-promoDetailModal__imageWrap">
            <img src={imageSrc} alt="" className="jw-promoDetailModal__image" />
          </div>
        ) : null}
        <div className="jw-promoDetailModal__body jw-promoDetailMd" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
