import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import ReferralBody from "./ReferralBody";

export default function ReferralPage() {
  return (
    <LoggedInLayout activeId="referral">
      <ReferralBody />
    </LoggedInLayout>
  );
}
