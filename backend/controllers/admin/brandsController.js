const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { pool } = require("../../config/database");
const { sanitizeSvg } = require("../../utils/svgSanitize");
const { optimizeSvg } = require("../../utils/svgOptimize");
const { generatePngFromSvg } = require("../../utils/svgToPng");
const { uniqueBrandIconFilePrefix, UPLOADS_BRANDS } = require("../../middleware/uploadBrandIcon");

function ensureUploadsBrandsDir() {
  try {
    fs.mkdirSync(UPLOADS_BRANDS, { recursive: true });
    return true;
  } catch (e) {
    console.error("ensureUploadsBrandsDir:", e.message);
    return false;
  }
}

function isLikelySvgBuffer(buffer, mimetype) {
  const m = (mimetype || "").toLowerCase();
  if (m === "image/svg+xml" || m === "text/xml" || m === "application/xml") return true;
  const slice = buffer.slice(0, Math.min(buffer.length, 512));
  const head = slice.toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg")) return true;
  if (head.startsWith("<?xml") && head.includes("<svg")) return true;
  return false;
}

async function processBrandIconUpload(buffer, mimetype, prefix) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { error: "Empty icon file." };
  if (!ensureUploadsBrandsDir()) return { error: "Failed to create uploads directory." };

  if (isLikelySvgBuffer(buffer, mimetype)) {
    const raw = buffer.toString("utf8");
    const sanitized = sanitizeSvg(raw);
    if (!sanitized.ok) return { error: sanitized.error || "Invalid SVG." };
    const optimized = optimizeSvg(sanitized.data);
    const baseName = `${prefix}.svg`;
    const svgPath = path.join(UPLOADS_BRANDS, baseName);
    try {
      fs.writeFileSync(svgPath, optimized, "utf8");
    } catch (e) {
      console.error("processBrandIconUpload svg write:", e.message);
      return { error: "Failed to save icon file." };
    }
    generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
    return { iconPath: `/uploads/brands/${baseName}` };
  }

  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return { error: "Invalid image file." };
    const extMap = { jpeg: ".jpg", png: ".png", webp: ".webp", gif: ".gif" };
    const ext = extMap[meta.format] || ".png";
    const baseName = `${prefix}${ext}`;
    const fullPath = path.join(UPLOADS_BRANDS, baseName);
    await sharp(buffer).toFile(fullPath);
    return { iconPath: `/uploads/brands/${baseName}` };
  } catch (e) {
    console.error("processBrandIconUpload raster:", e.message);
    return { error: "Invalid or unsupported image file." };
  }
}

function deleteOldBrandIconFile(oldPath) {
  if (!oldPath || typeof oldPath !== "string" || !oldPath.startsWith("/uploads/brands/")) return;
  const baseName = path.basename(oldPath);
  if (!baseName || baseName.includes(path.sep) || baseName.startsWith("..")) return;
  const full = path.join(UPLOADS_BRANDS, baseName);
  const pngFull = path.join(UPLOADS_BRANDS, baseName.replace(/\.svg$/i, ".png"));
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) { console.error("deleteOldBrandIconFile svg:", e.message); }
  try {
    if (fs.existsSync(pngFull)) fs.unlinkSync(pngFull);
  } catch (e) { console.error("deleteOldBrandIconFile png:", e.message); }
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

const SORT_MAP = { name: "name", accounts: "available_accounts", home: "available_home", sortOrder: "sort_order" };

function buildItem(row) {
  return {
    id: row.id,
    name: row.name || "",
    forAccounts: !!row.available_accounts,
    forHome: !!row.available_home,
    forAccountsYesNo: row.available_accounts ? "Yes" : "No",
    forHomeYesNo: row.available_home ? "Yes" : "No",
    sortOrder: row.sort_order != null ? row.sort_order : 0,
    iconPath: row.icon_path != null ? String(row.icon_path) : "",
    createdAt: row.created_at,
    total: Number(row.total_masters) || 0,
    active: Number(row.active_masters) || 0,
  };
}

/**
 * GET /api/admin/brands
 */
exports.getAdminBrands = async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const availability = String(req.query.availability || "").trim().toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = SORT_MAP[req.query.sortKey] ? req.query.sortKey : "sortOrder";
    const sortColumn = SORT_MAP[sortKey];
    const sortDir = String(req.query.sortDir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

    const where = [];
    const params = [];
    if (name) {
      where.push("name LIKE ?");
      params.push(`%${name}%`);
    }
    if (availability === "accounts") where.push("available_accounts = 1");
    else if (availability === "home") where.push("available_home = 1");

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    let rows = [];
    try {
      const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM brands ${whereSql}`, params);
      total = Number(c?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    const selectWithCounts =
      `SELECT id, name, available_accounts, available_home, sort_order, icon_path, created_at,
        (SELECT COUNT(*) FROM brand_companies bc WHERE bc.brand_id = brands.id) AS total_masters,
        (SELECT COUNT(*) FROM brand_companies bc WHERE bc.brand_id = brands.id AND bc.is_active = 1) AS active_masters
       FROM brands ${whereSql}
       ORDER BY ${sortColumn} ${sortDir}, id ASC
       LIMIT ? OFFSET ?`;
    try {
      [rows] = await pool.query(selectWithCounts, [...params, pageSize, offset]);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
      }
      if (e.code === "ER_NO_SUCH_TABLE") {
        try {
          [rows] = await pool.query(
            `SELECT id, name, available_accounts, available_home, sort_order, icon_path, created_at
             FROM brands ${whereSql}
             ORDER BY ${sortColumn} ${sortDir}, id ASC
             LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
          );
          rows = (rows || []).map((r) => ({ ...r, total_masters: 0, active_masters: 0 }));
        } catch (e2) {
          if (e2.code === "ER_NO_SUCH_TABLE") {
            return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
          }
          throw e2;
        }
      } else {
        throw e;
      }
    }

    const items = rows.map((r) => buildItem(r));
    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      sortKey,
      sortDir: sortDir.toLowerCase(),
    });
  } catch (err) {
    console.error("getAdminBrands error:", err);
    return res.status(500).json({ message: "Failed to load brands." });
  }
};

/**
 * GET /api/brands/home — public; brands shown on client home carousel (available_home = 1).
 */
exports.getPublicBrandsForHome = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await pool.query(
        `SELECT id, name, icon_path, sort_order
         FROM brands
         WHERE available_home = 1
         ORDER BY sort_order ASC, name ASC, id ASC`
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ items: [] });
      throw e;
    }
    const items = (rows || [])
      .map((r) => ({
        id: r.id,
        name: r.name || "",
        iconPath: r.icon_path != null ? String(r.icon_path).trim() : "",
      }))
      .filter((r) => r.iconPath);
    return res.status(200).json({ items });
  } catch (err) {
    console.error("getPublicBrandsForHome error:", err);
    return res.status(500).json({ message: "Failed to load brands.", items: [] });
  }
};

/**
 * POST /api/admin/brands
 */
exports.createAdminBrand = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const availableAccounts = parseYesNo(req.body?.availableAccounts ?? 1);
    const availableHome = parseYesNo(req.body?.availableHome ?? 1);
    const sortOrderRaw = req.body?.sortOrder;
    const sortOrder = sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw))
      ? Math.floor(Number(sortOrderRaw))
      : null;
    const iconSvg = req.body?.iconSvg != null ? String(req.body.iconSvg) : null;
    const iconFile = req.file;

    if (!name) return res.status(400).json({ message: "Name is required." });

    let iconPathFromFile = null;
    if (iconFile && iconFile.buffer && iconFile.buffer.length > 0) {
      const prefix = uniqueBrandIconFilePrefix(name);
      const result = await processBrandIconUpload(iconFile.buffer, iconFile.mimetype, prefix);
      if (result.error) return res.status(400).json({ message: result.error });
      iconPathFromFile = result.iconPath;
    }

    let nextOrder = sortOrder;
    if (nextOrder === null) {
      try {
        const [[r]] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM brands");
        nextOrder = Number(r?.n) || 1;
      } catch (e) {
        if (e.code === "ER_NO_SUCH_TABLE") return res.status(503).json({ message: "Brands table not set up. Run database/migration_brands.sql." });
        throw e;
      }
    }

    let result;
    try {
      [result] = await pool.query(
        `INSERT INTO brands (name, available_accounts, available_home, sort_order, icon_path)
         VALUES (?, ?, ?, ?, ?)`,
        [name, availableAccounts, availableHome, nextOrder, iconPathFromFile]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") return res.status(503).json({ message: "Brands table not set up. Run database/migration_brands.sql." });
      if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "A brand with this name already exists." });
      throw e;
    }

    const insertId = result.insertId;
    if (!insertId) return res.status(500).json({ message: "Failed to create brand." });

    if (!iconPathFromFile && iconSvg && iconSvg.trim()) {
      const sanitized = sanitizeSvg(iconSvg);
      if (sanitized.ok && ensureUploadsBrandsDir()) {
        const optimized = optimizeSvg(sanitized.data);
        const baseName = `brand-${insertId}.svg`;
        const svgPath = path.join(UPLOADS_BRANDS, baseName);
        try {
          fs.writeFileSync(svgPath, optimized, "utf8");
          generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
          await pool.query("UPDATE brands SET icon_path = ? WHERE id = ?", [`/uploads/brands/${baseName}`, insertId]);
        } catch (_) {}
      }
    }

    const [rows] = await pool.query(
      "SELECT id, name, available_accounts, available_home, sort_order, icon_path, created_at FROM brands WHERE id = ?",
      [insertId]
    );
    const row = rows[0];
    if (!row) return res.status(500).json({ message: "Failed to create brand." });
    return res.status(201).json({ message: "Brand created.", item: buildItem(row) });
  } catch (err) {
    console.error("createAdminBrand error:", err);
    return res.status(500).json({ message: "Failed to create brand." });
  }
};

/**
 * PATCH /api/admin/brands/:id
 * Edit: all fields except Name (name not editable).
 */
exports.updateAdminBrand = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const availableAccountsRaw = body.availableAccounts ?? body.available_accounts;
    const availableHomeRaw = body.availableHome ?? body.available_home;
    const availableAccounts = availableAccountsRaw !== undefined && availableAccountsRaw !== null ? parseYesNo(availableAccountsRaw) : null;
    const availableHome = availableHomeRaw !== undefined && availableHomeRaw !== null ? parseYesNo(availableHomeRaw) : null;
    const sortOrderRaw = body.sortOrder ?? body.sort_order;
    const sortOrder = sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw)) ? Math.floor(Number(sortOrderRaw)) : null;
    const iconSvg = body.iconSvg !== undefined ? String(body.iconSvg) : undefined;
    const iconFile = req.file;

    let iconPathFromFile = null;
    if (iconFile && iconFile.buffer && iconFile.buffer.length > 0) {
      const prefix = uniqueBrandIconFilePrefix(`id-${id}`);
      const result = await processBrandIconUpload(iconFile.buffer, iconFile.mimetype, prefix);
      if (result.error) return res.status(400).json({ message: result.error });
      iconPathFromFile = result.iconPath;
    }

    let existing;
    try {
      [existing] = await pool.query(
        "SELECT id, name, available_accounts, available_home, sort_order, icon_path FROM brands WHERE id = ?",
        [id]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") return res.status(503).json({ message: "Brands table not set up." });
      throw e;
    }

    if (!existing.length) return res.status(404).json({ message: "Brand not found." });

    const updates = [];
    const params = [];
    if (availableAccounts !== null) { updates.push("available_accounts = ?"); params.push(availableAccounts); }
    if (availableHome !== null) { updates.push("available_home = ?"); params.push(availableHome); }
    if (sortOrder !== null && sortOrder >= 0) { updates.push("sort_order = ?"); params.push(sortOrder); }
    if (iconPathFromFile !== null) { updates.push("icon_path = ?"); params.push(iconPathFromFile); }

    if (updates.length === 0 && iconSvg === undefined) {
      return res.status(200).json({ message: "No changes.", item: buildItem(existing[0]) });
    }

    const oldIconPath = existing[0].icon_path;
    if (iconPathFromFile !== null && oldIconPath) deleteOldBrandIconFile(oldIconPath);

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE brands SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    if (!iconPathFromFile && iconSvg !== undefined && iconSvg && String(iconSvg).trim()) {
      const sanitized = sanitizeSvg(iconSvg);
      if (sanitized.ok && ensureUploadsBrandsDir()) {
        const optimized = optimizeSvg(sanitized.data);
        const baseName = `brand-${id}.svg`;
        const svgPath = path.join(UPLOADS_BRANDS, baseName);
        try {
          if (oldIconPath) deleteOldBrandIconFile(oldIconPath);
          fs.writeFileSync(svgPath, optimized, "utf8");
          generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
          await pool.query("UPDATE brands SET icon_path = ? WHERE id = ?", [`/uploads/brands/${baseName}`, id]);
        } catch (_) {}
      }
    }

    const [rows] = await pool.query(
      "SELECT id, name, available_accounts, available_home, sort_order, icon_path, created_at FROM brands WHERE id = ?",
      [id]
    );
    return res.status(200).json({ message: "Brand updated.", item: buildItem(rows[0]) });
  } catch (err) {
    console.error("updateAdminBrand error:", err);
    return res.status(500).json({ message: "Failed to update brand." });
  }
};
