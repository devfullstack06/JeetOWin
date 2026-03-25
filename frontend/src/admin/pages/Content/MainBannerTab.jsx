import React, { useCallback, useEffect, useState } from "react";
import { Plus, ZoomIn, ZoomOut } from "lucide-react";
import AdminFilterBar, { AdminFilterField, AdminButton } from "../../components/AdminFilterBar/AdminFilterBar";
import "../Users/usersPage.css";
import "../Wallets/walletsPage.css";
import "./contentPage.css";

const MAX_BYTES = 3 * 1024 * 1024;
const SIZE_ERR = "Each image must be 3MB or smaller.";

const DESKTOP_IMAGE_GUIDE = "Desktop: aspect 3:2 or 16:10 — recommended 1600×1000 px.";
const MOBILE_IMAGE_GUIDE = "Mobile: aspect 1:1 or 4:5 — recommended 1080×1080 px.";

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatAspectRatioLabel(w, h) {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  const a = Math.round(w / g);
  const b = Math.round(h / g);
  if (a > 64 || b > 64) {
    if (w >= h) {
      const r = w / h;
      const t = Math.round(r * 100) / 100;
      return `${String(t).replace(/\.?0+$/, "")}:1`;
    }
    const r = h / w;
    const t = Math.round(r * 100) / 100;
    return `1:${String(t).replace(/\.?0+$/, "")}`;
  }
  return `${a}:${b}`;
}

function readImageMeta(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith("image/")) {
      resolve({ error: "Not an image file." });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      resolve({
        width,
        height,
        aspectLabel: formatAspectRatioLabel(width, height),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ error: "Could not read image dimensions." });
    };
    img.src = url;
  });
}

function useImageFileMeta(file) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!file) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setInfo({ loading: true });
    readImageMeta(file).then((r) => {
      if (cancelled) return;
      if (r.error) setInfo({ error: r.error });
      else setInfo({ width: r.width, height: r.height, aspectLabel: r.aspectLabel });
    });
    return () => {
      cancelled = true;
    };
  }, [file]);
  return info;
}

function useImagePreviewUrl(file) {
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return previewUrl;
}

function BannerImageMetaLine({ info }) {
  if (!info) return null;
  if (info.loading) {
    return <div className="jw-adminBannerImageMeta">Reading image…</div>;
  }
  if (info.error) {
    return <div className="jw-adminBannerImageMeta jw-adminBannerImageMeta--warn">{info.error}</div>;
  }
  return (
    <div className="jw-adminBannerImageMeta">
      {info.width} × {info.height} px — aspect ratio {info.aspectLabel}
    </div>
  );
}

function ImageZoomModal({ open, src, title, onClose }) {
  const [zoomPct, setZoomPct] = useState(100);
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    if (open) {
      setZoomPct(100);
      setImgError(false);
    }
  }, [open, src]);
  if (!open || !src) return null;
  const zoomOut = () => setZoomPct((z) => Math.max(50, z - 25));
  const zoomIn = () => setZoomPct((z) => Math.min(200, z + 25));
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-depositSlipModal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title || "Image preview"}>
        <div className="jw-depositSlipModal__headerRow">
          <div className="jw-adminUsersModal__title">{title || "Image preview"}</div>
          <div className="jw-depositSlipModal__zoom">
            <button type="button" className="jw-depositSlipModal__zoomBtn" aria-label="Zoom out" onClick={zoomOut} disabled={zoomPct <= 50}>
              <ZoomOut size={16} />
            </button>
            <button type="button" className="jw-depositSlipModal__zoomBtn" aria-label="Zoom in" onClick={zoomIn} disabled={zoomPct >= 200}>
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
        <div className="jw-depositSlipModal__scroll">
          {imgError ? (
            <div className="jw-depositSlipModal__error">Image could not be loaded.</div>
          ) : (
            <img
              src={src}
              alt={title || ""}
              className="jw-depositSlipModal__img"
              style={{
                width: zoomPct === 100 ? "auto" : `${zoomPct}%`,
                maxWidth: zoomPct === 100 ? "100%" : "none",
                maxHeight: zoomPct === 100 ? "min(72vh, calc(100dvh - 12rem))" : "none",
              }}
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="jw-depositSlipModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path
        fill="#15a84b"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="#c62828" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function CreateBannerModal({
  open,
  form,
  saving,
  errorText,
  onChange,
  onDesktopFile,
  onMobileFile,
  onCancel,
  onConfirm,
  desktopErr,
  mobileErr,
  desktopImageInfo,
  mobileImageInfo,
  desktopPreviewUrl,
  mobilePreviewUrl,
}) {
  if (!open) return null;
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create banner slide">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create banner slide</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Title (shown in carousel)</label>
            <input className="jw-adminUsersModal__input" value={form.title} onChange={(e) => onChange("title", e.target.value)} placeholder="e.g. Upcoming Matches" />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Sort order</label>
            <input
              type="number"
              min={0}
              className="jw-adminUsersModal__input"
              value={form.sortOrder === "" ? "" : form.sortOrder}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange("sortOrder", "");
                else {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 0) onChange("sortOrder", n);
                }
              }}
              placeholder="Leave empty for auto"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Active</label>
            <select className="jw-adminUsersModal__input" value={form.isActive} onChange={(e) => onChange("isActive", e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">URL (optional)</label>
            <input
              className="jw-adminUsersModal__input"
              value={form.linkUrl || ""}
              onChange={(e) => onChange("linkUrl", e.target.value)}
              placeholder="https://example.com/promo"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Open behavior</label>
            <select className="jw-adminUsersModal__input" value={form.openInNewTab || "same"} onChange={(e) => onChange("openInNewTab", e.target.value)}>
              <option value="same">Stay on page (same tab)</option>
              <option value="new">Open in new tab</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Desktop image (JPEG, PNG, WebP)</label>
            <div className="jw-adminUsersModal__hint">{DESKTOP_IMAGE_GUIDE}</div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="jw-adminUsersModal__input" onChange={(e) => onDesktopFile(e.target.files?.[0] || null)} />
            {desktopPreviewUrl ? <img src={desktopPreviewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" /> : null}
            <BannerImageMetaLine info={desktopImageInfo} />
            {desktopErr ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Mobile image (optional)</label>
            <div className="jw-adminUsersModal__hint">{MOBILE_IMAGE_GUIDE}</div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="jw-adminUsersModal__input" onChange={(e) => onMobileFile(e.target.files?.[0] || null)} />
            {mobilePreviewUrl ? <img src={mobilePreviewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" /> : null}
            <BannerImageMetaLine info={mobileImageInfo} />
            {mobileErr ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving || desktopErr || mobileErr}>
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBannerModal({
  open,
  slide,
  form,
  saving,
  errorText,
  onChange,
  onDesktopFile,
  onMobileFile,
  onCancel,
  onConfirm,
  desktopErr,
  mobileErr,
  desktopImageInfo,
  mobileImageInfo,
  desktopPreviewUrl,
  mobilePreviewUrl,
}) {
  if (!open || !slide) return null;
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit banner slide">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit banner slide</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Title</label>
            <input className="jw-adminUsersModal__input" value={form.title} onChange={(e) => onChange("title", e.target.value)} />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Sort order</label>
            <input
              type="number"
              min={0}
              className="jw-adminUsersModal__input"
              value={form.sortOrder === "" ? "" : form.sortOrder}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange("sortOrder", "");
                else {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 0) onChange("sortOrder", n);
                }
              }}
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Active</label>
            <select className="jw-adminUsersModal__input" value={form.isActive} onChange={(e) => onChange("isActive", e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">URL (optional)</label>
            <input
              className="jw-adminUsersModal__input"
              value={form.linkUrl || ""}
              onChange={(e) => onChange("linkUrl", e.target.value)}
              placeholder="https://example.com/promo"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Open behavior</label>
            <select className="jw-adminUsersModal__input" value={form.openInNewTab || "same"} onChange={(e) => onChange("openInNewTab", e.target.value)}>
              <option value="same">Stay on page (same tab)</option>
              <option value="new">Open in new tab</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Replace desktop image</label>
            <div className="jw-adminUsersModal__hint">{DESKTOP_IMAGE_GUIDE}</div>
            {desktopPreviewUrl ? (
              <img src={desktopPreviewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" />
            ) : slide.imageDesktopPath ? (
              <img src={slide.imageDesktopPath} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" />
            ) : null}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="jw-adminUsersModal__input" onChange={(e) => onDesktopFile(e.target.files?.[0] || null)} />
            <BannerImageMetaLine info={desktopImageInfo} />
            {desktopErr ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Replace mobile image</label>
            <div className="jw-adminUsersModal__hint">{MOBILE_IMAGE_GUIDE}</div>
            {mobilePreviewUrl ? (
              <img src={mobilePreviewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" />
            ) : slide.imageMobilePath ? (
              <img src={slide.imageMobilePath} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" />
            ) : (
              <div className="jw-adminUsersModal__hint">No separate mobile image; desktop is used on small screens.</div>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="jw-adminUsersModal__input" onChange={(e) => onMobileFile(e.target.files?.[0] || null)} />
            <label className="jw-adminBannerCheckRow">
              <input
                type="checkbox"
                checked={!!form.clearMobileImage}
                onChange={(e) => onChange("clearMobileImage", e.target.checked)}
              />
              <span>Use desktop image for mobile (remove separate mobile image)</span>
            </label>
            <BannerImageMetaLine info={mobileImageInfo} />
            {mobileErr ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving || desktopErr || mobileErr}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginBannersModal({
  open,
  saving,
  errorText,
  desktopFile,
  mobileFile,
  desktopInfo,
  mobileInfo,
  desktopPreviewUrl,
  mobilePreviewUrl,
  onDesktopFile,
  onMobileFile,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  const desktopErr = !!(desktopFile && desktopFile.size > MAX_BYTES);
  const mobileErr = !!(mobileFile && mobileFile.size > MAX_BYTES);
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Login Page">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Login Page</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Desktop login banner (JPEG/JPG)</label>
            <input type="file" accept="image/jpeg,image/jpg" className="jw-adminUsersModal__input" onChange={(e) => onDesktopFile(e.target.files?.[0] || null)} />
            {desktopPreviewUrl ? <img src={desktopPreviewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" /> : null}
            <BannerImageMetaLine info={desktopInfo} />
            {desktopErr ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Mobile login banner (JPEG/JPG)</label>
            <input type="file" accept="image/jpeg,image/jpg" className="jw-adminUsersModal__input" onChange={(e) => onMobileFile(e.target.files?.[0] || null)} />
            {mobilePreviewUrl ? <img src={mobilePreviewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" /> : null}
            <BannerImageMetaLine info={mobileInfo} />
            {mobileErr ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
          </div>
          <div className="jw-adminUsersModal__hint">This updates `/banner-login-desktop.jpg` and `/banner-login-mobile.jpg` used by login page.</div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving || desktopErr || mobileErr || (!desktopFile && !mobileFile)}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MainBannerTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", sortOrder: "", isActive: "yes", linkUrl: "", openInNewTab: "same" });
  const [createDesktop, setCreateDesktop] = useState(null);
  const [createMobile, setCreateMobile] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", sortOrder: "", isActive: "yes", linkUrl: "", openInNewTab: "same", clearMobileImage: false });
  const [editDesktop, setEditDesktop] = useState(null);
  const [editMobile, setEditMobile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginDesktop, setLoginDesktop] = useState(null);
  const [loginMobile, setLoginMobile] = useState(null);
  const [imageZoom, setImageZoom] = useState({ open: false, src: "", title: "" });

  const createDesktopMeta = useImageFileMeta(createDesktop);
  const createMobileMeta = useImageFileMeta(createMobile);
  const editDesktopMeta = useImageFileMeta(editDesktop);
  const editMobileMeta = useImageFileMeta(editMobile);
  const createDesktopPreviewUrl = useImagePreviewUrl(createDesktop);
  const createMobilePreviewUrl = useImagePreviewUrl(createMobile);
  const editDesktopPreviewUrl = useImagePreviewUrl(editDesktop);
  const editMobilePreviewUrl = useImagePreviewUrl(editMobile);
  const loginDesktopInfo = useImageFileMeta(loginDesktop);
  const loginMobileInfo = useImageFileMeta(loginMobile);
  const loginDesktopPreviewUrl = useImagePreviewUrl(loginDesktop);
  const loginMobilePreviewUrl = useImagePreviewUrl(loginMobile);

  const fetchItems = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/home-banner-slides", {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (!Array.isArray(data.items)) {
          setItems([]);
          setErrorText(data?.message || "Unable to load.");
          return;
        }
        setItems(data.items);
      })
      .catch(() => {
        if (!ignore) setItems([]), setErrorText("Unable to load banner slides.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => fetchItems(), [fetchItems]);

  const openCreate = () => {
    setCreateForm({ title: "", sortOrder: "", isActive: "yes", linkUrl: "", openInNewTab: "same" });
    setCreateDesktop(null);
    setCreateMobile(null);
    setCreateError("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (!createSaving) setCreateOpen(false);
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      title: row.title || "",
      sortOrder: row.sortOrder !== undefined && row.sortOrder !== null ? row.sortOrder : "",
      isActive: row.isActive ? "yes" : "no",
      linkUrl: row.linkUrl || "",
      openInNewTab: row.openInNewTab ? "new" : "same",
      clearMobileImage: false,
    });
    setEditDesktop(null);
    setEditMobile(null);
    setEditError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (!editSaving) setEditOpen(false), setEditing(null);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      setCreateError("Title is required.");
      return;
    }
    if (!createDesktop) {
      setCreateError("Desktop image is required.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    const token = localStorage.getItem("token") || "";
    const fd = new FormData();
    fd.append("title", createForm.title.trim());
    fd.append("isActive", createForm.isActive);
    fd.append("linkUrl", (createForm.linkUrl || "").trim());
    fd.append("openInNewTab", createForm.openInNewTab === "new" ? "yes" : "no");
    if (createForm.sortOrder !== "" && createForm.sortOrder !== undefined) fd.append("sortOrder", String(createForm.sortOrder));
    fd.append("imageDesktop", createDesktop);
    if (createMobile) fd.append("imageMobile", createMobile);
    try {
      const res = await fetch("/api/admin/home-banner-slides", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data?.message || "Failed to create.");
        setCreateSaving(false);
        return;
      }
      setCreateOpen(false);
      setCreateDesktop(null);
      setCreateMobile(null);
      setCreateSaving(false);
      fetchItems();
    } catch {
      setCreateError("Failed to create.");
      setCreateSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editing?.id) return;
    if (!editForm.title.trim()) {
      setEditError("Title cannot be empty.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const token = localStorage.getItem("token") || "";
    try {
      let res;
      if (editDesktop || editMobile) {
        const fd = new FormData();
        fd.append("title", editForm.title.trim());
        fd.append("isActive", editForm.isActive);
        fd.append("linkUrl", (editForm.linkUrl || "").trim());
        fd.append("openInNewTab", editForm.openInNewTab === "new" ? "yes" : "no");
        fd.append("clearMobileImage", editForm.clearMobileImage ? "yes" : "no");
        if (editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null) {
          fd.append("sortOrder", String(editForm.sortOrder));
        }
        if (editDesktop) fd.append("imageDesktop", editDesktop);
        if (editMobile) fd.append("imageMobile", editMobile);
        res = await fetch(`/api/admin/home-banner-slides/${editing.id}`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
      } else {
        res = await fetch(`/api/admin/home-banner-slides/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            title: editForm.title.trim(),
            isActive: editForm.isActive,
            linkUrl: (editForm.linkUrl || "").trim(),
            openInNewTab: editForm.openInNewTab === "new" ? "yes" : "no",
            clearMobileImage: editForm.clearMobileImage ? "yes" : "no",
            sortOrder:
              editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null
                ? Number(editForm.sortOrder)
                : undefined,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.message || "Failed to update.");
        setEditSaving(false);
        return;
      }
      if (data.item) setItems((prev) => prev.map((x) => (x.id === data.item.id ? data.item : x)));
      setEditOpen(false);
      setEditing(null);
      setEditDesktop(null);
      setEditMobile(null);
      setEditSaving(false);
    } catch {
      setEditError("Failed to update.");
      setEditSaving(false);
    }
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete banner slide “${row.title || "Untitled"}”?`)) return;
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/home-banner-slides/${row.id}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d?.message)));
        setItems((prev) => prev.filter((x) => x.id !== row.id));
      })
      .catch((e) => alert(e.message || "Delete failed."));
  };

  const openLoginBanners = () => {
    setLoginDesktop(null);
    setLoginMobile(null);
    setLoginError("");
    setLoginOpen(true);
  };

  const closeLoginBanners = () => {
    if (!loginSaving) setLoginOpen(false);
  };

  const handleLoginBannersSave = async () => {
    if (!loginDesktop && !loginMobile) {
      setLoginError("Please choose at least one image.");
      return;
    }
    setLoginSaving(true);
    setLoginError("");
    const fd = new FormData();
    if (loginDesktop) fd.append("loginDesktop", loginDesktop);
    if (loginMobile) fd.append("loginMobile", loginMobile);
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch("/api/admin/login-banners", {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data?.message || "Failed to update login banners.");
        setLoginSaving(false);
        return;
      }
      setLoginOpen(false);
      setLoginDesktop(null);
      setLoginMobile(null);
      setLoginSaving(false);
    } catch {
      setLoginError("Failed to update login banners.");
      setLoginSaving(false);
    }
  };

  const filters = (
    <AdminFilterBar
      actions={
        <>
          <AdminButton variant="light" onClick={openLoginBanners}>Login Page</AdminButton>
          <AdminButton variant="green" onClick={openCreate}>
            <span className="jw-adminCreateBtnInner">
              Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} />
            </span>
          </AdminButton>
        </>
      }
    >
      <AdminFilterField label="Home banner">
        <span className="jw-adminUsersModal__hint">
          Title appears in the client carousel pill. {DESKTOP_IMAGE_GUIDE} {MOBILE_IMAGE_GUIDE}
        </span>
      </AdminFilterField>
    </AdminFilterBar>
  );

  const createDesktopErr = !!(createDesktop && createDesktop.size > MAX_BYTES);
  const createMobileErr = !!(createMobile && createMobile.size > MAX_BYTES);
  const editDesktopErr = !!(editDesktop && editDesktop.size > MAX_BYTES);
  const editMobileErr = !!(editMobile && editMobile.size > MAX_BYTES);

  return (
    <>
      {filters}
      {errorText && !loading ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
      <div className="jw-adminTableWrap">
        <table className="jw-adminTable">
          <thead>
            <tr>
              <th>Sort</th>
              <th>Title</th>
              <th>Desktop</th>
              <th>Mobile</th>
              <th>URL</th>
              <th>Open</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td colSpan={8}>
                    <div className="jw-adminSkeleton" style={{ height: 20 }} />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="jw-adminEmpty">
                  No slides yet. Create one with desktop (and optional mobile) images.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.sortOrder}</td>
                  <td>{r.title}</td>
                  <td>
                    {r.imageDesktopPath ? (
                      <button type="button" className="jw-adminBannerThumbBtn" onClick={() => setImageZoom({ open: true, src: r.imageDesktopPath, title: `${r.title || "Slide"} - Desktop` })}>
                        <img src={r.imageDesktopPath} alt="" className="jw-adminBannerThumb" />
                      </button>
                    ) : "—"}
                  </td>
                  <td>
                    {r.imageMobilePath ? (
                      <button type="button" className="jw-adminBannerThumbBtn" onClick={() => setImageZoom({ open: true, src: r.imageMobilePath, title: `${r.title || "Slide"} - Mobile` })}>
                        <img src={r.imageMobilePath} alt="" className="jw-adminBannerThumb" />
                      </button>
                    ) : <span className="jw-adminBannerThumbHint">desktop</span>}
                  </td>
                  <td className="jw-adminTd__url">{r.linkUrl ? r.linkUrl : "—"}</td>
                  <td>{r.openInNewTab ? "New tab" : "Same tab"}</td>
                  <td>{r.isActive ? "Yes" : "No"}</td>
                  <td className="jw-adminTd__actions">
                    <button type="button" className="jw-adminEditBtn" title="Edit" onClick={() => openEdit(r)}>
                      <EditIcon />
                    </button>
                    <button type="button" className="jw-adminEditBtn" title="Delete" onClick={() => handleDelete(r)}>
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateBannerModal
        open={createOpen}
        form={createForm}
        saving={createSaving}
        errorText={createError}
        onChange={(k, v) => {
          setCreateForm((p) => ({ ...p, [k]: v }));
          setCreateError("");
        }}
        onDesktopFile={setCreateDesktop}
        onMobileFile={setCreateMobile}
        onCancel={closeCreate}
        onConfirm={handleCreate}
        desktopErr={createDesktopErr}
        mobileErr={createMobileErr}
        desktopImageInfo={createDesktopMeta}
        mobileImageInfo={createMobileMeta}
        desktopPreviewUrl={createDesktopPreviewUrl}
        mobilePreviewUrl={createMobilePreviewUrl}
      />
      <EditBannerModal
        open={editOpen}
        slide={editing}
        form={editForm}
        saving={editSaving}
        errorText={editError}
        onChange={(k, v) => {
          setEditForm((p) => ({ ...p, [k]: v }));
          setEditError("");
        }}
        onDesktopFile={setEditDesktop}
        onMobileFile={setEditMobile}
        onCancel={closeEdit}
        onConfirm={handleEdit}
        desktopErr={editDesktopErr}
        mobileErr={editMobileErr}
        desktopImageInfo={editDesktopMeta}
        mobileImageInfo={editMobileMeta}
        desktopPreviewUrl={editDesktopPreviewUrl}
        mobilePreviewUrl={editMobilePreviewUrl}
      />
      <LoginBannersModal
        open={loginOpen}
        saving={loginSaving}
        errorText={loginError}
        desktopFile={loginDesktop}
        mobileFile={loginMobile}
        desktopInfo={loginDesktopInfo}
        mobileInfo={loginMobileInfo}
        desktopPreviewUrl={loginDesktopPreviewUrl}
        mobilePreviewUrl={loginMobilePreviewUrl}
        onDesktopFile={setLoginDesktop}
        onMobileFile={setLoginMobile}
        onCancel={closeLoginBanners}
        onConfirm={handleLoginBannersSave}
      />
      <ImageZoomModal
        open={imageZoom.open}
        src={imageZoom.src}
        title={imageZoom.title}
        onClose={() => setImageZoom({ open: false, src: "", title: "" })}
      />
    </>
  );
}
