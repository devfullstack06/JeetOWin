import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import WalletsBody from "./WalletsBody";

export default function WalletsPage() {
  return (
    <LoggedInLayout activeId="wallets">
      <WalletsBody />
    </LoggedInLayout>
  );
}
