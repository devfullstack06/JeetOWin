import React, { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { markdownToHtml, personalizeAnnouncementHtml } from "../../../utils/simpleMarkdown";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatWhenCenter(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());

  if (sameDay) return `Today ${hh}:${mm}`;

  const dd = pad2(d.getDate());
  const MM = pad2(d.getMonth() + 1);
  return `${dd}-${MM} ${hh}:${mm}`;
}

export default function NotificationsDetailsStep({ message, onClose }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    setLightboxSrc(null);
  }, [message?.id]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxSrc, closeLightbox]);

  const when = useMemo(() => formatWhenCenter(message?.createdAt), [message]);
  const imagePaths = Array.isArray(message?.imagePaths) ? message.imagePaths : [];
  const bodyHtml = useMemo(() => {
    const md = message?.body || "";
    const viewer =
      (typeof window !== "undefined" &&
        (window.localStorage.getItem("jw:username") || "").trim()) ||
      "User";
    return personalizeAnnouncementHtml(markdownToHtml(md), { username: viewer });
  }, [message?.body]);

  return (
    <div className="jw-notifDetailsOuter">
      <div className="jw-notifDetailsPanel">
        <div className="jw-notifDetailsContent">
          {when && <div className="jw-notifDetailsWhen">{when}</div>}

          <div className="jw-notifDetailsBody">
            <div className="jw-notifMd" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            {imagePaths.length ? (
              <div className="jw-notifAttachmentTiles">
                {imagePaths.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="jw-notifAttachmentThumb"
                    aria-label="View full image"
                    onClick={() => setLightboxSrc(p)}
                  >
                    <img src={p} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="jw-notifDetailsActions">
          <button
            type="button"
            className="jw-notifCloseBtn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {lightboxSrc &&
        createPortal(
          <div
            className="jw-notifImageLightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <button
              type="button"
              className="jw-notifImageLightboxBackdrop"
              aria-label="Close image"
              onClick={closeLightbox}
            />
            <div className="jw-notifImageLightboxFrame">
              <img src={lightboxSrc} alt="" />
            </div>
            <button
              type="button"
              className="jw-notifImageLightboxClose"
              aria-label="Close"
              onClick={closeLightbox}
            >
              ×
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
