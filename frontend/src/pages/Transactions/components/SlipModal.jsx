import React, { useEffect } from "react";

export default function SlipModal({ open, onClose, slipUrl }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="jw-txModalOverlay" role="dialog" aria-modal="true">
      <button type="button" className="jw-txModalBackdrop" onClick={onClose} aria-label="Close slip" />
      <div className="jw-txModalCard">
        <div className="jw-txModalHeader">
          <div className="jw-txModalTitle">Deposit Slip</div>
          <button type="button" className="jw-txModalX" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="jw-txModalBody">
          {slipUrl ? (
            <img className="jw-txSlipImg" src={slipUrl} alt="Deposit slip" />
          ) : (
            <div className="jw-txModalEmpty">No slip attached.</div>
          )}
        </div>
      </div>
    </div>
  );
}
