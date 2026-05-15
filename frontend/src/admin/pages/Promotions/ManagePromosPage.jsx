import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, CopyPlus, Plus } from "lucide-react";
import AnnouncementRichEditor from "../../components/AnnouncementRichEditor.jsx";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../components/AdminDateRange/AdminDateRange";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import PromotionsRail from "../../../components/promotions/PromotionsRail";
import { fetchClientPromotions } from "../../../services/promotionsApi";
import { karachiSqlToDatetimeLocalValue } from "../../../utils/karachiTime";
import { markdownToHtml } from "../../../utils/simpleMarkdown";
import "../Users/usersPage.css";
import "../Notifications/announcementsTab.css";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "./managePromosPage.css";

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    search.set(k, String(v));
  });
  return search.toString();
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

const STATUS_OPTIONS = ["draft", "scheduled", "active", "ended"];

const DEFAULT_SCHEDULER_TIMEZONES = [
  { value: "Asia/Karachi", label: "PKT (Asia/Karachi)" },
  { value: "UTC", label: "UTC" },
];

function PromoFlagSwitch({ on, disabled, onToggle, ariaLabel }) {
  return (
    <button
      type="button"
      className={`jw-adminAutoRefresh__switch ${on ? "is-on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="jw-adminAutoRefresh__thumb" />
    </button>
  );
}

function PromoModal({ open, mode, item, saving, timezones, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Read More");
  const [ctaLink, setCtaLink] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [placement, setPlacement] = useState("home_rail");
  const [sortOrder, setSortOrder] = useState(0);
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errorText, setErrorText] = useState("");
  const [ctaMode, setCtaMode] = useState("link");
  const [detailsMarkdown, setDetailsMarkdown] = useState("");
  const [editorResetKey, setEditorResetKey] = useState(0);

  const detailsPreviewHtml = useMemo(() => markdownToHtml(detailsMarkdown), [detailsMarkdown]);

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title || "");
    setDescription(item?.description || "");
    setTag(item?.tag || "");
    setButtonLabel(item?.buttonLabel || "Read More");
    setCtaLink(item?.ctaLink || "");
    setOpenInNewTab(!!item?.openInNewTab);
    setPlacement(item?.placement || "home_rail");
    setSortOrder(Number(item?.sortOrder || 0));
    setTimezone("Asia/Karachi");
    setStartsAt(item?.startsAt ? karachiSqlToDatetimeLocalValue(item.startsAt) : "");
    setEndsAt(item?.endsAt ? karachiSqlToDatetimeLocalValue(item.endsAt) : "");
    setCtaMode(item?.ctaMode === "popup" ? "popup" : "link");
    setDetailsMarkdown(item?.detailsMarkdown || "");
    setEditorResetKey((k) => k + 1);
    setImageFile(null);
    setPreviewUrl(item?.imageUrl || "");
    setErrorText("");
  }, [open, item]);

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorText("Image must be 2MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width !== img.height) {
        setErrorText("Image must be 1:1 aspect ratio.");
        URL.revokeObjectURL(url);
        return;
      }
      setErrorText("");
      setImageFile(file);
      setPreviewUrl(url);
    };
    img.onerror = () => {
      setErrorText("Invalid image file.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      setErrorText("Title and description are required.");
      return;
    }
    if (ctaMode === "link" && !ctaLink.trim()) {
      setErrorText("CTA link is required.");
      return;
    }
    if (ctaMode === "popup" && !detailsMarkdown.trim()) {
      setErrorText("Add details for the popup, or switch to CTA link.");
      return;
    }
    const hasStart = !!startsAt;
    const hasEnd = !!endsAt;
    if (hasStart !== hasEnd) {
      setErrorText("Start and end must both be set, or both left empty.");
      return;
    }
    if (hasStart && hasEnd && startsAt > endsAt) {
      setErrorText("Start date cannot be after end date.");
      return;
    }
    if (mode === "create" && !imageFile) {
      setErrorText("Image is required.");
      return;
    }
    setErrorText("");
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    fd.set("tag", tag.trim());
    fd.set("buttonLabel", buttonLabel.trim() || "Read More");
    fd.set("ctaMode", ctaMode);
    fd.set("detailsMarkdown", detailsMarkdown);
    fd.set("ctaLink", ctaMode === "link" ? ctaLink.trim() : "#");
    fd.set("openInNewTab", openInNewTab ? "1" : "0");
    fd.set("placement", placement.trim() || "home_rail");
    fd.set("sortOrder", String(Number(sortOrder) || 0));
    fd.set("timezone", timezone);
    fd.set("startsAt", startsAt ? new Date(startsAt).toISOString() : "");
    fd.set("endsAt", endsAt ? new Date(endsAt).toISOString() : "");
    fd.set("locale", "en");
    if (imageFile) fd.set("image", imageFile);
    onSave?.(fd);
  };

  if (!open) return null;
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminUsersModal--ngForm jw-adminPromosModal" onClick={(e) => e.stopPropagation()}>
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">
            {mode === "create" ? "Create promotion" : "Edit promotion"}
          </div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminPromosFormGrid">
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Title</label>
              <input className="jw-adminUsersModal__input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Tag</label>
              <input className="jw-adminUsersModal__input" value={tag} onChange={(e) => setTag(e.target.value)} />
            </div>
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">CTA label</label>
              <input className="jw-adminUsersModal__input" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
            </div>
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Sort order</label>
              <input className="jw-adminUsersModal__input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            {mode === "edit" ? (
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Status</label>
                <div className="jw-adminPromosStatusReadonly">
                  <span className={`jw-adminPromosStatus is-${item?.status || "draft"}`}>
                    {item?.status || "draft"}
                  </span>
                  <span className="jw-adminPromosStatusReadonly__hint">Computed from schedule</span>
                </div>
              </div>
            ) : null}
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Placement</label>
              <input className="jw-adminUsersModal__input" value={placement} onChange={(e) => setPlacement(e.target.value)} />
            </div>
            <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full">
              <label className="jw-adminUsersModal__label">Description</label>
              <textarea className="jw-adminUsersModal__input jw-adminUsersModal__textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full">
              <label className="jw-adminUsersModal__label">Call to action</label>
              <div className="jw-adminPromosCtaModeRow" role="group" aria-label="CTA type">
                <button
                  type="button"
                  className={`jw-adminPromosCtaModeBtn ${ctaMode === "link" ? "is-active" : ""}`}
                  onClick={() => setCtaMode("link")}
                >
                  CTA link
                </button>
                <button
                  type="button"
                  className={`jw-adminPromosCtaModeBtn ${ctaMode === "popup" ? "is-active" : ""}`}
                  onClick={() => {
                    setCtaMode("popup");
                    setEditorResetKey((k) => k + 1);
                  }}
                >
                  Details Popup
                </button>
              </div>
            </div>
            {ctaMode === "link" ? (
              <>
                <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full">
                  <label className="jw-adminUsersModal__label">CTA link</label>
                  <input className="jw-adminUsersModal__input" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
                </div>
                <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full">
                  <label className="jw-adminUsersModal__label">
                    <input
                      type="checkbox"
                      checked={openInNewTab}
                      onChange={(e) => setOpenInNewTab(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    Open CTA in new tab
                  </label>
                </div>
              </>
            ) : (
              <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full jw-adminAnnMessageField">
                <label className="jw-adminUsersModal__label">Message</label>
                <div className="jw-adminUsersModal__hint">Same rich editor as Create announcement. Shown in the client popup below the image (CTA label is not repeated there).</div>
                <AnnouncementRichEditor
                  key={editorResetKey}
                  initialMarkdown={detailsMarkdown}
                  onMarkdownChange={setDetailsMarkdown}
                  disabled={saving}
                />
                <div className="jw-adminUsersModal__label jw-adminAnnLivePreviewLabel">Live preview</div>
                <div className="jw-adminAnnPreviewBody jw-adminMd" dangerouslySetInnerHTML={{ __html: detailsPreviewHtml }} />
              </div>
            )}
            <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full">
              <label className="jw-adminUsersModal__label">Scheduler</label>
              <div className="jw-adminAnnSchedulerGrid">
                <select className="jw-adminInput" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {(timezones?.length ? timezones : DEFAULT_SCHEDULER_TIMEZONES).map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <div className="jw-adminPromosSchedulerTimes">
                  <input
                    className="jw-adminInput"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    aria-label="Start"
                  />
                  <input
                    className="jw-adminInput"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    aria-label="End"
                  />
                </div>
              </div>
            </div>
            <div className="jw-adminUsersModal__field jw-adminPromosFormGrid__full">
              <label className="jw-adminUsersModal__label">Image (1:1, max 2MB)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={onPickImage} />
              {previewUrl ? <img src={previewUrl} alt="Preview" className="jw-adminPromosPreview" /> : null}
            </div>
          </div>
          {errorText ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 22px 20px" }}>
          <button type="button" className="jw-adminBtn is-light" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminBtn is-green" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagePromosPage() {
  const [filters, setFilters] = useState({ q: "", status: "", startDate: "", endDate: "" });
  const [applied, setApplied] = useState({});
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalItem, setModalItem] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [clickSummary, setClickSummary] = useState([]);
  const [clickSummaryLoading, setClickSummaryLoading] = useState(false);
  const [summaryPromo, setSummaryPromo] = useState("");
  const [schedulerTimezones, setSchedulerTimezones] = useState(DEFAULT_SCHEDULER_TIMEZONES);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/announcements/options", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.timezones) && data.timezones.length) {
          setSchedulerTimezones(data.timezones);
        }
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setModalMode("create");
    setModalItem(null);
    setModalOpen(true);
  };

  const loadPreview = useCallback(() => {
    setPreviewLoading(true);
    fetchClientPromotions({ placement: "home_rail" })
      .then((items) => setPreviewItems(Array.isArray(items) ? items : []))
      .catch(() => setPreviewItems([]))
      .finally(() => setPreviewLoading(false));
  }, []);

  const loadClickSummary = useCallback(() => {
    setClickSummaryLoading(true);
    const token = localStorage.getItem("token") || "";
    const sp = new URLSearchParams();
    if (summaryPromo) sp.set("promotionId", summaryPromo);
    fetch(`/api/admin/promotions/click-summary?${sp.toString()}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => r.json())
      .then((data) => {
        setClickSummary(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setClickSummary([]))
      .finally(() => setClickSummaryLoading(false));
  }, [summaryPromo]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    loadClickSummary();
  }, [loadClickSummary]);

  const fetchRows = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const query = buildQuery({
      q: applied.q,
      status: applied.status,
      dateFrom: applied.startDate,
      dateTo: applied.endDate,
      page,
      pageSize,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/promotions?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => r.json())
      .then((data) => {
        if (ignore) return;
        if (!Array.isArray(data?.items)) {
          setRows([]);
          setTotal(0);
          setErrorText(data?.message || "Unable to load promotions.");
          return;
        }
        setRows(data.items);
        setTotal(Number(data.total || 0));
      })
      .catch(() => {
        if (!ignore) {
          setRows([]);
          setTotal(0);
          setErrorText("Unable to load promotions.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [applied, page, pageSize]);

  useEffect(() => {
    return fetchRows();
  }, [fetchRows]);

  const displayRows = useMemo(() => {
    if (loading && rows.length === 0) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [loading, rows]);

  const doSave = async (fd) => {
    setModalSaving(true);
    const token = localStorage.getItem("token") || "";
    try {
      const isCreate = modalMode === "create";
      const endpoint = isCreate ? "/api/admin/promotions" : `/api/admin/promotions/${modalItem?.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data?.message || "Failed to save.");
        return;
      }
      setErrorText("");
      setModalOpen(false);
      fetchRows();
      loadPreview();
      loadClickSummary();
    } catch {
      setErrorText("Failed to save.");
    } finally {
      setModalSaving(false);
    }
  };

  const runAction = async (url) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data?.message || "Action failed.");
        return;
      }
      setErrorText("");
      fetchRows();
      loadPreview();
      loadClickSummary();
    } catch {
      setErrorText("Action failed.");
    }
  };

  const patchFlags = async (id, patch) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/admin/promotions/${id}/flags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data?.message || "Failed to update flags.");
        return;
      }
      setErrorText("");
      fetchRows();
      loadPreview();
    } catch {
      setErrorText("Failed to update flags.");
    }
  };

  const filterBar = (
    <AdminFilterBar
      onSubmit={() => {
        setApplied({ ...filters });
        setPage(1);
      }}
      onClear={() => {
        setFilters({ q: "", status: "", startDate: "", endDate: "" });
        setApplied({});
        setPage(1);
      }}
    >
      <AdminFilterField label="Search">
        <AdminInput value={filters.q} onChange={(v) => setFilters((f) => ({ ...f, q: v }))} placeholder="Title / tag" />
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select className="jw-adminInput" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={filters.startDate}
          endDate={filters.endDate}
          placeholder="Please Select"
          onChange={({ startDate, endDate }) => setFilters((f) => ({ ...f, startDate, endDate }))}
        />
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={openCreate}>
          <span className="jw-adminCreateBtnInner">
            Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} />
          </span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <AdminPageShell
        title="Manage Promos"
        filters={filterBar}
        table={
          <>
            <div className="jw-adminPromosTopBlocks">
              <div className="jw-adminPromosPreviewBlock">
                <div className="jw-adminPromosPreviewBlock__head">
                  <h3 className="jw-adminPromosPreviewBlock__title">Live rail preview</h3>
                  <p className="jw-adminPromosPreviewBlock__sub">Same as the client home rail (active promos, within start/end, Asia/Karachi).</p>
                </div>
                {previewLoading ? (
                  <div className="jw-adminSkeleton" style={{ height: 120, borderRadius: 8 }} />
                ) : previewItems.length === 0 ? (
                  <p className="jw-adminPromosPreviewBlock__empty">
                    Nothing to show. Needs status <strong>active</strong>, start/end within schedule, and paused/archived off.
                  </p>
                ) : (
                  <div className="jw-adminPromosPreviewScale">
                    <PromotionsRail
                      title="Offers & Promotions"
                      items={previewItems}
                      onCardActivate={() => {}}
                      preview
                    />
                  </div>
                )}
              </div>
              <div className="jw-adminPromosClickSummary">
                <div className="jw-adminPromosClickSummary__head">
                  <h3 className="jw-adminPromosClickSummary__title">Click summary</h3>
                  <label className="jw-adminPromosClickSummary__filter">
                    <span>Promotion</span>
                    <select
                      className="jw-adminInput"
                      value={summaryPromo}
                      onChange={(e) => setSummaryPromo(e.target.value)}
                    >
                      <option value="">All</option>
                      {rows
                        .filter((r) => r && r.id !== "loading-row" && r.id !== "empty-row")
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {(r.title || "").slice(0, 80)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                {clickSummaryLoading ? (
                  <div className="jw-adminSkeleton" style={{ height: 48, borderRadius: 8 }} />
                ) : (
                  <div className="jw-adminTableWrap jw-adminPromosClickTableWrap">
                    <table className="jw-adminTable jw-adminPromosClickTable">
                      <thead>
                        <tr>
                          <th>Day (PKT)</th>
                          <th>Source</th>
                          <th>Clicks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clickSummary.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="jw-adminEmpty">No click data in range</td>
                          </tr>
                        ) : (
                          clickSummary.map((row) => (
                            <tr key={`${row.day}-${row.source}`}>
                              <td>{row.day}</td>
                              <td>{row.source}</td>
                              <td>{Number(row.clickCount || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {errorText && !loading ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
            <div className="jw-adminTableWrap">
              <table className="jw-adminTable">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Tag</th>
                    <th>Status</th>
                    <th>Paused</th>
                    <th>Archived</th>
                    <th>Sort</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Clicks (7d)</th>
                    <th>Total clicks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 1 && displayRows[0]?.id === "loading-row" ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={12}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td></tr>
                    ))
                  ) : displayRows.length === 1 && displayRows[0]?.id === "empty-row" ? (
                    <tr><td colSpan={12} className="jw-adminEmpty">No promotions found</td></tr>
                  ) : (
                    displayRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.imageUrl ? <img src={r.imageUrl} alt="" className="jw-adminPromosThumb" /> : "—"}</td>
                        <td>{r.title || "—"}</td>
                        <td>{r.tag || "—"}</td>
                        <td><span className={`jw-adminPromosStatus is-${r.status}`}>{r.status}</span></td>
                        <td className="jw-adminPromosFlagCell">
                          <PromoFlagSwitch
                            on={!!r.isPaused}
                            ariaLabel={`Paused: ${r.title || r.id}`}
                            onToggle={() => patchFlags(r.id, { isPaused: !r.isPaused })}
                          />
                        </td>
                        <td className="jw-adminPromosFlagCell">
                          <PromoFlagSwitch
                            on={!!r.isArchived}
                            ariaLabel={`Archived: ${r.title || r.id}`}
                            onToggle={() => patchFlags(r.id, { isArchived: !r.isArchived })}
                          />
                        </td>
                        <td>{Number(r.sortOrder || 0)}</td>
                        <td>{formatDateTime(r.startsAt)}</td>
                        <td>{formatDateTime(r.endsAt)}</td>
                        <td>{Number(r.clickCount7d || 0).toLocaleString()}</td>
                        <td>{Number(r.clickCount || 0).toLocaleString()}</td>
                        <td className="jw-adminTd__actions">
                          <button type="button" className="jw-adminEditBtn" title="Edit" onClick={() => {
                            setModalMode("edit");
                            setModalItem(r);
                            setModalOpen(true);
                          }}><Edit3 size={16} /></button>
                          <button type="button" className="jw-adminEditBtn" title="Duplicate" onClick={() => runAction(`/api/admin/promotions/${r.id}/duplicate`)}>
                            <CopyPlus size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        }
        pagination={
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
        }
      />
      <PromoModal
        open={modalOpen}
        mode={modalMode}
        item={modalItem}
        saving={modalSaving}
        timezones={schedulerTimezones}
        onClose={() => !modalSaving && setModalOpen(false)}
        onSave={doSave}
      />
    </>
  );
}
