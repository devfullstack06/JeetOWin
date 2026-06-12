import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { referralDetailsHtml } from "../utils/referralDetailsHtml";

export default function ReferralDetailsModal({ open, title, body, onClose }) {
  const bodyHtml = useMemo(() => referralDetailsHtml(body), [body]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="jw-refDetailsOverlay" role="dialog" aria-modal="true" aria-label={title || "More details"}>
      <button type="button" className="jw-refDetailsBackdrop" aria-label="Close" onClick={onClose} />
      <div className="jw-refDetailsModal" onClick={(e) => e.stopPropagation()}>
        <div className="jw-refDetailsModal__head">
          <h3 className="jw-refDetailsModal__title">{title || "More details"}</h3>
          <button type="button" className="jw-refDetailsModal__close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div
          className="jw-refDetailsModal__body jw-refDetailsModal__body--rich"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </div>,
    document.body
  );
}
