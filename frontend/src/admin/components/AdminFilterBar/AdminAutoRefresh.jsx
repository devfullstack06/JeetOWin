import React, { useEffect, useRef, useState } from "react";

const DEFAULT_INTERVAL = 15;

/**
 * Auto-refresh: countdown 15 → 0 while on; when it reaches 0, onRefresh runs and timer resets.
 */
export default function AdminAutoRefresh({
  onRefresh,
  intervalSec = DEFAULT_INTERVAL,
}) {
  const [on, setOn] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(intervalSec);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const zeroHandledRef = useRef(false);

  useEffect(() => {
    if (!on) {
      setSecondsLeft(intervalSec);
      return undefined;
    }
    setSecondsLeft(intervalSec);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? s : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [on, intervalSec]);

  useEffect(() => {
    if (on && secondsLeft > 0) zeroHandledRef.current = false;
  }, [on, secondsLeft]);

  useEffect(() => {
    if (!on || secondsLeft !== 0) return;
    if (zeroHandledRef.current) return;
    zeroHandledRef.current = true;
    refreshRef.current?.();
    setSecondsLeft(intervalSec);
  }, [on, secondsLeft, intervalSec]);

  return (
    <div className="jw-adminAutoRefresh">
      <div className="jw-adminAutoRefresh__text">
        <div className="jw-adminAutoRefresh__title">Auto Refresh</div>
        {on ? (
          <div className="jw-adminAutoRefresh__timer">(Refresh in {secondsLeft})</div>
        ) : null}
      </div>
      <button
        type="button"
        className={`jw-adminAutoRefresh__switch ${on ? "is-on" : ""}`}
        role="switch"
        aria-checked={on}
        aria-label={on ? "Auto refresh on" : "Auto refresh off"}
        onClick={() => setOn((v) => !v)}
      >
        <span className="jw-adminAutoRefresh__thumb" aria-hidden />
      </button>
    </div>
  );
}
