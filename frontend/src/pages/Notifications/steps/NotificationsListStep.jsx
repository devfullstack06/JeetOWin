import React from "react";
import NotificationTicketRow from "../components/NotificationTicketRow";

export default function NotificationsListStep({
  activeTab,
  items,
  readSet,
  onOpenMessage,
}) {
  if (!items?.length) {
    return (
      <div className="jw-notifEmpty" role="status">
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="jw-notifRows" role="list">
      {items.map((m) => {
        const isRead = readSet.has(m.id);

        return (
          <div key={m.id} role="listitem">
            <NotificationTicketRow
              variant={activeTab}
              title={m.title}
              createdAt={m.createdAt}
              isRead={isRead}
              onOpen={() => onOpenMessage(m.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
