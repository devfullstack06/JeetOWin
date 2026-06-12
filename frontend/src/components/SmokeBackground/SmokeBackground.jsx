import { createPortal } from "react-dom";
import "./smokeBackground.css";

/**
 * Portaled to document.body so fixed z-index does not fall behind #root
 * (z-index: -1 inside #root is painted under the root layer and disappears).
 */
export default function SmokeBackground() {
  if (typeof document === "undefined") return null;
  return createPortal(<div className="smoke-bg" aria-hidden="true" />, document.body);
}
