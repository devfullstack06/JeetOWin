// frontend/src/config/socialLinks.js

export const SOCIAL_LINKS_DEFAULT = [
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/", iconSrc: "/social-icons/instagram.svg", sortOrder: 10 },
    { id: "pinterest", label: "Pinterest", href: "https://www.pinterest.com/", iconSrc: "/social-icons/pinterest.svg", sortOrder: 20 },
    { id: "telegram", label: "Telegram", href: "https://telegram.org/", iconSrc: "/social-icons/telegram.svg", sortOrder: 30 },
    { id: "whatsapp", label: "WhatsApp", href: "https://web.whatsapp.com/", iconSrc: "/social-icons/whatsapp.svg", sortOrder: 40 },
    { id: "x", label: "X", href: "https://x.com/", iconSrc: "/social-icons/x.svg", sortOrder: 50 },
    { id: "youtube", label: "YouTube", href: "https://www.youtube.com/", iconSrc: "/social-icons/youtube.svg", sortOrder: 60 },
    { id: "facebook", label: "Facebook", href: "https://www.facebook.com/", iconSrc: "/social-icons/facebook.svg", sortOrder: 70 },
  
    // special last item
    { id: "support", label: "24/7 Chat Support", href: null, iconSrc: "/social-icons/support.svg", sortOrder: 999, type: "chat" },
  ];
  
  // Optional helper
  export function getSortedSocialLinks(list = SOCIAL_LINKS_DEFAULT) {
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  