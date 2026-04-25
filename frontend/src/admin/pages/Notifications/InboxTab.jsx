import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, Trash2, Users, X, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import AdminFilterBar, {
  AdminButton,
  AdminFilterField,
  AdminInput,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import { markdownToHtml } from "../../../utils/simpleMarkdown";
import AnnouncementRichEditor from "../../components/AnnouncementRichEditor.jsx";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "../Wallets/walletsPage.css";
import "./announcementsTab.css";

function q(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    s.set(k, String(v));
  });
  return s.toString();
}

const ANNOUNCEMENT_IMAGE_MAX_PER_FILE_BYTES = Math.floor(2.5 * 1024 * 1024);
const ANNOUNCEMENT_IMAGE_MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const ANNOUNCEMENT_IMAGE_MAX_COUNT = 10;

function EmojiInsertButton({ onPick, disabled, className = "" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className={`jw-adminEmojiWrap ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className="jw-adminEmojiBtn"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Insert emoji"
        title="Insert emoji"
      >
        <Smile size={16} />
      </button>
      {open ? (
        <div className="jw-adminEmojiPickerPop">
          <EmojiPicker
            lazyLoadEmojis
            width={320}
            height={380}
            onEmojiClick={(emojiData) => {
              onPick?.(emojiData.emoji || "");
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function AnnouncementGroupPicker({ groups, selectedIds, onChangeSelected, excludeUserIds, includeUserIds, disabled }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const idsKey = useMemo(() => [...selectedIds].map(Number).sort((a, b) => a - b).join(","), [selectedIds]);
  const exKey = useMemo(() => [...excludeUserIds].map(Number).sort((a, b) => a - b).join(","), [excludeUserIds]);
  const incKey = useMemo(() => [...(includeUserIds || [])].map(Number).sort((a, b) => a - b).join(","), [includeUserIds]);

  useEffect(() => {
    const ids = [...new Set(selectedIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
    const includeIds = [...new Set((includeUserIds || []).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
    if (!ids.length && !includeIds.length) {
      setCount(0);
      setCountLoading(false);
      return;
    }
    setCountLoading(true);
    const t = window.setTimeout(() => {
      const token = localStorage.getItem("token") || "";
      fetch("/api/admin/inbox/member-count-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ groupIds: ids, excludeUserIds, includeUserIds: includeIds }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            setCount(null);
            return;
          }
          setCount(Number(data.count) || 0);
        })
        .catch(() => setCount(null))
        .finally(() => setCountLoading(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [idsKey, exKey, incKey]);

  const selectedSet = useMemo(() => new Set(selectedIds.map((x) => Number(x))), [selectedIds]);

  const toggle = (rawId) => {
    const n = Number(rawId);
    if (!Number.isInteger(n) || n <= 0) return;
    if (selectedSet.has(n)) {
      onChangeSelected(selectedIds.filter((x) => Number(x) !== n));
    } else {
      onChangeSelected([...selectedIds, n]);
    }
  };

  const summary =
    selectedIds.length === 0 ? "Choose groups…" : `${selectedIds.length} group${selectedIds.length === 1 ? "" : "s"} selected`;

  return (
    <div className="jw-adminUsersModal__field jw-adminAnnGroupsField" ref={wrapRef}>
      <label className="jw-adminUsersModal__label">Select Groups</label>
      {groups.length === 0 ? (
        <div className="jw-adminUsersModal__hint">
          No active notification groups. Add or activate a group under Notifications → Groups.
        </div>
      ) : (
        <>
          <div className="jw-adminAnnGroupDd">
            <button
              type="button"
              className="jw-adminAnnGroupDdBtn"
              onClick={() => setOpen((v) => !v)}
              disabled={disabled}
              aria-expanded={open}
              aria-haspopup="listbox"
            >
              {summary}
            </button>
            {open ? (
              <div className="jw-adminAnnGroupDdPanel" role="listbox" aria-label="Active notification groups">
                {groups.map((g) => (
                  <label key={g.id} className="jw-adminAnnGroupDdRow">
                    <input type="checkbox" checked={selectedSet.has(Number(g.id))} onChange={() => toggle(g.id)} />
                    <span>{g.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <div className="jw-adminUsersModal__hint jw-adminAnnGroupCountHint">
            {selectedIds.length === 0 && (includeUserIds || []).length === 0
              ? "Unique users (after exclusions): —"
              : countLoading
                ? "Unique users (after exclusions): …"
                : count != null
                  ? `Unique users (after exclusions): ${count}`
                  : "Unique users (after exclusions): —"}
          </div>
        </>
      )}
    </div>
  );
}

function UserSearchPicker({ selected, onChange }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const qq = search.trim();
    if (!qq) {
      setOptions([]);
      setOpen(false);
      return;
    }
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/users?${q({ username: qq, page: 1, pageSize: 20 })}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setOptions(Array.isArray(data.items) ? data.items : []);
        setOpen(true);
      })
      .catch(() => {
        setOptions([]);
        setOpen(false);
      });
  }, [search]);

  const ids = useMemo(() => new Set(selected.map((x) => x.userId)), [selected]);

  return (
    <div className="jw-adminUsersModal__field jw-adminAnnExcludeUsersField" ref={wrapRef}>
      <label className="jw-adminUsersModal__label">Exclude users</label>
      <div className="jw-adminNgModalPickerSearch">
        <AdminInput value={search} onChange={setSearch} placeholder="Search username..." />
        {open && options.length > 0 ? (
          <div className="jw-adminNgUserDropdown jw-adminNgUserDropdown--modalPicker">
            {options.map((u) => (
              <button
                key={u.id}
                type="button"
                className="jw-adminNgUserDropdown__row"
                disabled={ids.has(u.id)}
                onClick={() => {
                  if (ids.has(u.id)) return;
                  onChange([...selected, { userId: u.id, username: u.username || "" }]);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <span className="jw-adminNgUserDropdown__name">{u.username}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="jw-adminNgSelectedWrap">
        {selected.map((u) => (
          <span key={u.userId} className="jw-adminNgChip">
            {u.username}
            <button
              type="button"
              className="jw-adminNgChipRemove"
              onClick={() => onChange(selected.filter((x) => x.userId !== u.userId))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SelectUsersSearchPicker({ selected, onChange }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [dupHint, setDupHint] = useState("");
  const wrapRef = useRef(null);
  const dupTimerRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(
    () => () => {
      if (dupTimerRef.current) window.clearTimeout(dupTimerRef.current);
    },
    [],
  );

  const showDuplicateMessage = useCallback(() => {
    if (dupTimerRef.current) window.clearTimeout(dupTimerRef.current);
    setDupHint("User is already selected");
    dupTimerRef.current = window.setTimeout(() => setDupHint(""), 2800);
  }, []);

  useEffect(() => {
    const qq = search.trim();
    if (!qq) {
      setOptions([]);
      setOpen(false);
      return;
    }
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/users?${q({ username: qq, page: 1, pageSize: 20 })}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setOptions(Array.isArray(data.items) ? data.items : []);
        setOpen(true);
      })
      .catch(() => {
        setOptions([]);
        setOpen(false);
      });
  }, [search]);

  const ids = useMemo(() => new Set(selected.map((x) => x.userId)), [selected]);

  return (
    <div className="jw-adminUsersModal__field jw-adminAnnAddUsersField" ref={wrapRef}>
      <label className="jw-adminUsersModal__label">Add users</label>
      <div className="jw-adminNgModalPickerSearch">
        <AdminInput value={search} onChange={setSearch} placeholder="Search username..." />
        {open && options.length > 0 ? (
          <div className="jw-adminNgUserDropdown jw-adminNgUserDropdown--modalPicker">
            {options.map((u) => (
              <button
                key={u.id}
                type="button"
                className="jw-adminNgUserDropdown__row"
                onClick={() => {
                  if (ids.has(u.id)) {
                    showDuplicateMessage();
                    return;
                  }
                  onChange([...selected, { userId: u.id, username: u.username || "" }]);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <span className="jw-adminNgUserDropdown__name">{u.username}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {dupHint ? <div className="jw-adminUsersModal__error jw-adminAnnDupHint">{dupHint}</div> : null}
      <div className="jw-adminNgSelectedWrap">
        {selected.map((u) => (
          <span key={u.userId} className="jw-adminNgChip">
            {u.username}
            <button
              type="button"
              className="jw-adminNgChipRemove"
              onClick={() => onChange(selected.filter((x) => x.userId !== u.userId))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function CreateAnnouncementModal({ open, onClose, options, onSaved }) {
  const [title, setTitle] = useState("");
  const titleInputRef = useRef(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [includeUsers, setIncludeUsers] = useState([]);
  const [excludeUsers, setExcludeUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [scheduleAt, setScheduleAt] = useState("");
  const [images, setImages] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [editorResetKey, setEditorResetKey] = useState(0);
  const previewHtml = useMemo(() => markdownToHtml(message), [message]);

  const activeGroups = options.activeMemberGroups || [];
  const excludeUserIds = useMemo(() => excludeUsers.map((u) => u.userId), [excludeUsers]);
  const includeUserIds = useMemo(() => includeUsers.map((u) => u.userId), [includeUsers]);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setSelectedGroupIds([]);
    setIncludeUsers([]);
    setExcludeUsers([]);
    setMessage("");
    setTimezone("Asia/Karachi");
    setScheduleAt("");
    setImages([]);
    setErrorText("");
    setPreview("");
    setEditorResetKey((k) => k + 1);
  }, [open]);

  const uploadImages = async (files) => {
    if (!files.length) return;
    if (images.length + files.length > ANNOUNCEMENT_IMAGE_MAX_COUNT) {
      setErrorText(`You can upload up to ${ANNOUNCEMENT_IMAGE_MAX_COUNT} images.`);
      return;
    }
    for (const f of files) {
      if (f.size > ANNOUNCEMENT_IMAGE_MAX_PER_FILE_BYTES) {
        setErrorText("Each image must be 2.5MB or smaller.");
        return;
      }
    }
    const currentTotal = images.reduce((s, im) => s + (Number(im.sizeBytes) || 0), 0);
    const batchTotal = files.reduce((s, f) => s + f.size, 0);
    if (currentTotal + batchTotal > ANNOUNCEMENT_IMAGE_MAX_TOTAL_BYTES) {
      setErrorText("Total size of images cannot exceed 25MB.");
      return;
    }
    setErrorText("");
    const token = localStorage.getItem("token") || "";
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/admin/inbox/upload-images", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Image upload failed.");
    setImages((prev) => [
      ...prev,
      ...(data.items || []).map((x) => ({
        path: x.path,
        sizeBytes: Number(x.sizeBytes) || 0,
      })),
    ]);
  };

  const submit = async () => {
    setErrorText("");
    if (!title.trim()) return setErrorText("Title is required.");
    if (!message.trim()) return setErrorText("Message is required.");
    if (message.trim().split(/\s+/).filter(Boolean).length > 300) {
      return setErrorText("Message exceeds 300 words.");
    }
    const groupIds = [...new Set(selectedGroupIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
    const includeIds = [...new Set(includeUsers.map((u) => Number(u.userId)).filter((n) => Number.isInteger(n) && n > 0))];
    if (!groupIds.length && !includeIds.length) {
      return setErrorText("Select at least one group or add at least one user.");
    }
    setSaving(true);
    const token = localStorage.getItem("token") || "";
    try {
      const body = {
        title,
        messageMarkdown: message,
        audienceMode: "custom",
        audienceRows: [{ band: "member", groupIds }],
        includeUserIds: includeIds,
        excludeUserIds: excludeUsers.map((u) => u.userId),
        timezone,
        scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
        imagePaths: images.map((im) => im.path),
      };
      const res = await fetch("/api/admin/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data?.message || "Failed to create inbox message.");
        setSaving(false);
        return;
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErrorText(e?.message || "Failed to create inbox message.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const imageBytesUsed = images.reduce((s, im) => s + (Number(im.sizeBytes) || 0), 0);

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader">
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminUsersModal--ngForm">
        <div className="jw-adminUsersModal__header jw-adminAnnModalHeader">
          <div className="jw-adminUsersModal__title">Create inbox message</div>
          <button type="button" className="jw-adminAnnModalClose" onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field jw-adminAnnTitleField">
            <label className="jw-adminUsersModal__label">Title</label>
            <div className="jw-adminAnnTitleRow">
              <input
                ref={titleInputRef}
                className="jw-adminUsersModal__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <EmojiInsertButton
                disabled={saving}
                className="jw-adminEmojiWrap--title"
                onPick={(emoji) => {
                  const el = titleInputRef.current;
                  if (!el) {
                    setTitle((prev) => `${prev}${emoji}`);
                    return;
                  }
                  const start = el.selectionStart ?? title.length;
                  const end = el.selectionEnd ?? start;
                  const next = `${title.slice(0, start)}${emoji}${title.slice(end)}`;
                  setTitle(next);
                  window.requestAnimationFrame(() => {
                    el.focus();
                    const pos = start + emoji.length;
                    el.setSelectionRange(pos, pos);
                  });
                }}
              />
            </div>
          </div>

          <AnnouncementGroupPicker
            groups={activeGroups}
            selectedIds={selectedGroupIds}
            onChangeSelected={setSelectedGroupIds}
            excludeUserIds={excludeUserIds}
            includeUserIds={includeUserIds}
            disabled={saving}
          />

          <SelectUsersSearchPicker selected={includeUsers} onChange={setIncludeUsers} />

          <UserSearchPicker selected={excludeUsers} onChange={setExcludeUsers} />

          <div className="jw-adminUsersModal__field jw-adminAnnMessageField">
            <label className="jw-adminUsersModal__label">Message (max 300 words)</label>
            <AnnouncementRichEditor
              key={editorResetKey}
              initialMarkdown={message}
              onMarkdownChange={setMessage}
              disabled={saving}
            />
            <div className="jw-adminUsersModal__label jw-adminAnnLivePreviewLabel">Live preview</div>
            <div className="jw-adminAnnPreviewBody jw-adminMd" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            <div className="jw-adminUsersModal__hint">{message.trim().split(/\s+/).filter(Boolean).length}/300 words</div>
          </div>

          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">
              Images (up to {ANNOUNCEMENT_IMAGE_MAX_COUNT}, 2.5MB each, 25MB total)
            </label>
            <div className="jw-adminUsersModal__hint">
              {images.length}/{ANNOUNCEMENT_IMAGE_MAX_COUNT} images ·{" "}
              {(imageBytesUsed / (1024 * 1024)).toFixed(2)} / 25 MB used
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                try {
                  await uploadImages(files);
                } catch (err) {
                  setErrorText(err.message || "Image upload failed.");
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <div className="jw-adminAnnImageTiles">
              {images.map((im) => (
                <img key={im.path} src={im.path} alt="" />
              ))}
            </div>
          </div>

          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Preview</label>
            <div className="jw-adminAnnPreviewBtns">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setPreview("mobile")}>Mobile</button>
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setPreview("web")}>Web</button>
            </div>
          </div>

          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Scheduler</label>
            <div className="jw-adminAnnSchedulerGrid">
              <select className="jw-adminInput" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {(options.timezones || []).map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <input
                className="jw-adminInput"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            </div>
          </div>

          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button className="jw-adminUsersModal__btn is-light" type="button" onClick={onClose}>Cancel</button>
          <button className="jw-adminUsersModal__btn is-green" type="button" disabled={saving} onClick={submit}>
            {saving ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="jw-adminAnnPreviewBackdrop">
          <div className={`jw-adminAnnPreviewModal ${preview === "mobile" ? "is-mobile" : "is-web"}`}>
            <div className="jw-adminAnnPreviewModalHeader">
              <h4 className="jw-adminAnnPreviewModalTitle">
                {preview === "mobile" ? "Mobile preview" : "Web preview"}
              </h4>
              <button type="button" className="jw-adminAnnModalClose" onClick={() => setPreview("")} aria-label="Close preview">
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="jw-adminAnnPreviewBody jw-adminMd" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            <div className="jw-adminAnnImageTiles">
              {images.map((im) => (
                <img key={im.path} src={im.path} alt="" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailsModal({ open, title, users = [], bands = [], onClose }) {
  if (!open) return null;
  return (
    <div className="jw-adminUsersModalOverlay" onClick={onClose}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">{title}</div>
        </div>
        <div className="jw-adminUsersModal__body">
          {bands.length ? (
            <div className="jw-adminAnnBandsLine">
              {bands.map((b, idx) => (
                <span key={`${b.band}-${b.groupId}-${idx}`} className="jw-adminNgChip">
                  {b.band}: {b.groupName || b.groupId}
                </span>
              ))}
            </div>
          ) : null}
          <div className="jw-adminAnnUsersList">
            {users.map((u) => <div key={`${u.userId}-${u.username}`}>{u.username}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InboxTab() {
  const [filters, setFilters] = useState({ id: "", username: "", band: "", groupId: "", status: "" });
  const [applied, setApplied] = useState({ id: "", username: "", band: "", groupId: "", status: "" });
  const [options, setOptions] = useState({ childrenByBand: {}, timezones: [] });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ open: false, title: "", users: [], bands: [] });
  const [previewItem, setPreviewItem] = useState(null);
  const previewItemHtml = useMemo(
    () => markdownToHtml(previewItem?.bodyMarkdown || ""),
    [previewItem]
  );

  const loadOptions = useCallback(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/inbox/options", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setOptions(data || { childrenByBand: {}, timezones: [] }))
      .catch(() => setOptions({ childrenByBand: {}, timezones: [] }));
  }, []);

  const fetchList = useCallback(() => {
    setLoading(true);
    setErrorText("");
    const token = localStorage.getItem("token") || "";
    const qs = q({ ...applied, page, pageSize });
    fetch(`/api/admin/inbox?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data.items)) {
          setRows([]);
          setTotal(0);
          setErrorText(data?.message || "Failed to load inbox messages.");
          return;
        }
        setRows(data.items);
        setTotal(Number(data.total || 0));
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
        setErrorText("Failed to load inbox messages.");
      })
      .finally(() => setLoading(false));
  }, [applied, page, pageSize]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openAudience = async (id) => {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`/api/admin/inbox/${id}/audience`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    setDetailsModal({
      open: true,
      title: `Audience - ${id}`,
      bands: Array.isArray(data.bands) ? data.bands : [],
      users: Array.isArray(data.users) ? data.users : [],
    });
  };

  const openSeen = async (id) => {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`/api/admin/inbox/${id}/seen`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    setDetailsModal({
      open: true,
      title: `Seen by - ${id}`,
      bands: [],
      users: Array.isArray(data.users) ? data.users : [],
    });
  };

  const openPreview = async (id) => {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`/api/admin/inbox/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.item) return;
    setPreviewItem(data.item);
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete ${id}?`)) return;
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`/api/admin/inbox/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    fetchList();
  };

  const filterBar = (
    <AdminFilterBar
      onSubmit={() => {
        setApplied({ ...filters });
        setPage(1);
      }}
      onClear={() => {
        setFilters({ id: "", username: "", band: "", groupId: "", status: "" });
        setApplied({ id: "", username: "", band: "", groupId: "", status: "" });
        setPage(1);
      }}
    >
      <AdminFilterField label="ID">
        <AdminInput value={filters.id} onChange={(v) => setFilters((f) => ({ ...f, id: v }))} />
      </AdminFilterField>
      <AdminFilterField label="Username">
        <AdminInput value={filters.username} onChange={(v) => setFilters((f) => ({ ...f, username: v }))} />
      </AdminFilterField>
      <AdminFilterField label="Band">
        <select
          className={`jw-adminInput ${!filters.band ? "jw-adminInput--placeholder" : ""}`}
          value={filters.band}
          onChange={(e) => setFilters((f) => ({ ...f, band: e.target.value, groupId: "" }))}
        >
          <option value="">All</option>
          <option value="brand">Brand</option>
          <option value="wallet">Wallet</option>
          <option value="member">Member</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="Type">
        <select
          disabled={!filters.band}
          className={`jw-adminInput ${!filters.groupId ? "jw-adminInput--placeholder" : ""}`}
          value={filters.groupId}
          onChange={(e) => setFilters((f) => ({ ...f, groupId: e.target.value }))}
        >
          <option value="">{filters.band ? "All" : "Select band first"}</option>
          {(options.childrenByBand?.[filters.band] || []).map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className={`jw-adminInput ${!filters.status ? "jw-adminInput--placeholder" : ""}`}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="sent">Sent</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={() => setCreateOpen(true)}>
          <span className="jw-adminCreateBtnInner">
            Create <Plus size={16} style={{ marginLeft: 4 }} />
          </span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <div className="jw-adminNgIntegrated">
        <div className="jw-adminNgIntegrated__filters">{filterBar}</div>
        {errorText ? <div className="jw-adminUsersPage__notice is-error jw-adminNgIntegrated__notice">{errorText}</div> : null}
        <div className="jw-adminTableWrap">
          <table className="jw-adminTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Audience</th>
                <th>Seen by</th>
                <th>Status</th>
                <th>Sent at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="jw-adminEmpty">No inbox messages found</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>
                    <button type="button" className="jw-adminAnnLink" onClick={() => openAudience(r.id)}>
                      <Users size={14} /> {r.audienceCount}
                    </button>
                  </td>
                  <td>
                    <button type="button" className="jw-adminAnnLink" onClick={() => openSeen(r.id)}>
                      {r.seenByCount}
                    </button>
                  </td>
                  <td>{r.status}</td>
                  <td>{formatAdminDateTime(r.sentAt)}</td>
                  <td className="jw-adminTd__actions">
                    <button
                      type="button"
                      className="jw-adminEditBtn"
                      onClick={() => openPreview(r.id)}
                      title="View"
                    >
                      <Eye size={14} color="#15a84b" />
                    </button>
                    <button
                      type="button"
                      className="jw-adminEditBtn"
                      onClick={() => remove(r.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} color="#c62828" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="jw-adminNgIntegrated__pagination">
          <AdminPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      </div>

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        options={options}
        onSaved={fetchList}
      />
      <DetailsModal
        open={detailsModal.open}
        title={detailsModal.title}
        bands={detailsModal.bands}
        users={detailsModal.users}
        onClose={() => setDetailsModal({ open: false, title: "", users: [], bands: [] })}
      />
      {previewItem ? (
        <div className="jw-adminAnnPreviewBackdrop">
          <div className="jw-adminAnnPreviewModal is-web">
            <div className="jw-adminAnnPreviewModalHeader">
              <h4 className="jw-adminAnnPreviewModalTitle">{previewItem.title}</h4>
              <button type="button" className="jw-adminAnnModalClose" onClick={() => setPreviewItem(null)} aria-label="Close">
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="jw-adminAnnPreviewBody jw-adminMd" dangerouslySetInnerHTML={{ __html: previewItemHtml }} />
            <div className="jw-adminAnnImageTiles">
              {(previewItem.imagePaths || []).map((p) => (
                <img key={p} src={p} alt="" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
