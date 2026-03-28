import React, { useEffect, useMemo, useRef, useState } from "react";
import "./clientDateRange.css";

function formatLabel(start, end) {
  if (!start && !end) return "";
  const s = start ? start : "Start";
  const e = end ? end : "End";
  return `${s} → ${e}`;
}

/** Same behavior as AdminDateRange; styled for client (transfers-style) surfaces. */
export default function ClientDateRange({
  startDate,
  endDate,
  onChange,
  placeholder = "Please Select",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const label = useMemo(
    () => formatLabel(startDate, endDate),
    [startDate, endDate]
  );

  const hasRangeError = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate > endDate;
  }, [startDate, endDate]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const setStart = (v) => onChange?.({ startDate: v || "", endDate });
  const setEnd = (v) => onChange?.({ startDate, endDate: v || "" });

  return (
    <div className="jw-clientDateRange" ref={wrapRef}>
      <button
        type="button"
        className="jw-clientDateRange__field"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`jw-clientDateRange__text ${label ? "has" : ""}`}>
          {label || placeholder}
        </span>
        <span className="jw-clientDateRange__chev">▾</span>
      </button>

      {open ? (
        <div className="jw-clientDateRange__pop" role="dialog" aria-label="Date range">
          <div className="jw-clientDateRange__row">
            <div className="jw-clientDateRange__lbl">Start</div>
            <input
              className="jw-clientDateRange__input"
              type="date"
              value={startDate || ""}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div className="jw-clientDateRange__row">
            <div className="jw-clientDateRange__lbl">End</div>
            <input
              className="jw-clientDateRange__input"
              type="date"
              value={endDate || ""}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          {hasRangeError ? (
            <div className="jw-clientDateRange__error">
              Start date must be before or same as end date.
            </div>
          ) : null}

          <div className="jw-clientDateRange__footer">
            <button
              type="button"
              className="jw-clientDateRange__miniBtn"
              onClick={() => {
                onChange?.({ startDate: "", endDate: "" });
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="jw-clientDateRange__miniBtn is-ok"
              onClick={(e) => {
                e.stopPropagation();
                if (hasRangeError) return;
                setOpen(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
