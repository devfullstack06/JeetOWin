import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import TransfersBody from "./TransfersBody";
import usePageTitle from "../../hooks/usePageTitle";

export default function TransfersPage() {
  usePageTitle("Transfers");

  return (
    <LoggedInLayout activeId="transfers">
      <TransfersBody />
    </LoggedInLayout>
  );
}
