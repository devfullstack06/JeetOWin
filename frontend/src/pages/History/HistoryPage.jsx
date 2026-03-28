import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import usePageTitle from "../../hooks/usePageTitle";
import HistoryBody from "./HistoryBody";

export default function HistoryPage() {
  usePageTitle("History");

  return (
    <LoggedInLayout activeId="history">
      <HistoryBody />
    </LoggedInLayout>
  );
}
