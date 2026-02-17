import React from "react";
import LoggedInLayout from "../../layouts/LoggedInLayout";
import ContactUsBody from "./ContactUsBody";

export default function ContactUsPage() {
  return (
    <LoggedInLayout activeId="contact">
      <ContactUsBody />
    </LoggedInLayout>
  );
}
