const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pool } = require("../../config/database");
const {
  UPLOADS_HOME_BANNERS,
  UPLOADS_LOGIN_PAGE_BANNERS,
} = require("../../middleware/uploadHomeBannerImages");

const LOGIN_PAGE_BANNER_ROW_ID = 1;
const LOGIN_PAGE_BANNERS_URL_PREFIX = "/uploads/login-page-banners/";

function extFromMime(mime) {
  const m = (mime || "").toLowerCase();
  if (m === "image/jpeg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  return null;
}

function uniqueBannerFilename(prefix) {
  const slug = String(prefix).replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 20) || "slide";
  const hex = crypto.randomBytes(4).toString("hex");
  return `hb-${slug}-${Date.now()}-${hex}`;
}

function saveBannerImageBuffer(buffer, mimetype, filenameBase) {
  const ext = extFromMime(mimetype);
  if (!ext) return { error: "Invalid image type." };
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { error: "Empty image file." };
  const baseName = `${filenameBase}${ext}`;
  const fullPath = path.join(UPLOADS_HOME_BANNERS, baseName);
  try {
    fs.writeFileSync(fullPath, buffer);
  } catch (e) {
    console.error("saveBannerImageBuffer:", e.message);
    return { error: "Failed to save image." };
  }
  return { path: `/uploads/home-banners/${baseName}` };
}

function deleteHomeBannerFile(storedPath) {
  if (!storedPath || typeof storedPath !== "string" || !storedPath.startsWith("/uploads/home-banners/")) return;
  const baseName = path.basename(storedPath);
  if (!baseName || baseName.includes(path.sep) || baseName.startsWith("..")) return;
  const full = path.join(UPLOADS_HOME_BANNERS, baseName);
  const rel = path.relative(UPLOADS_HOME_BANNERS, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.error("deleteHomeBannerFile:", e.message, full);
  }
}

function deleteLoginPageBannerFile(storedPath) {
  if (!storedPath || typeof storedPath !== "string" || !storedPath.startsWith(LOGIN_PAGE_BANNERS_URL_PREFIX)) return;
  const baseName = path.basename(storedPath.split("?")[0]);
  if (!baseName || baseName.includes(path.sep) || baseName.startsWith("..")) return;
  const full = path.join(UPLOADS_LOGIN_PAGE_BANNERS, baseName);
  const rel = path.relative(UPLOADS_LOGIN_PAGE_BANNERS, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.error("deleteLoginPageBannerFile:", e.message, full);
  }
}

function uniqueLoginPageBannerBase(slot) {
  const s = String(slot).replace(/[^a-z]/gi, "") || "img";
  return `lb-${s}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/** Multer memory buffer can be Buffer or array-like; normalize for save. */
function multerFileBytes(file) {
  if (!file) return null;
  const b = file.buffer;
  if (Buffer.isBuffer(b) && b.length > 0) return b;
  if (b != null && typeof b.length === "number" && b.length > 0) {
    try {
      const buf = Buffer.from(b);
      return buf.length > 0 ? buf : null;
    } catch (_) {
      return null;
    }
  }
  return null;
}

function saveLoginPageBannerBuffer(buffer, mimetype) {
  const ext = extFromMime(mimetype);
  if (!ext) return { error: "Invalid image type." };
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { error: "Empty image file." };
  const baseName = `${uniqueLoginPageBannerBase("banner")}${ext}`;
  const fullPath = path.join(UPLOADS_LOGIN_PAGE_BANNERS, baseName);
  try {
    fs.mkdirSync(UPLOADS_LOGIN_PAGE_BANNERS, { recursive: true });
    fs.writeFileSync(fullPath, buffer);
  } catch (e) {
    console.error("saveLoginPageBannerBuffer:", e.message);
    return { error: "Failed to save image." };
  }
  return { path: `${LOGIN_PAGE_BANNERS_URL_PREFIX}${baseName}` };
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseYesNo(value) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  const s = String(value || "").trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1" ? 1 : 0;
}

function isUnknownColumnError(err) {
  return err && err.code === "ER_BAD_FIELD_ERROR";
}

function rowToAdminItem(r) {
  return {
    id: r.id,
    title: r.title || "",
    imageDesktopPath: r.image_desktop_path || "",
    imageMobilePath: r.image_mobile_path != null ? String(r.image_mobile_path) : "",
    linkUrl: r.link_url != null ? String(r.link_url) : "",
    openInNewTab: !!r.open_in_new_tab,
    sortOrder: r.sort_order != null ? r.sort_order : 0,
    isActive: !!r.is_active,
  };
}

/**
 * GET /api/home-banner-slides — public, active slides only
 */
exports.getPublicHomeBannerSlides = async (req, res) => {
  try {
    let rows = [];
    try {
      [rows] = await pool.query(
        `SELECT id, title, image_desktop_path, image_mobile_path, link_url, open_in_new_tab, sort_order
         FROM home_banner_slides
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ slides: [] });
      if (isUnknownColumnError(e)) {
        [rows] = await pool.query(
          `SELECT id, title, image_desktop_path, image_mobile_path, sort_order
           FROM home_banner_slides
           WHERE is_active = 1
           ORDER BY sort_order ASC, id ASC`
        );
      } else {
        throw e;
      }
    }
    const slides = rows.map((r) => {
      const desktop = r.image_desktop_path || "";
      const mobile = r.image_mobile_path || desktop;
      return {
        id: r.id,
        title: r.title || "",
        imageDesktop: desktop,
        imageMobile: mobile || desktop,
        linkUrl: r.link_url != null ? String(r.link_url) : "",
        openInNewTab: !!r.open_in_new_tab,
      };
    });
    return res.status(200).json({ slides });
  } catch (err) {
    console.error("getPublicHomeBannerSlides:", err);
    return res.status(500).json({ message: "Failed to load home banner." });
  }
};

/**
 * GET /api/admin/home-banner-slides
 */
exports.getAdminHomeBannerSlides = async (req, res) => {
  try {
    let rows = [];
    try {
      [rows] = await pool.query(
        `SELECT id, title, image_desktop_path, image_mobile_path, link_url, open_in_new_tab, sort_order, is_active
         FROM home_banner_slides
         ORDER BY sort_order ASC, id ASC`
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({ message: "Home banner table missing. Run database migration." });
      }
      if (isUnknownColumnError(e)) {
        [rows] = await pool.query(
          `SELECT id, title, image_desktop_path, image_mobile_path, sort_order, is_active
           FROM home_banner_slides
           ORDER BY sort_order ASC, id ASC`
        );
      } else {
        throw e;
      }
    }
    return res.status(200).json({ items: rows.map(rowToAdminItem) });
  } catch (err) {
    console.error("getAdminHomeBannerSlides:", err);
    return res.status(500).json({ message: "Failed to load banner slides." });
  }
};

/**
 * POST /api/admin/home-banner-slides
 */
exports.createAdminHomeBannerSlide = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const desktopFile = req.files?.imageDesktop?.[0];
    const mobileFile = req.files?.imageMobile?.[0];
    const sortOrderRaw = req.body?.sortOrder;
    const isActive = req.body?.isActive !== undefined ? parseYesNo(req.body.isActive) : 1;
    const linkUrlRaw = req.body?.linkUrl;
    const linkUrl = linkUrlRaw != null ? String(linkUrlRaw).trim() : "";
    const openInNewTab = req.body?.openInNewTab !== undefined ? parseYesNo(req.body.openInNewTab) : 0;

    if (!title) return res.status(400).json({ message: "Title is required." });
    if (!desktopFile?.buffer?.length) {
      return res.status(400).json({ message: "Desktop image is required." });
    }

    let sortOrder = sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw))
      ? Math.floor(Number(sortOrderRaw))
      : null;
    if (sortOrder === null) {
      const [[r]] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM home_banner_slides").catch(() => [{ n: 1 }]);
      sortOrder = Number(r?.n) || 1;
    }

    const baseDesktop = uniqueBannerFilename("desktop");
    const savedDesktop = saveBannerImageBuffer(desktopFile.buffer, desktopFile.mimetype, baseDesktop);
    if (savedDesktop.error) return res.status(400).json({ message: savedDesktop.error });

    let mobilePath = null;
    if (mobileFile?.buffer?.length) {
      const savedMobile = saveBannerImageBuffer(mobileFile.buffer, mobileFile.mimetype, uniqueBannerFilename("mobile"));
      if (savedMobile.error) {
        deleteHomeBannerFile(savedDesktop.path);
        return res.status(400).json({ message: savedMobile.error });
      }
      mobilePath = savedMobile.path;
    }

    let result;
    try {
      [result] = await pool.query(
        `INSERT INTO home_banner_slides (title, image_desktop_path, image_mobile_path, link_url, open_in_new_tab, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, savedDesktop.path, mobilePath, linkUrl || null, openInNewTab, sortOrder, isActive]
      );
    } catch (e) {
      if (isUnknownColumnError(e)) {
        if (linkUrl || openInNewTab) {
          deleteHomeBannerFile(savedDesktop.path);
          if (mobilePath) deleteHomeBannerFile(mobilePath);
          return res.status(503).json({ message: "Please run migration_home_banner_slides_link.sql to use URL and open behavior fields." });
        }
        [result] = await pool.query(
          `INSERT INTO home_banner_slides (title, image_desktop_path, image_mobile_path, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [title, savedDesktop.path, mobilePath, sortOrder, isActive]
        );
      } else {
        throw e;
      }
    }

    const insertId = result.insertId;
    if (!insertId) return res.status(500).json({ message: "Failed to create slide." });

    let row;
    try {
      [[row]] = await pool.query(
        `SELECT id, title, image_desktop_path, image_mobile_path, link_url, open_in_new_tab, sort_order, is_active
         FROM home_banner_slides WHERE id = ?`,
        [insertId]
      );
    } catch (e) {
      if (isUnknownColumnError(e)) {
        [[row]] = await pool.query(
          `SELECT id, title, image_desktop_path, image_mobile_path, sort_order, is_active
           FROM home_banner_slides WHERE id = ?`,
          [insertId]
        );
      } else {
        throw e;
      }
    }
    return res.status(201).json({ item: rowToAdminItem(row) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Home banner table missing. Run database migration." });
    }
    console.error("createAdminHomeBannerSlide:", err);
    return res.status(500).json({ message: "Failed to create slide." });
  }
};

/**
 * PATCH /api/admin/home-banner-slides/:id
 */
exports.updateAdminHomeBannerSlide = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const desktopFile = req.files?.imageDesktop?.[0];
    const mobileFile = req.files?.imageMobile?.[0];
    const isMultipart = !!(desktopFile || mobileFile);

    let title;
    let sortOrder;
    let isActive;
    let linkUrl;
    let openInNewTab;
    let clearMobileImage;
    if (isMultipart) {
      title = req.body?.title !== undefined ? String(req.body.title).trim() : undefined;
      const so = req.body?.sortOrder;
      sortOrder = so !== undefined && so !== null && so !== "" && Number.isFinite(Number(so)) ? Math.floor(Number(so)) : undefined;
      isActive = req.body?.isActive !== undefined ? parseYesNo(req.body.isActive) : undefined;
      linkUrl = req.body?.linkUrl !== undefined ? String(req.body.linkUrl).trim() : undefined;
      openInNewTab = req.body?.openInNewTab !== undefined ? parseYesNo(req.body.openInNewTab) : undefined;
      clearMobileImage = req.body?.clearMobileImage !== undefined ? parseYesNo(req.body.clearMobileImage) : undefined;
    } else {
      const body = req.body || {};
      title = body.title !== undefined ? String(body.title).trim() : undefined;
      const so = body.sortOrder;
      sortOrder = so !== undefined && so !== null && so !== "" && Number.isFinite(Number(so)) ? Math.floor(Number(so)) : undefined;
      isActive = body.isActive !== undefined ? parseYesNo(body.isActive) : undefined;
      linkUrl = body.linkUrl !== undefined ? String(body.linkUrl).trim() : undefined;
      openInNewTab = body.openInNewTab !== undefined ? parseYesNo(body.openInNewTab) : undefined;
      clearMobileImage = body.clearMobileImage !== undefined ? parseYesNo(body.clearMobileImage) : undefined;
    }

    let existing;
    try {
      [existing] = await pool.query(
        "SELECT id, title, image_desktop_path, image_mobile_path, link_url, open_in_new_tab, sort_order, is_active FROM home_banner_slides WHERE id = ?",
        [id]
      );
    } catch (e) {
      if (isUnknownColumnError(e)) {
        [existing] = await pool.query(
          "SELECT id, title, image_desktop_path, image_mobile_path, sort_order, is_active FROM home_banner_slides WHERE id = ?",
          [id]
        );
      } else {
        throw e;
      }
    }
    if (!existing?.length) return res.status(404).json({ message: "Slide not found." });
    const cur = existing[0];

    if (title !== undefined && !title) return res.status(400).json({ message: "Title cannot be empty." });

    let newDesktopPath = cur.image_desktop_path;
    let newMobilePath = cur.image_mobile_path;

    if (desktopFile?.buffer?.length) {
      const saved = saveBannerImageBuffer(desktopFile.buffer, desktopFile.mimetype, uniqueBannerFilename("desktop"));
      if (saved.error) return res.status(400).json({ message: saved.error });
      newDesktopPath = saved.path;
    }

    if (mobileFile?.buffer?.length) {
      const saved = saveBannerImageBuffer(mobileFile.buffer, mobileFile.mimetype, uniqueBannerFilename("mobile"));
      if (saved.error) {
        if (newDesktopPath !== cur.image_desktop_path) deleteHomeBannerFile(newDesktopPath);
        return res.status(400).json({ message: saved.error });
      }
      newMobilePath = saved.path;
    }
    if (clearMobileImage === 1) {
      newMobilePath = null;
    }

    const updates = [];
    const params = [];
    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push("is_active = ?");
      params.push(isActive);
    }
    const wantsLinkUpdate = linkUrl !== undefined || openInNewTab !== undefined;
    if (linkUrl !== undefined) {
      updates.push("link_url = ?");
      params.push(linkUrl || null);
    }
    if (openInNewTab !== undefined) {
      updates.push("open_in_new_tab = ?");
      params.push(openInNewTab);
    }
    if (newDesktopPath !== cur.image_desktop_path) {
      updates.push("image_desktop_path = ?");
      params.push(newDesktopPath);
    }
    if (newMobilePath !== cur.image_mobile_path) {
      updates.push("image_mobile_path = ?");
      params.push(newMobilePath);
    }

    if (!updates.length) {
      return res.status(200).json({ item: rowToAdminItem(cur) });
    }

    params.push(id);
    try {
      await pool.query(`UPDATE home_banner_slides SET ${updates.join(", ")} WHERE id = ?`, params);
    } catch (e) {
      if (isUnknownColumnError(e) && wantsLinkUpdate) {
        if ((linkUrl || "").trim() || openInNewTab) {
          if (newDesktopPath !== cur.image_desktop_path) deleteHomeBannerFile(newDesktopPath);
          if (newMobilePath !== cur.image_mobile_path && newMobilePath) deleteHomeBannerFile(newMobilePath);
          return res.status(503).json({ message: "Please run migration_home_banner_slides_link.sql to save URL and open behavior." });
        }
        const legacyUpdates = [];
        const legacyParams = [];
        if (title !== undefined) {
          legacyUpdates.push("title = ?");
          legacyParams.push(title);
        }
        if (sortOrder !== undefined) {
          legacyUpdates.push("sort_order = ?");
          legacyParams.push(sortOrder);
        }
        if (isActive !== undefined) {
          legacyUpdates.push("is_active = ?");
          legacyParams.push(isActive);
        }
        if (newDesktopPath !== cur.image_desktop_path) {
          legacyUpdates.push("image_desktop_path = ?");
          legacyParams.push(newDesktopPath);
        }
        if (newMobilePath !== cur.image_mobile_path) {
          legacyUpdates.push("image_mobile_path = ?");
          legacyParams.push(newMobilePath);
        }
        if (legacyUpdates.length) {
          legacyParams.push(id);
          await pool.query(`UPDATE home_banner_slides SET ${legacyUpdates.join(", ")} WHERE id = ?`, legacyParams);
        }
      } else {
        throw e;
      }
    }

    if (newDesktopPath !== cur.image_desktop_path) deleteHomeBannerFile(cur.image_desktop_path);
    if (newMobilePath !== cur.image_mobile_path && cur.image_mobile_path) deleteHomeBannerFile(cur.image_mobile_path);

    let row;
    try {
      [[row]] = await pool.query(
        `SELECT id, title, image_desktop_path, image_mobile_path, link_url, open_in_new_tab, sort_order, is_active FROM home_banner_slides WHERE id = ?`,
        [id]
      );
    } catch (e) {
      if (isUnknownColumnError(e)) {
        [[row]] = await pool.query(
          `SELECT id, title, image_desktop_path, image_mobile_path, sort_order, is_active FROM home_banner_slides WHERE id = ?`,
          [id]
        );
      } else {
        throw e;
      }
    }
    return res.status(200).json({ item: rowToAdminItem(row) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Home banner table missing. Run database migration." });
    }
    console.error("updateAdminHomeBannerSlide:", err);
    return res.status(500).json({ message: "Failed to update slide." });
  }
};

/**
 * PATCH /api/admin/login-banners
 * Stores images under /uploads/login-page-banners/ and updates login_page_banner row (id=1).
 * Each uploaded slot replaces the previous file for that slot only.
 */
exports.updateAdminLoginBanners = async (req, res) => {
  try {
    const desktopFile = req.files?.loginDesktop?.[0];
    const mobileFile = req.files?.loginMobile?.[0];
    if (!desktopFile && !mobileFile) {
      return res.status(400).json({
        message:
          "No image files received. Use a recent API build, restart node server.js after deploy, and ensure the request is multipart (do not set Content-Type manually on FormData).",
      });
    }

    const desktopBytes = desktopFile ? multerFileBytes(desktopFile) : null;
    const mobileBytes = mobileFile ? multerFileBytes(mobileFile) : null;
    if (desktopFile && !desktopBytes) {
      return res.status(400).json({
        message:
          "Desktop image upload was empty or unreadable. Restart the API server so login banner routes use the latest code, then try again.",
      });
    }
    if (mobileFile && !mobileBytes) {
      return res.status(400).json({
        message:
          "Mobile image upload was empty or unreadable. Restart the API server so login banner routes use the latest code, then try again.",
      });
    }

    let rows;
    try {
      [rows] = await pool.query(
        "SELECT image_desktop_path, image_mobile_path FROM login_page_banner WHERE id = ?",
        [LOGIN_PAGE_BANNER_ROW_ID]
      );
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({ message: "Login page banner table missing. Run migration_login_page_banner.sql." });
      }
      throw err;
    }

    if (!rows?.length) {
      await pool.query(
        "INSERT INTO login_page_banner (id, image_desktop_path, image_mobile_path) VALUES (?, NULL, NULL)",
        [LOGIN_PAGE_BANNER_ROW_ID]
      );
      [rows] = await pool.query(
        "SELECT image_desktop_path, image_mobile_path FROM login_page_banner WHERE id = ?",
        [LOGIN_PAGE_BANNER_ROW_ID]
      );
    }

    const cur = rows[0];
    let nextDesktop = cur.image_desktop_path || null;
    let nextMobile = cur.image_mobile_path || null;

    if (desktopBytes) {
      const saved = saveLoginPageBannerBuffer(desktopBytes, desktopFile.mimetype);
      if (saved.error) return res.status(400).json({ message: saved.error });
      if (nextDesktop) deleteLoginPageBannerFile(nextDesktop);
      nextDesktop = saved.path;
    }

    if (mobileBytes) {
      const saved = saveLoginPageBannerBuffer(mobileBytes, mobileFile.mimetype);
      if (saved.error) return res.status(400).json({ message: saved.error });
      if (nextMobile) deleteLoginPageBannerFile(nextMobile);
      nextMobile = saved.path;
    }

    await pool.query(
      "UPDATE login_page_banner SET image_desktop_path = ?, image_mobile_path = ? WHERE id = ?",
      [nextDesktop, nextMobile, LOGIN_PAGE_BANNER_ROW_ID]
    );

    const [[updated]] = await pool.query(
      "SELECT image_desktop_path, image_mobile_path, updated_at FROM login_page_banner WHERE id = ?",
      [LOGIN_PAGE_BANNER_ROW_ID]
    );
    const v = updated?.updated_at ? new Date(updated.updated_at).getTime() : Date.now();
    const d = updated?.image_desktop_path ? `${updated.image_desktop_path}?v=${v}` : "";
    const m = updated?.image_mobile_path ? `${updated.image_mobile_path}?v=${v}` : "";

    return res.status(200).json({
      ok: true,
      desktopPath: d,
      mobilePath: m,
      desktop: d,
      mobile: m,
    });
  } catch (err) {
    console.error("updateAdminLoginBanners:", err);
    return res.status(500).json({ message: "Failed to update login banners." });
  }
};

/**
 * GET /api/home-banner-slides/login-banners
 * Public: URLs from login_page_banner + cache-bust from updated_at.
 */
exports.getPublicLoginBanners = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await pool.query(
        "SELECT image_desktop_path, image_mobile_path, updated_at FROM login_page_banner WHERE id = ?",
        [LOGIN_PAGE_BANNER_ROW_ID]
      );
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ desktop: "", mobile: "" });
      }
      throw err;
    }

    const r = rows?.[0];
    if (!r) {
      return res.status(200).json({ desktop: "", mobile: "" });
    }

    const v = r.updated_at ? new Date(r.updated_at).getTime() : Date.now();
    const desktop = r.image_desktop_path ? `${r.image_desktop_path}?v=${v}` : "";
    const mobile = r.image_mobile_path ? `${r.image_mobile_path}?v=${v}` : "";

    return res.status(200).json({ desktop, mobile });
  } catch (err) {
    console.error("getPublicLoginBanners:", err);
    return res.status(500).json({ message: "Failed to load login banners." });
  }
};

/**
 * DELETE /api/admin/home-banner-slides/:id
 */
exports.deleteAdminHomeBannerSlide = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    let [existing] = await pool.query(
      "SELECT id, image_desktop_path, image_mobile_path FROM home_banner_slides WHERE id = ?",
      [id]
    );
    if (!existing?.length) return res.status(404).json({ message: "Slide not found." });
    const row = existing[0];

    await pool.query("DELETE FROM home_banner_slides WHERE id = ?", [id]);
    deleteHomeBannerFile(row.image_desktop_path);
    if (row.image_mobile_path) deleteHomeBannerFile(row.image_mobile_path);

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Home banner table missing. Run database migration." });
    }
    console.error("deleteAdminHomeBannerSlide:", err);
    return res.status(500).json({ message: "Failed to delete slide." });
  }
};
