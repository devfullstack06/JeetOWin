import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const popRef = useRef(null);

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

  const updatePosition = () => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const popWidth = 260;
    const gap = 6;
    const left = Math.min(
      Math.max(8, rect.right - popWidth),
      window.innerWidth - popWidth - 8
    );
    let top = rect.bottom + gap;
    const approxHeight = 220;
    if (top + approxHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - approxHeight - gap);
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const inField = wrapRef.current?.contains(e.target);
      const inPop = popRef.current?.contains(e.target);
      if (!inField && !inPop) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const setStart = (v) => onChange?.({ startDate: v || "", endDate });
  const setEnd = (v) => onChange?.({ startDate, endDate: v || "" });

  const popover =
    open && pos
      ? createPortal(
          <div
            ref={popRef}
            className="jw-adminDateRange__pop jw-adminDateRange__pop--portal"
            role="dialog"
            aria-label="Date range"
            style={{ top: pos.top, left: pos.left }}
          >
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
          </div>,
          document.body
        )
      : null;

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
      {popover}
    </div>
  );
}
