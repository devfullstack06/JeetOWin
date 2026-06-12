import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Mail, MessageSquare, Copy, Check, Send } from "lucide-react";
import "./shareJeetOWinModal.css";

const DEFAULT_SHARE_URL = "https://www.jeetowin.com";

function openCentered(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Copy without async Clipboard API (often blocked or flaky on mobile Safari).
 * Runs synchronously in the click stack — required for iOS.
 */
function copyTextExecCommand(text) {
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("autocomplete", "off");
  ta.setAttribute("autocorrect", "off");
  ta.setAttribute("autocapitalize", "off");
  ta.setAttribute("spellcheck", "false");
  /* iOS: small but “real” box in viewport; readonly can block copy on some versions */
  ta.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;margin:0;border:0;outline:0;opacity:0.01;font-size:16px;";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  if (typeof ta.setSelectionRange === "function") {
    ta.setSelectionRange(0, text.length);
  }
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

/** Try execCommand first, then Clipboard API. */
function copyTextBestEffort(text) {
  if (copyTextExecCommand(text)) return Promise.resolve(true);
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false
    );
  }
  return Promise.resolve(false);
}

function IconWa() {
  return (
    <svg className="jw-shareModal__iconSvg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.075-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function IconIg() {
  return (
    <svg className="jw-shareModal__iconSvg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

function IconFb() {
  return (
    <svg className="jw-shareModal__iconSvg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="jw-shareModal__iconSvg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

export default function ShareJeetOWinModal({ open, onClose, shareUrl }) {
  const resolvedUrl = shareUrl || DEFAULT_SHARE_URL;
  const shareLine = `Check out JeetOWin — ${resolvedUrl}`;
  const [hint, setHint] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setHint("");
      setCopied(false);
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyLink = useCallback(() => {
    setHint("");
    void copyTextBestEffort(resolvedUrl).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } else {
        setHint("Could not copy automatically. Select and copy: " + resolvedUrl);
      }
    });
  }, [resolvedUrl]);

  const shareWhatsApp = useCallback(() => {
    setHint("");
    openCentered(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareLine)}`);
  }, [shareLine]);

  const shareTelegram = useCallback(() => {
    setHint("");
    openCentered(
      `https://t.me/share/url?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent("Check out JeetOWin")}`
    );
  }, [resolvedUrl]);

  const shareInstagram = useCallback(() => {
    setHint("");
    void copyTextBestEffort(resolvedUrl).then((ok) => {
      if (ok) {
        setHint(
          "Link copied. Instagram has no web share for links — open the Instagram app and paste the link in a story, DM, or bio."
        );
      } else {
        setHint("Could not copy automatically. Select and copy: " + resolvedUrl);
      }
    });
  }, [resolvedUrl]);

  const shareSms = useCallback(() => {
    setHint("");
    window.location.href = `sms:?body=${encodeURIComponent(shareLine)}`;
  }, [shareLine]);

  const shareEmail = useCallback(() => {
    setHint("");
    window.location.href = `mailto:?subject=${encodeURIComponent("JeetOWin")}&body=${encodeURIComponent(shareLine)}`;
  }, [shareLine]);

  const shareFacebook = useCallback(() => {
    setHint("");
    openCentered(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}`);
  }, [resolvedUrl]);

  const shareX = useCallback(() => {
    setHint("");
    openCentered(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareLine)}`
    );
  }, [shareLine]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="jw-shareModalOverlay"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="jw-shareModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jw-shareModal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="jw-shareModal__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <h2 id="jw-shareModal-title" className="jw-shareModal__title">
          Share JeetOWin
        </h2>
        <p className="jw-shareModal__sub">{resolvedUrl}</p>
        {hint ? <p className="jw-shareModal__hint">{hint}</p> : null}
        <div className="jw-shareModal__grid">
          <button type="button" className="jw-shareModal__btn" onClick={shareWhatsApp}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--wa">
              <IconWa />
            </span>
            <span className="jw-shareModal__btnLabel">WhatsApp</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={shareTelegram}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--tg">
              <Send className="jw-shareModal__iconSvg" size={22} strokeWidth={2} />
            </span>
            <span className="jw-shareModal__btnLabel">Telegram</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={shareInstagram}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--ig">
              <IconIg />
            </span>
            <span className="jw-shareModal__btnLabel">Instagram</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={shareSms}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--sms">
              <MessageSquare size={22} strokeWidth={2} />
            </span>
            <span className="jw-shareModal__btnLabel">SMS</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={shareEmail}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--mail">
              <Mail size={22} strokeWidth={2} />
            </span>
            <span className="jw-shareModal__btnLabel">Email</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={shareFacebook}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--fb">
              <IconFb />
            </span>
            <span className="jw-shareModal__btnLabel">Facebook</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={shareX}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--x">
              <IconX />
            </span>
            <span className="jw-shareModal__btnLabel">X (Twitter)</span>
          </button>
          <button type="button" className="jw-shareModal__btn" onClick={copyLink}>
            <span className="jw-shareModal__iconWrap jw-shareModal__iconWrap--copy">
              {copied ? <Check size={22} strokeWidth={2} /> : <Copy size={22} strokeWidth={2} />}
            </span>
            <span className="jw-shareModal__btnLabel">{copied ? "Copied" : "Copy link"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
