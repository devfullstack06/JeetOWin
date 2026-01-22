import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import AccountsBody from "./AccountsBody";

export default function AccountsPage() {
  return (
    <LoggedInLayout activeId="accounts">
      <AccountsBody onClose={() => { /* optional: navigate back if you want */ }} />
    </LoggedInLayout>
  );
}
