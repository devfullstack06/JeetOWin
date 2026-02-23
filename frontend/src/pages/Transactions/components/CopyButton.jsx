import React, { useState } from "react";
import { Copy } from "lucide-react";

export default function CopyButton({ textToCopy }) {
  const [done, setDone] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(textToCopy || ""));
      setDone(true);
      setTimeout(() => setDone(false), 900);
    } catch {
      // silent
    }
  };

  return (
    <button
      type="button"
      className={`jw-txCopyBtn ${done ? "is-done" : ""}`}
      onClick={onCopy}
      aria-label="Copy"
      title="Copy"
    >
      <Copy size={14} />
    </button>
  );
}
