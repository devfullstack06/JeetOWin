import React, { useEffect, useMemo, useRef, useState } from "react";
import "./adminDateRange.css";

function formatLabel(start, end) {
  if (!start && !end) return "";
  const s = start ? start : "Start";
  const e = end ? end : "End";
  return `${s} → ${e}`;
}

export default function AdminDateRange({
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

  // startDate must be <= endDate when both are set
  const hasRangeError = useMemo(() => {
    if (!startDate || !endDate) return false;
    // strings are in YYYY-MM-DD, so lexical compare is safe
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
    <div className="jw-adminDateRange" ref={wrapRef}>
      <button
        type="button"
        className="jw-adminDateRange__field"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`jw-adminDateRange__text ${label ? "has" : ""}`}>
          {label || placeholder}
        </span>
        <span className="jw-adminDateRange__chev">▾</span>
      </button>

      {open ? (
        <div className="jw-adminDateRange__pop" role="dialog" aria-label="Date range">
          <div className="jw-adminDateRange__row">
            <div className="jw-adminDateRange__lbl">Start</div>
            <input
              className="jw-adminDateRange__input"
              type="date"
              value={startDate || ""}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div className="jw-adminDateRange__row">
            <div className="jw-adminDateRange__lbl">End</div>
            <input
              className="jw-adminDateRange__input"
              type="date"
              value={endDate || ""}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          {hasRangeError ? (
            <div className="jw-adminDateRange__error">
              Start date must be before or same as end date.
            </div>
          ) : null}

          <div className="jw-adminDateRange__footer">
            <button
              type="button"
              className="jw-adminDateRange__miniBtn"
              onClick={() => {
                onChange?.({ startDate: "", endDate: "" });
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="jw-adminDateRange__miniBtn is-ok"
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