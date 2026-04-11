import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import GuestLoginPromptModal from "../components/GuestLoginPromptModal";
import { isNavigableContentUrl } from "../utils/contentLinks";

export const GuestContentContext = createContext(null);

/**
 * When `enabled` (guest on home), invalid/missing URLs open the login prompt; valid URLs navigate.
 * When disabled (logged-in client), valid URLs navigate; missing URLs do nothing.
 */
export function GuestContentProvider({ enabled, children }) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleContentUrl = useCallback(
    (linkUrl, openInNewTab = false) => {
      const raw = String(linkUrl ?? "").trim();
      if (isNavigableContentUrl(raw)) {
        if (openInNewTab) window.open(raw, "_blank", "noopener,noreferrer");
        else window.location.assign(raw);
        return;
      }
      if (enabled) setModalOpen(true);
    },
    [enabled]
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  const value = useMemo(
    () => ({
      enabled: !!enabled,
      handleContentUrl,
      closeModal,
    }),
    [enabled, handleContentUrl, closeModal]
  );

  return (
    <GuestContentContext.Provider value={value}>
      {children}
      {enabled && modalOpen ? <GuestLoginPromptModal onClose={closeModal} /> : null}
    </GuestContentContext.Provider>
  );
}

export function useGuestContent() {
  return useContext(GuestContentContext);
}

