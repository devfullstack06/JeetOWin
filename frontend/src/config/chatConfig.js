const rawProvider = (import.meta.env.VITE_CHAT_PROVIDER || "tawk").toString().trim().toLowerCase();

export const CHAT_PROVIDER = ["none", "tawk", "textcom"].includes(rawProvider)
  ? rawProvider
  : "tawk";

export const TAWK_SRC = (import.meta.env.VITE_TAWK_SRC || "").toString().trim();

export const CHAT_DEFAULTS = {
  startMinimized: true,
  hideOnAdmin: true,
  hideOnAuth: true,
  localDisableKey: "jw:chat:disabled",
};
