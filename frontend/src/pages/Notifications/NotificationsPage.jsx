import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import NotificationsBody from "./NotificationsBody";

export default function NotificationsPage() {
  return (
    <LoggedInLayout activeId="notifications">
      <NotificationsBody />
    </LoggedInLayout>
  );
}
