import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import PromotionsBody from "./PromotionsBody";

export default function PromotionsPage() {
  return (
    <LoggedInLayout activeId="promotions">
      <PromotionsBody />
    </LoggedInLayout>
  );
}
