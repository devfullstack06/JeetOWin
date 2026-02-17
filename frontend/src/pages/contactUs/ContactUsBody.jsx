import React, { useMemo, useState } from "react";
import { Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

import usePageTitle from "../../hooks/usePageTitle";
import { getSortedSocialLinks } from "../../config/socialLinks";
import ContactLinkRow from "./ContactLinkRow";

import "./contactUs.css";

export default function ContactUsBody() {
  const navigate = useNavigate();
  usePageTitle("Contact Us");

  // keep step-ready like other modules (future chat panel)
  const [step, setStep] = useState("list"); // list | chat (later)

  const links = useMemo(() => getSortedSocialLinks(), []);

  const handleClose = () => {
    // same behavior style as Accounts when on main screen
    navigate("/home");
  };

  const sectionLabel = useMemo(() => {
    if (step === "list") return "Social Media";
    if (step === "chat") return "24/7 Chat Support";
    return "Social Media";
  }, [step]);

  return (
    <section className="jw-contactPage" aria-label="Contact Us">
      <div className="jw-contactCard">
        {/* HEADER (same structure as Accounts) */}
        <div className="jw-contactHeader">
          <div className="jw-contactHeaderLeft">
            <span className="jw-contactIcon" aria-hidden="true">
              <Headphones size={24} />
            </span>
            <h2 className="jw-contactTitle">Contact Us</h2>
          </div>

          <button
            type="button"
            className="jw-contactClose"
            aria-label="Close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* SECTION LABEL (same look as Accounts) */}
        <div className="jw-contactSectionLabel" aria-hidden="true">
          <span className="jw-contactLine" />
          <span className="jw-contactLabelText">{sectionLabel}</span>
          <span className="jw-contactLine" />
        </div>

        {/* CONTENT PANEL (same inner panel look) */}
        <div className="jw-contactPanel">
          <div className="jw-contactIntro">
            Reach us on your favourite social media platform
          </div>

          <div className="jw-contactList" role="list">
            {links.map((item) => (
              <ContactLinkRow
                key={item.id}
                item={item}
                onChatClick={() => {
                  // later: setStep("chat") and open chat module
                  alert("Chat support module will be added later.");
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
