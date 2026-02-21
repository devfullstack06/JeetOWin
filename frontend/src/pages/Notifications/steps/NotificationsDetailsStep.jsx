import React, { useMemo } from "react";

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
  const when = useMemo(() => formatWhenCenter(message?.createdAt), [message]);

  return (
    <div className="jw-notifDetailsOuter">
      <div className="jw-notifDetailsPanel">
        <div className="jw-notifDetailsContent">
          {when && <div className="jw-notifDetailsWhen">{when}</div>}

          <div className="jw-notifDetailsBody">
            {(message?.body || "").split("\n").map((line, idx) => (
              <p key={idx} className="jw-notifParagraph">
                {line}
              </p>
            ))}
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
    </div>
  );
}
