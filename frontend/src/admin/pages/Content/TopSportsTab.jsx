import React, { useCallback, useEffect, useState } from "react";
import { Plus, ZoomIn, ZoomOut } from "lucide-react";
import AdminFilterBar, { AdminFilterField, AdminButton } from "../../components/AdminFilterBar/AdminFilterBar";
import "../Users/usersPage.css";
import "./contentPage.css";

const MAX_BYTES = 3 * 1024 * 1024;
const SIZE_ERR = "Image must be 3MB or smaller.";

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
  return `${Math.round(w / g)}:${Math.round(h / g)}`;
}

function readImageMeta(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith("image/")) return resolve({ error: "Not an image file." });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight, aspectLabel: formatAspectRatioLabel(img.naturalWidth, img.naturalHeight) });
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
      else setInfo(r);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);
  return info;
}

function BannerImageMetaLine({ info }) {
  if (!info) return null;
  if (info.loading) return <div className="jw-adminBannerImageMeta">Reading image…</div>;
  if (info.error) return <div className="jw-adminBannerImageMeta jw-adminBannerImageMeta--warn">{info.error}</div>;
  return <div className="jw-adminBannerImageMeta">{info.width} × {info.height} px — aspect ratio {info.aspectLabel}</div>;
}

function useImagePreviewUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
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
      <path fill="#15a84b" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
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

function TopSportsModal({ open, title, form, saving, errorText, file, onFile, previewUrl, imageInfo, onChange, onCancel, onConfirm, requireImage }) {
  if (!open) return null;
  const tooBig = !!(file && file.size > MAX_BYTES);
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">{title}</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Name</label>
            <input className="jw-adminUsersModal__input" value={form.name} onChange={(e) => onChange("name", e.target.value)} />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">URL (optional)</label>
            <input className="jw-adminUsersModal__input" value={form.linkUrl} onChange={(e) => onChange("linkUrl", e.target.value)} placeholder="https://..." />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Open behavior</label>
            <select className="jw-adminUsersModal__input" value={form.openInNewTab} onChange={(e) => onChange("openInNewTab", e.target.value)}>
              <option value="same">Stay on page (same tab)</option>
              <option value="new">Open in new tab</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Sort order</label>
            <input
              type="number"
              min={0}
              className="jw-adminUsersModal__input"
              value={form.sortOrder === "" ? "" : form.sortOrder}
              onChange={(e) => onChange("sortOrder", e.target.value === "" ? "" : Number(e.target.value))}
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
            <label className="jw-adminUsersModal__label">Image (JPEG/PNG/WebP)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="jw-adminUsersModal__input" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            {previewUrl ? <img src={previewUrl} alt="" className="jw-adminBannerThumb jw-adminBannerThumb--modal" /> : null}
            <BannerImageMetaLine info={imageInfo} />
            {tooBig ? <div className="jw-adminUsersModal__error">{SIZE_ERR}</div> : null}
            {!file && requireImage ? <div className="jw-adminUsersModal__hint">Image is required.</div> : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving || tooBig || (requireImage && !file)}>
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TopSportsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", linkUrl: "", openInNewTab: "same", sortOrder: "", isActive: "yes" });
  const [createFile, setCreateFile] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const createPreview = useImagePreviewUrl(createFile);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", linkUrl: "", openInNewTab: "same", sortOrder: "", isActive: "yes" });
  const [editFile, setEditFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const editPreview = useImagePreviewUrl(editFile);
  const createImageInfo = useImageFileMeta(createFile);
  const editImageInfo = useImageFileMeta(editFile);
  const [imageZoom, setImageZoom] = useState({ open: false, src: "", title: "" });

  const fetchItems = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/top-sports", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
      .catch(() => { if (!ignore) setItems([]), setErrorText("Unable to load top sports."); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  useEffect(() => fetchItems(), [fetchItems]);

  const openCreate = () => {
    setCreateForm({ name: "", linkUrl: "", openInNewTab: "same", sortOrder: "", isActive: "yes" });
    setCreateFile(null);
    setCreateError("");
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      name: row.name || "",
      linkUrl: row.linkUrl || "",
      openInNewTab: row.openInNewTab ? "new" : "same",
      sortOrder: row.sortOrder ?? "",
      isActive: row.isActive ? "yes" : "no",
    });
    setEditFile(null);
    setEditError("");
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { setCreateError("Name is required."); return; }
    if (!createFile) { setCreateError("Image is required."); return; }
    setCreateSaving(true);
    setCreateError("");
    const token = localStorage.getItem("token") || "";
    const fd = new FormData();
    fd.append("name", createForm.name.trim());
    fd.append("linkUrl", (createForm.linkUrl || "").trim());
    fd.append("openInNewTab", createForm.openInNewTab === "new" ? "yes" : "no");
    fd.append("isActive", createForm.isActive);
    if (createForm.sortOrder !== "" && createForm.sortOrder !== undefined) fd.append("sortOrder", String(createForm.sortOrder));
    fd.append("image", createFile);
    try {
      const res = await fetch("/api/admin/top-sports", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCreateError(data?.message || "Failed to create."); setCreateSaving(false); return; }
      setCreateOpen(false);
      setCreateSaving(false);
      setCreateFile(null);
      fetchItems();
    } catch {
      setCreateError("Failed to create.");
      setCreateSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editing?.id) return;
    if (!editForm.name.trim()) { setEditError("Name is required."); return; }
    setEditSaving(true);
    setEditError("");
    const token = localStorage.getItem("token") || "";
    try {
      let res;
      if (editFile) {
        const fd = new FormData();
        fd.append("name", editForm.name.trim());
        fd.append("linkUrl", (editForm.linkUrl || "").trim());
        fd.append("openInNewTab", editForm.openInNewTab === "new" ? "yes" : "no");
        fd.append("isActive", editForm.isActive);
        if (editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null) fd.append("sortOrder", String(editForm.sortOrder));
        fd.append("image", editFile);
        res = await fetch(`/api/admin/top-sports/${editing.id}`, { method: "PATCH", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      } else {
        res = await fetch(`/api/admin/top-sports/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            name: editForm.name.trim(),
            linkUrl: (editForm.linkUrl || "").trim(),
            openInNewTab: editForm.openInNewTab === "new" ? "yes" : "no",
            isActive: editForm.isActive,
            sortOrder: editForm.sortOrder !== "" && editForm.sortOrder !== undefined ? Number(editForm.sortOrder) : undefined,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditError(data?.message || "Failed to update."); setEditSaving(false); return; }
      if (data.item) setItems((prev) => prev.map((x) => (x.id === data.item.id ? data.item : x)));
      setEditOpen(false);
      setEditSaving(false);
      setEditing(null);
      setEditFile(null);
    } catch {
      setEditError("Failed to update.");
      setEditSaving(false);
    }
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete top sport "${row.name}"?`)) return;
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/top-sports/${row.id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d?.message)));
        setItems((prev) => prev.filter((x) => x.id !== row.id));
      })
      .catch((e) => alert(e.message || "Delete failed."));
  };

  return (
    <>
      <AdminFilterBar
        actions={
          <AdminButton variant="green" onClick={openCreate}>
            <span className="jw-adminCreateBtnInner">Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} /></span>
          </AdminButton>
        }
      >
        <AdminFilterField label="Top Sports">
          <span className="jw-adminUsersModal__hint">Manage cards shown in home page top sports carousel.</span>
        </AdminFilterField>
      </AdminFilterBar>

      {errorText && !loading ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
      <div className="jw-adminTableWrap">
        <table className="jw-adminTable">
          <thead>
            <tr>
              <th>Sort</th>
              <th>Name</th>
              <th>Image</th>
              <th>URL</th>
              <th>Open</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`sk-${i}`}><td colSpan={7}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td></tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="jw-adminEmpty">No Top Sports items yet.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.sortOrder}</td>
                  <td>{r.name}</td>
                  <td>{r.imagePath ? (
                    <button type="button" className="jw-adminBannerThumbBtn" onClick={() => setImageZoom({ open: true, src: r.imagePath, title: `${r.name} - Image` })}>
                      <img src={r.imagePath} alt="" className="jw-adminBannerThumb" />
                    </button>
                  ) : "—"}</td>
                  <td className="jw-adminTd__url">{r.linkUrl || "—"}</td>
                  <td>{r.openInNewTab ? "New tab" : "Same tab"}</td>
                  <td>{r.isActive ? "Yes" : "No"}</td>
                  <td className="jw-adminTd__actions">
                    <button type="button" className="jw-adminEditBtn" title="Edit" onClick={() => openEdit(r)}><EditIcon /></button>
                    <button type="button" className="jw-adminEditBtn" title="Delete" onClick={() => handleDelete(r)}><TrashIcon /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TopSportsModal
        open={createOpen}
        title="Create Top Sport"
        form={createForm}
        saving={createSaving}
        errorText={createError}
        file={createFile}
        onFile={setCreateFile}
        previewUrl={createPreview}
        imageInfo={createImageInfo}
        onChange={(k, v) => { setCreateForm((p) => ({ ...p, [k]: v })); setCreateError(""); }}
        onCancel={() => !createSaving && setCreateOpen(false)}
        onConfirm={handleCreate}
        requireImage
      />
      <TopSportsModal
        open={editOpen}
        title="Edit Top Sport"
        form={editForm}
        saving={editSaving}
        errorText={editError}
        file={editFile}
        onFile={setEditFile}
        previewUrl={editPreview || editing?.imagePath}
        imageInfo={editImageInfo}
        onChange={(k, v) => { setEditForm((p) => ({ ...p, [k]: v })); setEditError(""); }}
        onCancel={() => !editSaving && setEditOpen(false)}
        onConfirm={handleEdit}
        requireImage={false}
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
