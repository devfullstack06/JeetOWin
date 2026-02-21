import React, { useMemo } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatWhen(iso) {
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

export default function NotificationTicketRow({
  variant, // "announcements" | "inbox"
  title,
  createdAt,
  isRead,
  onOpen,
}) {
  const when = useMemo(() => formatWhen(createdAt), [createdAt]);

  const isInbox = variant === "inbox";
  const isAnnouncements = variant === "announcements";

  return (
    <button
      type="button"
      className={`jw-notifRow ${isRead ? "is-read" : "is-unread"} ${
        isInbox ? "is-inbox" : "is-announcements"
      }`}
      onClick={onOpen}
    >
      {isInbox && (
        <div className="jw-notifRowLeftTime">
          <span className="jw-notifWhenLeft">{when}</span>
        </div>
      )}

      <div className="jw-notifRowTitleWrap">
        <span
          className={`jw-notifRowTitle ${
            isAnnouncements && !isRead ? "is-bold" : ""
          }`}
          title={title}
        >
          {title}
        </span>
      </div>

      {isAnnouncements && (
        <div className="jw-notifRowRightTime">
          <span className="jw-notifWhenRight">{when}</span>
        </div>
      )}

      {isInbox && !isRead && (
        <span className="jw-notifUnreadDot" aria-label="Unread" />
      )}
    </button>
  );
}
