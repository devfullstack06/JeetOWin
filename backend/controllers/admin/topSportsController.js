const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pool } = require("../../config/database");
const { UPLOADS_TOP_SPORTS } = require("../../middleware/uploadTopSportsImage");

function extFromMime(mime) {
  const m = (mime || "").toLowerCase();
  if (m === "image/jpeg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  return null;
}

function uniqueName(prefix = "top-sport") {
  const slug = String(prefix).replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 20) || "item";
  return `ts-${slug}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function saveImage(buffer, mimetype, base) {
  const ext = extFromMime(mimetype);
  if (!ext) return { error: "Invalid image type." };
  if (!Buffer.isBuffer(buffer) || !buffer.length) return { error: "Empty image file." };
  const baseName = `${base}${ext}`;
  const full = path.join(UPLOADS_TOP_SPORTS, baseName);
  try {
    fs.mkdirSync(UPLOADS_TOP_SPORTS, { recursive: true });
    fs.writeFileSync(full, buffer);
  } catch (e) {
    console.error("save top sport image:", e.message);
    return { error: "Failed to save image." };
  }
  return { imagePath: `/uploads/top-sports/${baseName}` };
}

function deleteImage(storedPath) {
  if (!storedPath || typeof storedPath !== "string" || !storedPath.startsWith("/uploads/top-sports/")) return;
  const base = path.basename(storedPath);
  const full = path.join(UPLOADS_TOP_SPORTS, base);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.error("delete top sport image:", e.message);
  }
}

function parseYesNo(v) {
  if (v === true || v === 1) return 1;
  if (v === false || v === 0) return 0;
  const s = String(v || "").trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1" ? 1 : 0;
}

function toItem(r) {
  return {
    id: r.id,
    name: r.name || "",
    imagePath: r.image_path || "",
    linkUrl: r.link_url != null ? String(r.link_url) : "",
    openInNewTab: !!r.open_in_new_tab,
    sortOrder: r.sort_order != null ? r.sort_order : 0,
    isActive: !!r.is_active,
  };
}

exports.getPublicTopSportsItems = async (req, res) => {
  try {
    let rows = [];
    try {
      [rows] = await pool.query(
        `SELECT id, name, image_path, link_url, open_in_new_tab, sort_order
         FROM top_sports_items
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ items: [] });
      throw e;
    }
    return res.status(200).json({ items: rows.map(toItem) });
  } catch (err) {
    console.error("getPublicTopSportsItems:", err);
    return res.status(500).json({ message: "Failed to load top sports." });
  }
};

exports.getAdminTopSportsItems = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, image_path, link_url, open_in_new_tab, sort_order, is_active
       FROM top_sports_items
       ORDER BY sort_order ASC, id ASC`
    );
    return res.status(200).json({ items: rows.map(toItem) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Top sports table missing. Run migration_top_sports_items.sql." });
    }
    console.error("getAdminTopSportsItems:", err);
    return res.status(500).json({ message: "Failed to load top sports." });
  }
};

exports.createAdminTopSportsItem = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const image = req.file;
    const linkUrl = String(req.body?.linkUrl || "").trim();
    const openInNewTab = req.body?.openInNewTab !== undefined ? parseYesNo(req.body.openInNewTab) : 0;
    const isActive = req.body?.isActive !== undefined ? parseYesNo(req.body.isActive) : 1;
    const sortRaw = req.body?.sortOrder;
    let sortOrder = sortRaw !== undefined && sortRaw !== null && sortRaw !== "" && Number.isFinite(Number(sortRaw))
      ? Math.floor(Number(sortRaw))
      : null;

    if (!name) return res.status(400).json({ message: "Name is required." });
    if (!image?.buffer?.length) return res.status(400).json({ message: "Image is required." });

    if (sortOrder === null) {
      const [[r]] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM top_sports_items").catch(() => [{ n: 1 }]);
      sortOrder = Number(r?.n) || 1;
    }

    const saved = saveImage(image.buffer, image.mimetype, uniqueName(name));
    if (saved.error) return res.status(400).json({ message: saved.error });

    const [result] = await pool.query(
      `INSERT INTO top_sports_items (name, image_path, link_url, open_in_new_tab, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, saved.imagePath, linkUrl || null, openInNewTab, sortOrder, isActive]
    );
    const insertId = result.insertId;
    const [[row]] = await pool.query(
      `SELECT id, name, image_path, link_url, open_in_new_tab, sort_order, is_active
       FROM top_sports_items WHERE id = ?`,
      [insertId]
    );
    return res.status(201).json({ item: toItem(row) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Top sports table missing. Run migration_top_sports_items.sql." });
    }
    console.error("createAdminTopSportsItem:", err);
    return res.status(500).json({ message: "Failed to create top sport item." });
  }
};

exports.updateAdminTopSportsItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query(
      `SELECT id, name, image_path, link_url, open_in_new_tab, sort_order, is_active
       FROM top_sports_items WHERE id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Item not found." });
    const cur = rows[0];

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const sortRaw = req.body?.sortOrder;
    const sortOrder = sortRaw !== undefined && sortRaw !== null && sortRaw !== "" && Number.isFinite(Number(sortRaw))
      ? Math.floor(Number(sortRaw))
      : undefined;
    const isActive = req.body?.isActive !== undefined ? parseYesNo(req.body.isActive) : undefined;
    const linkUrl = req.body?.linkUrl !== undefined ? String(req.body.linkUrl).trim() : undefined;
    const openInNewTab = req.body?.openInNewTab !== undefined ? parseYesNo(req.body.openInNewTab) : undefined;

    if (name !== undefined && !name) return res.status(400).json({ message: "Name cannot be empty." });

    let newImagePath = cur.image_path;
    if (req.file?.buffer?.length) {
      const saved = saveImage(req.file.buffer, req.file.mimetype, uniqueName(`id-${id}`));
      if (saved.error) return res.status(400).json({ message: saved.error });
      newImagePath = saved.imagePath;
    }

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push("name = ?"); params.push(name); }
    if (sortOrder !== undefined) { updates.push("sort_order = ?"); params.push(sortOrder); }
    if (isActive !== undefined) { updates.push("is_active = ?"); params.push(isActive); }
    if (linkUrl !== undefined) { updates.push("link_url = ?"); params.push(linkUrl || null); }
    if (openInNewTab !== undefined) { updates.push("open_in_new_tab = ?"); params.push(openInNewTab); }
    if (newImagePath !== cur.image_path) { updates.push("image_path = ?"); params.push(newImagePath); }

    if (updates.length) {
      params.push(id);
      await pool.query(`UPDATE top_sports_items SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    if (newImagePath !== cur.image_path) deleteImage(cur.image_path);

    const [[row]] = await pool.query(
      `SELECT id, name, image_path, link_url, open_in_new_tab, sort_order, is_active
       FROM top_sports_items WHERE id = ?`,
      [id]
    );
    return res.status(200).json({ item: toItem(row) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Top sports table missing. Run migration_top_sports_items.sql." });
    }
    console.error("updateAdminTopSportsItem:", err);
    return res.status(500).json({ message: "Failed to update top sport item." });
  }
};

exports.deleteAdminTopSportsItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });
    const [rows] = await pool.query("SELECT id, image_path FROM top_sports_items WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Item not found." });
    await pool.query("DELETE FROM top_sports_items WHERE id = ?", [id]);
    deleteImage(rows[0].image_path);
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Top sports table missing. Run migration_top_sports_items.sql." });
    }
    console.error("deleteAdminTopSportsItem:", err);
    return res.status(500).json({ message: "Failed to delete top sport item." });
  }
};
