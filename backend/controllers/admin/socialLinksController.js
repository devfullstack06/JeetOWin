const fs = require("fs");
const path = require("path");
const { pool } = require("../../config/database");
const { sanitizeSvg } = require("../../utils/svgSanitize");
const { optimizeSvg } = require("../../utils/svgOptimize");
const { generatePngFromSvg } = require("../../utils/svgToPng");
const { uniqueSocialIconFilename, UPLOADS_SOCIAL } = require("../../middleware/uploadSocialIcon");

function ensureUploadsSocialDir() {
  try {
    fs.mkdirSync(UPLOADS_SOCIAL, { recursive: true });
    return true;
  } catch (e) {
    console.error("ensureUploadsSocialDir:", e.message);
    return false;
  }
}

function processSocialIconBuffer(buffer, baseName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { error: "Empty icon file." };
  const raw = buffer.toString("utf8");
  const sanitized = sanitizeSvg(raw);
  if (!sanitized.ok) return { error: sanitized.error || "Invalid SVG." };
  const optimized = optimizeSvg(sanitized.data);
  if (!ensureUploadsSocialDir()) return { error: "Failed to create uploads directory." };
  const svgPath = path.join(UPLOADS_SOCIAL, baseName);
  try {
    fs.writeFileSync(svgPath, optimized, "utf8");
  } catch (e) {
    console.error("processSocialIconBuffer write SVG:", e.message);
    return { error: "Failed to save icon file." };
  }
  generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
  return { iconPath: `/uploads/social/${baseName}` };
}

function deleteOldSocialIconFile(oldPath) {
  if (!oldPath || typeof oldPath !== "string" || !oldPath.startsWith("/uploads/social/")) return;
  const baseName = path.basename(oldPath);
  if (!baseName || baseName.includes(path.sep) || baseName.startsWith("..")) return;
  const svgFull = path.join(UPLOADS_SOCIAL, baseName);
  const pngFull = path.join(UPLOADS_SOCIAL, baseName.replace(/\.svg$/i, ".png"));
  const relSvg = path.relative(UPLOADS_SOCIAL, svgFull);
  const relPng = path.relative(UPLOADS_SOCIAL, pngFull);
  if (relSvg.startsWith("..") || path.isAbsolute(relSvg) || relPng.startsWith("..") || path.isAbsolute(relPng)) return;
  try {
    if (fs.existsSync(svgFull)) fs.unlinkSync(svgFull);
  } catch (e) {
    console.error("deleteOldSocialIconFile svg:", e.message, "path:", svgFull);
  }
  try {
    if (fs.existsSync(pngFull)) fs.unlinkSync(pngFull);
  } catch (e) {
    console.error("deleteOldSocialIconFile png:", e.message, "path:", pngFull);
  }
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

const SORT_MAP = { name: "name", footer: "available_footer", contactUs: "available_contact_us", sortOrder: "sort_order" };

/**
 * GET /api/social-links?for=footer|contact
 * Public: no auth. Returns items for footer or contact-us list. Empty if table missing or no rows.
 */
exports.getPublicSocialLinks = async (req, res) => {
  try {
    const forParam = String(req.query.for || "").trim().toLowerCase();
    let where = "";
    if (forParam === "footer") where = "WHERE available_footer = 1";
    else if (forParam === "contact") where = "WHERE available_contact_us = 1";

    let rows = [];
    try {
      [rows] = await pool.query(
        `SELECT id, name, url, sort_order, icon_path FROM social_links ${where} ORDER BY sort_order ASC, id ASC`,
        []
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ items: [] });
      throw e;
    }
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name || "",
      url: r.url || "",
      iconPath: r.icon_path != null ? String(r.icon_path) : "",
      sortOrder: r.sort_order != null ? r.sort_order : 0,
    }));
    return res.status(200).json({ items });
  } catch (err) {
    console.error("getPublicSocialLinks error:", err);
    return res.status(500).json({ message: "Failed to load social links." });
  }
};

/**
 * GET /api/admin/social-links
 * List with filters: name, availability (footer | contact_us). Sort, pagination.
 */
exports.getAdminSocialLinks = async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const availability = String(req.query.availability || "").trim().toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = SORT_MAP[req.query.sortKey] ? req.query.sortKey : "sort_order";
    const sortColumn = SORT_MAP[sortKey];
    const sortDir = String(req.query.sortDir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

    const where = [];
    const params = [];
    if (name) {
      where.push("name LIKE ?");
      params.push(`%${name}%`);
    }
    if (availability === "footer") where.push("available_footer = 1");
    else if (availability === "contact") where.push("available_contact_us = 1");

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    let rows = [];
    try {
      const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM social_links ${whereSql}`, params);
      total = Number(c?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    try {
      [rows] = await pool.query(
        `SELECT id, name, url, available_footer, available_contact_us, sort_order, icon_path, created_at
         FROM social_links ${whereSql}
         ORDER BY ${sortColumn} ${sortDir}, id ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
      }
      throw e;
    }

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name || "",
      url: r.url || "",
      forFooter: !!r.available_footer,
      forContactUs: !!r.available_contact_us,
      forFooterYesNo: r.available_footer ? "Yes" : "No",
      forContactUsYesNo: r.available_contact_us ? "Yes" : "No",
      sortOrder: r.sort_order != null ? r.sort_order : 0,
      iconPath: r.icon_path != null ? String(r.icon_path) : "",
      createdAt: r.created_at,
    }));

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      sortKey,
      sortDir: sortDir.toLowerCase(),
    });
  } catch (err) {
    console.error("getAdminSocialLinks error:", err);
    return res.status(500).json({ message: "Failed to load social links." });
  }
};

function buildItem(row) {
  return {
    id: row.id,
    name: row.name || "",
    url: row.url || "",
    forFooter: !!row.available_footer,
    forContactUs: !!row.available_contact_us,
    forFooterYesNo: row.available_footer ? "Yes" : "No",
    forContactUsYesNo: row.available_contact_us ? "Yes" : "No",
    sortOrder: row.sort_order != null ? row.sort_order : 0,
    iconPath: row.icon_path != null ? String(row.icon_path) : "",
    createdAt: row.created_at,
  };
}

/**
 * POST /api/admin/social-links
 */
exports.createAdminSocialLink = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const url = String(req.body?.url || "").trim();
    const availableFooter = parseYesNo(req.body?.availableFooter ?? 1);
    const availableContactUs = parseYesNo(req.body?.availableContactUs ?? 1);
    const sortOrderRaw = req.body?.sortOrder;
    const sortOrder = sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw))
      ? Math.floor(Number(sortOrderRaw))
      : 0;
    const iconSvg = req.body?.iconSvg != null ? String(req.body.iconSvg) : null;
    const iconFile = req.file;

    if (!name) return res.status(400).json({ message: "Name is required." });

    let iconPathFromFile = null;
    if (iconFile && iconFile.buffer && iconFile.buffer.length > 0) {
      const baseName = uniqueSocialIconFilename(name);
      const result = processSocialIconBuffer(iconFile.buffer, baseName);
      if (result.error) return res.status(400).json({ message: result.error });
      iconPathFromFile = result.iconPath;
    }

    let nextOrder = sortOrder;
    if (sortOrderRaw === undefined || sortOrderRaw === null || sortOrderRaw === "") {
      const [[r]] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM social_links").catch(() => [{ n: 1 }]);
      nextOrder = Number(r?.n) || 1;
    }

    const [result] = await pool.query(
      `INSERT INTO social_links (name, url, available_footer, available_contact_us, sort_order, icon_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, url, availableFooter, availableContactUs, nextOrder, iconPathFromFile]
    ).catch((e) => {
      if (e.code === "ER_NO_SUCH_TABLE") throw e;
      return [{}];
    });

    const insertId = result.insertId;
    if (!insertId) return res.status(500).json({ message: "Failed to create social link." });

    if (!iconPathFromFile && iconSvg && iconSvg.trim()) {
      const sanitized = sanitizeSvg(iconSvg);
      if (sanitized.ok && ensureUploadsSocialDir()) {
        const optimized = optimizeSvg(sanitized.data);
        const baseName = `link-${insertId}.svg`;
        const svgPath = path.join(UPLOADS_SOCIAL, baseName);
        try {
          fs.writeFileSync(svgPath, optimized, "utf8");
          generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
          await pool.query("UPDATE social_links SET icon_path = ? WHERE id = ?", [`/uploads/social/${baseName}`, insertId]).catch(() => {});
        } catch (_) {}
      }
    }

    const [rows] = await pool.query(
      "SELECT id, name, url, available_footer, available_contact_us, sort_order, icon_path, created_at FROM social_links WHERE id = ?",
      [insertId]
    );
    const row = rows[0];
    if (!row) return res.status(500).json({ message: "Failed to create social link." });

    return res.status(201).json({ message: "Social link created.", item: buildItem(row) });
  } catch (err) {
    console.error("createAdminSocialLink error:", err);
    return res.status(500).json({ message: "Failed to create social link." });
  }
};

/**
 * PATCH /api/admin/social-links/:id
 */
exports.updateAdminSocialLink = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const url = body.url !== undefined ? String(body.url).trim() : undefined;
    const availableFooter = body.availableFooter !== undefined ? parseYesNo(body.availableFooter) : undefined;
    const availableContactUs = body.availableContactUs !== undefined ? parseYesNo(body.availableContactUs) : undefined;
    const sortOrderRaw = body.sortOrder;
    const sortOrder = sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw)) ? Math.floor(Number(sortOrderRaw)) : undefined;
    const iconSvg = body.iconSvg !== undefined ? String(body.iconSvg) : undefined;
    const iconFile = req.file;

    if (!id) return res.status(400).json({ message: "Invalid id." });

    let [existing] = await pool.query("SELECT id, name, url, available_footer, available_contact_us, sort_order, icon_path FROM social_links WHERE id = ?", [id]);
    if (!existing?.length) return res.status(404).json({ message: "Social link not found." });
    const oldIconPath = existing[0].icon_path || null;

    let iconPathFromFile = null;
    if (iconFile && iconFile.buffer && iconFile.buffer.length > 0) {
      const baseName = uniqueSocialIconFilename(`id-${id}`);
      const result = processSocialIconBuffer(iconFile.buffer, baseName);
      if (result.error) return res.status(400).json({ message: result.error });
      iconPathFromFile = result.iconPath;
    }

    const updates = [];
    const params = [];
    if (name !== undefined) {
      if (!name) return res.status(400).json({ message: "Name cannot be empty." });
      updates.push("name = ?");
      params.push(name);
    }
    if (url !== undefined) {
      updates.push("url = ?");
      params.push(url);
    }
    if (availableFooter !== undefined) {
      updates.push("available_footer = ?");
      params.push(availableFooter);
    }
    if (availableContactUs !== undefined) {
      updates.push("available_contact_us = ?");
      params.push(availableContactUs);
    }
    if (sortOrder !== undefined && sortOrder >= 0) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }
    if (iconPathFromFile !== null) {
      updates.push("icon_path = ?");
      params.push(iconPathFromFile);
    }

    if (updates.length === 0) {
      const row = existing[0];
      return res.status(200).json({ message: "No changes.", item: buildItem(row) });
    }

    if (!iconPathFromFile && iconSvg !== undefined && iconSvg && String(iconSvg).trim()) {
      const sanitized = sanitizeSvg(iconSvg);
      if (sanitized.ok && ensureUploadsSocialDir()) {
        const optimized = optimizeSvg(sanitized.data);
        const baseName = `link-${id}.svg`;
        const svgPath = path.join(UPLOADS_SOCIAL, baseName);
        try {
          fs.writeFileSync(svgPath, optimized, "utf8");
          generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
          updates.push("icon_path = ?");
          params.push(`/uploads/social/${baseName}`);
        } catch (_) {}
      }
    }

    params.push(id);
    await pool.query(`UPDATE social_links SET ${updates.join(", ")} WHERE id = ?`, params);

    if (iconPathFromFile && oldIconPath) deleteOldSocialIconFile(oldIconPath);

    [existing] = await pool.query(
      "SELECT id, name, url, available_footer, available_contact_us, sort_order, icon_path, created_at FROM social_links WHERE id = ?",
      [id]
    );
    const row = existing[0];

    return res.status(200).json({ message: "Social link updated.", item: buildItem(row) });
  } catch (err) {
    console.error("updateAdminSocialLink error:", err);
    return res.status(500).json({ message: "Failed to update social link." });
  }
};
