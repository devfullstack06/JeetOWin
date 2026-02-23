import React from "react";

export default function AmountInputRow({
  value,
  onChange,
  placeholder,
  minText,
}) {
  const handle = (e) => {
    const raw = e.target.value || "";
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    onChange(digitsOnly);
  };

  return (
    <div className="jw-txAmountRow">
      <input
        className="jw-txAmountInput"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handle}
        placeholder={placeholder}
      />
      <div className="jw-txMinText">{minText}</div>
    </div>
  );
}
