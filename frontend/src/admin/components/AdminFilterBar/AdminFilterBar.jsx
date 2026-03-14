import React from "react";
import "./adminFilterBar.css";

export function AdminFilterField({ label, children }) {
  return (
    <div className="jw-adminFilterField">
      <div className="jw-adminFilterField__label">{label}</div>
      <div className="jw-adminFilterField__control">{children}</div>
    </div>
  );
}

export function AdminInput({ value, onChange, placeholder, inputMode = "text" }) {
  return (
    <input
      className="jw-adminInput"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
    />
  );
}

export function AdminButton({
  children,
  variant = "light",
  onClick,
  type = "button",
}) {
  return (
    <button
      type={type}
      className={`jw-adminBtn ${variant === "green" ? "is-green" : "is-light"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function AdminFilterBar({
  children,
  summary,
  actions,
  onClear,
  onSubmit,
}) {
  return (
    <div className="jw-adminFilterBar">
      <div className="jw-adminFilterBar__grid">{children}</div>

      <div className="jw-adminFilterBar__actions">
        {summary ? (
          <div className="jw-adminFilterBar__summary">{summary}</div>
        ) : null}
        <div className="jw-adminFilterBar__buttons">
          {actions ? (
            actions
          ) : (
            <>
              <AdminButton variant="light" onClick={onClear}>
                Clear
              </AdminButton>
              <AdminButton variant="green" onClick={onSubmit}>
                Submit
              </AdminButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}