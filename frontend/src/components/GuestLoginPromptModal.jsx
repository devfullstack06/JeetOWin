import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./guestLoginPromptModal.css";

export default function GuestLoginPromptModal({ onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="jw-guestLoginPromptOverlay"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="jw-guestLoginPrompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jw-guestLoginPrompt-line1"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="jw-guestLoginPrompt__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="jw-guestLoginPrompt__brand">
          <Logo staticDisplay className="jw-guestLoginPrompt__logoBrand" />
        </div>
        <div className="jw-guestLoginPrompt__body">
        <p id="jw-guestLoginPrompt-line1" className="jw-guestLoginPrompt__text">
          Please{" "}
          <Link to="/login" className="jw-guestLoginPrompt__link" onClick={onClose}>
            Login
          </Link>{" "}
          your account to see further details.
        </p>
        <p className="jw-guestLoginPrompt__text">
          Don&apos;t have an account yet?{" "}
          <Link to="/signup" className="jw-guestLoginPrompt__link" onClick={onClose}>
            SignUp
          </Link>{" "}
          here.
        </p>
        </div>
      </div>
    </div>
  );
}
