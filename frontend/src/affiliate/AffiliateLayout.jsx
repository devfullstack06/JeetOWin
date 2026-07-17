import React from "react";
import { Outlet } from "react-router-dom";
import AffiliateLoggedInLayout from "./layouts/AffiliateLoggedInLayout";

export default function AffiliateLayout() {
  return (
    <AffiliateLoggedInLayout>
      <Outlet />
    </AffiliateLoggedInLayout>
  );
}
