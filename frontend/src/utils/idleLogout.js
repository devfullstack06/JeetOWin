import { logout } from "./auth";

const DEFAULT_IDLE_MS = 60 * 60 * 1000; // 60 minutes

let idleTimer = null;

export function startIdleLogout({
  timeoutMs = DEFAULT_IDLE_MS,
  onLogout,
} = {}) {
  const resetTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      logout();
      onLogout?.();
    }, timeoutMs);
  };

  const events = [
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
  ];

  events.forEach((ev) =>
    window.addEventListener(ev, resetTimer, { passive: true })
  );

  resetTimer();

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    events.forEach((ev) =>
      window.removeEventListener(ev, resetTimer)
    );
  };
}
