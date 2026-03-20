import React, { useEffect, useRef } from "react";

/** Digits-only string → display with grouping commas (e.g. 10000 → "10,000"). */
function formatDigitsWithCommas(digits) {
  if (digits == null || digits === "") return "";
  const clean = String(digits).replace(/\D/g, "");
  if (!clean) return "";
  const n = Number(clean);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US");
}

export default function AmountInputRow({
  value,
  onChange,
  placeholder,
  minText,
}) {
  const inputRef = useRef(null);

  const handle = (e) => {
    const raw = e.target.value || "";
    const digitsOnly = raw.replace(/\D/g, "");
    onChange(digitsOnly);
  };

  const displayValue = formatDigitsWithCommas(value);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
  }, [displayValue]);

  return (
    <div className="jw-txAmountRow">
      <input
        ref={inputRef}
        className="jw-txAmountInput"
        inputMode="numeric"
        pattern="[0-9,]*"
        value={displayValue}
        onChange={handle}
        placeholder={placeholder}
      />
      <div className="jw-txMinText">{minText}</div>
    </div>
  );
}
