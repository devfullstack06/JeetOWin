import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import TransactionsBody from "./TransactionsBody";

export default function TransactionsPage({ initialTab }) {
  return (
    <LoggedInLayout activeId="transactions">
      <TransactionsBody initialTab={initialTab} />
    </LoggedInLayout>
  );
}
