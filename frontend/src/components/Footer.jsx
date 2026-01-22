import React from "react";
import "./footer.css";

const DEFAULT_RESPONSIBLE = {
  title: "Responsible Gambling:",
  logos: [
    { id: "gamcare", src: "/footer/gamcare.svg", alt: "GamCare" },
    { id: "18plus", src: "/footer/18plus.svg", alt: "18 Plus" },
    { id: "stopgamble", src: "/footer/stopgamble.svg", alt: "StopGamble" },
  ],
  text: "JeetOWin is committed to responsible gambling, for more information visit",
  linkText: "Gamblingtherapy.org",
  linkHref: "#",
};

const DEFAULT_REGULATIONS = {
  title: "Regulations & Support:",
  links: [
    { id: "terms", label: "Terms and Conditions", href: "#" },
    { id: "privacy", label: "Privacy Policy", href: "#" },
    { id: "help", label: "Help Center", href: "#" },
    { id: "faqs", label: "FAQs", href: "#" },
  ],
};

const DEFAULT_SOCIAL = {
  title: "Social Media:",
  items: [
    {
      id: "instagram",
      label: "Instagram",
      href: "#",
      iconSrc: "/social-icons/instagram.svg",
    },
    {
      id: "pinterest",
      label: "Pinterest",
      href: "#",
      iconSrc: "/social-icons/pinterest.svg",
    },
    {
      id: "telegram",
      label: "Telegram",
      href: "#",
      iconSrc: "/social-icons/telegram.svg",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: "#",
      iconSrc: "/social-icons/whatsapp.svg",
    },
    {
      id: "x",
      label: "X",
      href: "#",
      iconSrc: "/social-icons/x.svg",
    },
    {
      id: "youtube",
      label: "YouTube",
      href: "#",
      iconSrc: "/social-icons/youtube.svg",
    },
    {
      id: "facebook",
      label: "Facebook",
      href: "#",
      iconSrc: "/social-icons/facebook.svg",
    },
  ],
};

export default function Footer({
  responsible = DEFAULT_RESPONSIBLE,
  regulations = DEFAULT_REGULATIONS,
  social = DEFAULT_SOCIAL,
  copyright = "© 2026 JeetOWin.com | All Rights Reserved.",
  onOpenRegulation = () => {},
}) {
  return (
    <footer className="jw-footer" aria-label="Footer">
      <div className="jw-footerPanel">
        {/* Responsible Gambling */}
        <div className="jw-footerBlock">
          <div className="jw-footerBlockTitle">{responsible.title}</div>

          <div className="jw-footerLogos" aria-label="Responsible gambling logos">
            {responsible.logos?.map((l) => (
              <img
                key={l.id}
                className="jw-footerLogo"
                src={l.src}
                alt={l.alt || l.id}
                loading="lazy"
              />
            ))}
          </div>

          {/* ✅ Wrap allowed (up to 2 lines on small widths) */}
          <div
            className="jw-footerOneLineWrap"
            aria-label="Responsible gambling message"
          >
            <span className="jw-footerText">{responsible.text} </span>
            <a
              className="jw-footerLink"
              href={responsible.linkHref || "#"}
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              {responsible.linkText}
            </a>
          </div>
        </div>

        <div className="jw-footerDivider" />

        {/* Regulations & Support */}
        <div className="jw-footerBlock">
          <div className="jw-footerBlockTitle">{regulations.title}</div>

          <nav className="jw-footerLinks" aria-label="Regulations and support links">
            {regulations.links?.map((l, idx) => (
              <React.Fragment key={l.id || `${l.label}-${idx}`}>
                <a
                  className="jw-footerNavLink"
                  href={l.href || "#"}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenRegulation(l);
                  }}
                >
                  {l.label}
                </a>
                {idx !== regulations.links.length - 1 && (
                  <span className="jw-footerDot">•</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="jw-footerDivider" />

        {/* Social Media */}
        <div className="jw-footerBlock">
          <div className="jw-footerBlockTitle">{social.title}</div>

          <div className="jw-footerSocial" aria-label="Social media icons">
            {social.items?.map((s) => (
              <a
                key={s.id}
                className="jw-footerIcon"
                href={s.href || "#"}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                onClick={(e) => {
                  if (!s.href || s.href === "#") e.preventDefault();
                }}
              >
                <img
                  className="jw-footerIconImg"
                  src={s.iconSrc}
                  alt={s.label}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>

        <div className="jw-footerDivider" />

        <div className="jw-footerCopy">{copyright}</div>
      </div>
    </footer>
  );
}
