import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import Logo from "../../components/Logo";
import {
  getAlarmCycleIntervalMs,
  getNotificationVolumePercent,
  playPendingAlarmCycle,
  resumeNotifAudioContext,
  setNotificationVolumePercent,
} from "../utils/adminNotificationBellSounds";
import "./adminHeader.css";

const PENDING_POLL_MS = 15_000;
const SOUND_PREF_LS = "jw:adminNotifSoundOn";

const emptyPending = {
  accountsPending: 0,
  transfersPending: 0,
  depositsPending: 0,
  withdrawsPending: 0,
  totalPending: 0,
};

function readSoundPref() {
  try {
    const v = localStorage.getItem(SOUND_PREF_LS);
    if (v === null) return true;
    return v === "1" || v === "true";
  } catch {
    return true;
  }
}

function writeSoundPref(on) {
  try {
    localStorage.setItem(SOUND_PREF_LS, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export default function AdminHeader({
  userName,
  onMenu,
  onCloseMenu,
  isMenuOpen,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pending, setPending] = useState(emptyPending);
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const [notifVolume, setNotifVolume] = useState(getNotificationVolumePercent);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const loadPending = useCallback(async () => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch("/api/admin/notifications/pending-tickets", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setPending({
        accountsPending: Number(body.accountsPending) || 0,
        transfersPending: Number(body.transfersPending) || 0,
        depositsPending: Number(body.depositsPending) || 0,
        withdrawsPending: Number(body.withdrawsPending) || 0,
        totalPending: Number(body.totalPending) || 0,
      });
    } catch {
      /* keep last counts */
    }
  }, []);

  useEffect(() => {
    loadPending();
    const id = window.setInterval(loadPending, PENDING_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadPending]);

  useEffect(() => {
    function tryResume() {
      if (!soundOnRef.current) return;
      resumeNotifAudioContext();
    }
    document.addEventListener("click", tryResume, { capture: true });
    document.addEventListener("keydown", tryResume, { capture: true });
    document.addEventListener("touchstart", tryResume, { capture: true, passive: true });
    window.addEventListener("focus", tryResume);
    return () => {
      document.removeEventListener("click", tryResume, { capture: true });
      document.removeEventListener("keydown", tryResume, { capture: true });
      document.removeEventListener("touchstart", tryResume, { capture: true });
      window.removeEventListener("focus", tryResume);
    };
  }, []);

  useEffect(() => {
    function onBecameVisible() {
      if (document.visibilityState !== "visible") return;
      if (!soundOnRef.current) return;
      void resumeNotifAudioContext().then((ok) => {
        if (!ok || !soundOnRef.current) return;
        if (pendingRef.current.totalPending <= 0) return;
        playPendingAlarmCycle(pendingRef.current);
      });
    }
    document.addEventListener("visibilitychange", onBecameVisible);
    return () => document.removeEventListener("visibilitychange", onBecameVisible);
  }, []);

  useEffect(() => {
    if (!soundOn || pending.totalPending <= 0) return undefined;
    const intervalMs = getAlarmCycleIntervalMs();
    const tick = () => {
      if (!soundOnRef.current) return;
      const p = pendingRef.current;
      if (p.totalPending <= 0) return;
      void resumeNotifAudioContext().then((ok) => {
        if (!ok || !soundOnRef.current) return;
        if (pendingRef.current.totalPending <= 0) return;
        playPendingAlarmCycle(pendingRef.current);
      });
    };
    const id = window.setInterval(tick, intervalMs);
    tick();
    return () => window.clearInterval(id);
  }, [
    soundOn,
    pending.totalPending,
    pending.accountsPending,
    pending.transfersPending,
    pending.depositsPending,
    pending.withdrawsPending,
  ]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdatePassword = () => {
    setOpen(false);
    navigate("/admin/update-password");
  };

  const handleLogout = () => {
    setOpen(false);

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("jw:fullName");
    localStorage.removeItem("jw:username");

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      navigate("/home", { replace: true });
    } else {
      window.location.href = "https://jeetowin.com/home";
    }
  };

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      writeSoundPref(next);
      if (next) {
        resumeNotifAudioContext().then((ok) => {
          if (ok && pendingRef.current.totalPending > 0) {
            playPendingAlarmCycle(pendingRef.current);
          }
        });
      }
      return next;
    });
  };

  const total = pending.totalPending;
  const badgeText = total > 99 ? "99+" : String(total);

  const goNotif = (path) => {
    setNotifOpen(false);
    navigate(path);
  };

  const onVolumeChange = (e) => {
    const v = setNotificationVolumePercent(Number(e.target.value));
    setNotifVolume(v);
  };

  const notifFooter = (
    <div className="jw-adminNotifFooter">
      <div className="jw-adminNotifSoundRow">
        <span className="jw-adminNotifSoundLabel">Sound</span>
        <button
          type="button"
          className={`jw-adminNotifSoundSwitch ${soundOn ? "is-on" : ""}`}
          role="switch"
          aria-checked={soundOn}
          aria-label={soundOn ? "Notification sound on" : "Notification sound off"}
          onClick={toggleSound}
        >
          <span className="jw-adminNotifSoundThumb" aria-hidden />
        </button>
      </div>
      <div className="jw-adminNotifVolumeRow">
        <span className="jw-adminNotifSoundLabel" id="jw-admin-notif-volume-label">
          Volume
        </span>
        <div className="jw-adminNotifVolumeControls">
          <input
            id="jw-admin-notif-volume"
            type="range"
            className="jw-adminNotifVolumeSlider"
            min={0}
            max={100}
            step={1}
            value={notifVolume}
            onChange={onVolumeChange}
            aria-labelledby="jw-admin-notif-volume-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={notifVolume}
            aria-valuetext={`${notifVolume}%`}
          />
          <span className="jw-adminNotifVolumeValue" aria-hidden="true">
            {notifVolume}%
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <header className="jw-adminHeader">
      <div className="jw-adminHeaderLeft">
        <button
          type="button"
          className="jw-adminHeaderIconBtn jw-adminHeaderMenuBtn"
          onClick={isMenuOpen ? onCloseMenu : onMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>

        <Logo />
      </div>

      <div className="jw-adminHeaderRight">
        <div className="jw-adminNotifWrap" ref={notifRef}>
          <button
            type="button"
            className="jw-adminHeaderNotifBtn"
            onClick={() => {
              setNotifOpen((v) => !v);
              setOpen(false);
            }}
            aria-expanded={notifOpen}
            aria-label="Pending tickets"
          >
            <Bell size={18} strokeWidth={2} aria-hidden />
            {total > 0 ? (
              <span className="jw-adminHeaderBadge">{badgeText}</span>
            ) : null}
          </button>

          {notifOpen && (
            <div className="jw-adminDropdown jw-adminDropdown--notif">
              {pending.accountsPending > 0 ? (
                <button
                  type="button"
                  className="jw-adminNotifRow"
                  onClick={() => goNotif("/admin/accounts/tickets")}
                >
                  <span className="jw-adminNotifRowLabel">Accounts Pending</span>
                  <span className="jw-adminNotifRowCount">
                    {pending.accountsPending}
                  </span>
                </button>
              ) : null}
              {pending.transfersPending > 0 ? (
                <button
                  type="button"
                  className="jw-adminNotifRow"
                  onClick={() => goNotif("/admin/transactions/transfers")}
                >
                  <span className="jw-adminNotifRowLabel">Transfers Pending</span>
                  <span className="jw-adminNotifRowCount">
                    {pending.transfersPending}
                  </span>
                </button>
              ) : null}
              {pending.depositsPending > 0 ? (
                <button
                  type="button"
                  className="jw-adminNotifRow"
                  onClick={() => goNotif("/admin/transactions/deposit")}
                >
                  <span className="jw-adminNotifRowLabel">Deposit Pending</span>
                  <span className="jw-adminNotifRowCount">
                    {pending.depositsPending}
                  </span>
                </button>
              ) : null}
              {pending.withdrawsPending > 0 ? (
                <button
                  type="button"
                  className="jw-adminNotifRow"
                  onClick={() => goNotif("/admin/transactions/withdraw")}
                >
                  <span className="jw-adminNotifRowLabel">Withdraw Pending</span>
                  <span className="jw-adminNotifRowCount">
                    {pending.withdrawsPending}
                  </span>
                </button>
              ) : null}
              {total === 0 ? (
                <div className="jw-adminDropdownMuted">No pending tickets</div>
              ) : null}
              {notifFooter}
            </div>
          )}
        </div>

        <div className="jw-adminProfileWrap" ref={dropdownRef}>
          <button
            type="button"
            className="jw-adminHeaderProfileBtn"
            onClick={() => {
              setOpen((v) => !v);
              setNotifOpen(false);
            }}
            aria-expanded={open}
          >
            <span className="jw-adminHeaderAvatar">👤</span>
            <span className="jw-adminHeaderName">
              {String(userName || "admin").toLowerCase()}
            </span>
            <span className="jw-adminHeaderCaret">▾</span>
          </button>

          {open && (
            <div className="jw-adminDropdown">
              <button
                type="button"
                className="jw-adminDropdownItem"
                onClick={handleUpdatePassword}
              >
                Update Password
              </button>

              <button
                type="button"
                className="jw-adminDropdownItem jw-adminDropdownItemDanger"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
