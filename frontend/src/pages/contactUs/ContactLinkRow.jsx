import React from "react";
import "./contactUs.css";

function isSafeHref(href) {
  if (!href) return false;
  return (
    href.startsWith("https://") ||
    href.startsWith("http://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export default function ContactLinkRow({ item, onChatClick }) {
  const isChat = item.type === "chat";
  const clickable = isChat || isSafeHref(item.href);

  const content = (
    <>
      <img
        className="jw-contactRowIcon"
        src={item.iconSrc}
        alt={item.label}
        loading="lazy"
      />
      <div className="jw-contactRowLabel">{item.label}</div>
    </>
  );

  if (!clickable) {
    return <div className="jw-contactRow jw-contactRowDisabled">{content}</div>;
  }

  if (isChat) {
    return (
      <button
        type="button"
        className="jw-contactRow jw-contactRowBtn"
        onClick={() => onChatClick?.()}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      className="jw-contactRow"
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={item.label}
    >
      {content}
    </a>
  );
}
