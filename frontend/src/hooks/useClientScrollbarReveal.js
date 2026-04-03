import { useEffect } from "react";

/** Class toggled while scrolling so desktop scrollbars match mobile “show while in use” behavior. */
export const JW_CLIENT_SCROLLBAR_SCROLLING = "jw-clientScrollbar--scrolling";

/**
 * Attach scroll listener: show scrollbar thumb briefly while element is scrolling.
 * Pair with `.jw-clientScrollbar` in `styles/clientScrollbar.css` (desktop only).
 *
 * @param {HTMLElement | null} element
 * @returns {() => void} cleanup
 */
export function attachClientScrollbarReveal(element) {
  if (!element) return () => {};

  let timeoutId;
  const onScroll = () => {
    element.classList.add(JW_CLIENT_SCROLLBAR_SCROLLING);
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      element.classList.remove(JW_CLIENT_SCROLLBAR_SCROLLING);
    }, 700);
  };

  element.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    window.clearTimeout(timeoutId);
    element.classList.remove(JW_CLIENT_SCROLLBAR_SCROLLING);
    element.removeEventListener("scroll", onScroll);
  };
}

/**
 * @param {React.RefObject<HTMLElement | null>} ref
 */
export function useClientScrollbarReveal(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    return attachClientScrollbarReveal(el);
  }, [ref]);
}
