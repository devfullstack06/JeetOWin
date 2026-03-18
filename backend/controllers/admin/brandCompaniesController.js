const { pool } = require("../../config/database");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

const SORT_MAP = {
  username: "bc.username",
  website: "b.name",
  type: "bc.type",
  status: "bc.is_active",
  sortOrder: "bc.id",
};

/**
 * GET /api/admin/brand-companies
 * List with filters: username, website (brand_id), type, status. Pagination, sort.
 */
exports.getAdminBrandCompanies = async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    const website = String(req.query.website || "").trim(); // brand_id
    const type = String(req.query.type || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = req.query.sortKey in SORT_MAP ? req.query.sortKey : "sortOrder";
    const sortColumn = SORT_MAP[sortKey];
    const sortDir = String(req.query.sortDir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

    const where = ["1=1"];
    const params = [];

    if (username) {
      where.push("bc.username LIKE ?");
      params.push(`%${username}%`);
    }
    if (website) {
      where.push("bc.brand_id = ?");
      params.push(website);
    }
    if (type === "master" || type === "affiliate") {
      where.push("bc.type = ?");
      params.push(type);
    }
    if (status === "active") {
      where.push("bc.is_active = 1");
    } else if (status === "inactive") {
      where.push("bc.is_active = 0");
    }

    const whereSql = where.join(" AND ");

    let total = 0;
    try {
      const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM brand_companies bc
         INNER JOIN brands b ON b.id = bc.brand_id
         WHERE ${whereSql}`,
        params
      );
      total = Number(c?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    let rows = [];
    try {
      [rows] = await pool.query(
        `SELECT bc.id, bc.username, bc.brand_id, b.name AS brand_name, bc.type, bc.website_url, bc.affiliate_link, bc.is_active, bc.notes, bc.created_at
         FROM brand_companies bc
         INNER JOIN brands b ON b.id = bc.brand_id
         WHERE ${whereSql}
         ORDER BY ${sortColumn} ${sortDir}, bc.id ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize, sortKey: "sortOrder", sortDir: "asc" });
      }
      throw e;
    }

    const items = (rows || []).map((r) => ({
      id: r.id,
      username: r.username || "",
      brandId: r.brand_id,
      website: r.brand_name || "",
      type: r.type || "master",
      websiteUrl: r.website_url != null ? String(r.website_url) : "",
      affiliateLink: r.affiliate_link != null ? String(r.affiliate_link) : "",
      status: r.is_active ? "Active" : "Inactive",
      statusRaw: r.is_active ? "active" : "inactive",
      notes: r.notes != null ? String(r.notes) : "",
      createdAt: r.created_at,
      linkUrl: r.type === "master" ? (r.website_url || "") : (r.affiliate_link || ""),
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
    console.error("getAdminBrandCompanies error:", err);
    return res.status(500).json({ message: "Failed to load list." });
  }
};

/**
 * GET /api/admin/brands/for-accounts
 * Returns brands with available_accounts=1 for dropdowns (id, name).
 */
exports.getAdminBrandsForAccounts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM brands WHERE available_accounts = 1 ORDER BY sort_order ASC, name ASC"
    );
    return res.status(200).json({ brands: rows || [] });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ brands: [] });
    console.error("getAdminBrandsForAccounts error:", e);
    return res.status(500).json({ message: "Failed to load brands.", brands: [] });
  }
};

function parseActive(value) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  const s = String(value || "").trim().toLowerCase();
  return s === "active" || s === "yes" || s === "true" || s === "1" ? 1 : 0;
}

/**
 * POST /api/admin/brand-companies
 */
exports.createAdminBrandCompany = async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const brandId = req.body?.brandId != null ? Number(req.body.brandId) : null;
    const type = String(req.body?.type || "master").trim().toLowerCase();
    const websiteUrl = type === "master" ? String(req.body?.websiteUrl || "").trim() : null;
    const affiliateLink = type === "affiliate" ? String(req.body?.affiliateLink || "").trim() : null;
    const isActive = parseActive(req.body?.status ?? req.body?.isActive ?? 1);
    const notes = req.body?.notes != null ? String(req.body.notes).trim() : null;

    if (!username) return res.status(400).json({ message: "Username is required." });
    if (!brandId || !Number.isFinite(brandId)) return res.status(400).json({ message: "Website (brand) is required." });
    if (type !== "master" && type !== "affiliate") return res.status(400).json({ message: "Type must be Master or Affiliate." });
    if (type === "master" && !websiteUrl) return res.status(400).json({ message: "Website URL is required for Master." });
    if (type === "affiliate" && !affiliateLink) return res.status(400).json({ message: "Affiliate Link is required for Affiliate." });

    const [result] = await pool.query(
      `INSERT INTO brand_companies (username, brand_id, type, website_url, affiliate_link, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, brandId, type, websiteUrl || null, affiliateLink || null, isActive, notes || null]
    );

    const insertId = result.insertId;
    if (!insertId) return res.status(500).json({ message: "Failed to create." });

    const [[row]] = await pool.query(
      `SELECT bc.id, bc.username, bc.brand_id, b.name AS brand_name, bc.type, bc.website_url, bc.affiliate_link, bc.is_active, bc.notes, bc.created_at
       FROM brand_companies bc INNER JOIN brands b ON b.id = bc.brand_id WHERE bc.id = ?`,
      [insertId]
    );

    const item = row ? {
      id: row.id,
      username: row.username || "",
      brandId: row.brand_id,
      website: row.brand_name || "",
      type: row.type || "master",
      websiteUrl: row.website_url != null ? String(row.website_url) : "",
      affiliateLink: row.affiliate_link != null ? String(row.affiliate_link) : "",
      status: row.is_active ? "Active" : "Inactive",
      statusRaw: row.is_active ? "active" : "inactive",
      notes: row.notes != null ? String(row.notes) : "",
      createdAt: row.created_at,
      linkUrl: row.type === "master" ? (row.website_url || "") : (row.affiliate_link || ""),
    } : null;

    return res.status(201).json({ message: "Created.", item });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(503).json({ message: "Table not set up. Run migration_brand_companies.sql." });
    if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ message: "Invalid brand selected." });
    console.error("createAdminBrandCompany error:", err);
    return res.status(500).json({ message: "Failed to create." });
  }
};

/**
 * PATCH /api/admin/brand-companies/:id
 */
exports.updateAdminBrandCompany = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const username = body.username != null ? String(body.username).trim() : null;
    const brandId = body.brandId != null ? Number(body.brandId) : null;
    const type = body.type != null ? String(body.type).trim().toLowerCase() : null;
    const websiteUrl = body.websiteUrl !== undefined ? String(body.websiteUrl || "").trim() : null;
    const affiliateLink = body.affiliateLink !== undefined ? String(body.affiliateLink || "").trim() : null;
    const isActive = body.status !== undefined || body.isActive !== undefined ? parseActive(body.status ?? body.isActive) : null;
    const notes = body.notes !== undefined ? String(body.notes || "").trim() : null;

    const [existing] = await pool.query(
      "SELECT id, username, brand_id, type, website_url, affiliate_link, is_active, notes FROM brand_companies WHERE id = ?",
      [id]
    );
    if (!existing.length) return res.status(404).json({ message: "Not found." });

    const updates = [];
    const params = [];
    if (username !== null) { updates.push("username = ?"); params.push(username); }
    if (brandId !== null && Number.isFinite(brandId)) { updates.push("brand_id = ?"); params.push(brandId); }
    if (type === "master" || type === "affiliate") { updates.push("type = ?"); params.push(type); }
    if (websiteUrl !== null) { updates.push("website_url = ?"); params.push(websiteUrl || null); }
    if (affiliateLink !== null) { updates.push("affiliate_link = ?"); params.push(affiliateLink || null); }
    if (isActive !== null) { updates.push("is_active = ?"); params.push(isActive); }
    if (notes !== null) { updates.push("notes = ?"); params.push(notes || null); }

    if (updates.length === 0) {
      const [r] = await pool.query(
        `SELECT bc.id, bc.username, bc.brand_id, b.name AS brand_name, bc.type, bc.website_url, bc.affiliate_link, bc.is_active, bc.notes, bc.created_at
         FROM brand_companies bc INNER JOIN brands b ON b.id = bc.brand_id WHERE bc.id = ?`,
        [id]
      );
      const row = r[0];
      const item = row ? {
        id: row.id,
        username: row.username || "",
        brandId: row.brand_id,
        website: row.brand_name || "",
        type: row.type || "master",
        websiteUrl: row.website_url != null ? String(row.website_url) : "",
        affiliateLink: row.affiliate_link != null ? String(row.affiliate_link) : "",
        status: row.is_active ? "Active" : "Inactive",
        statusRaw: row.is_active ? "active" : "inactive",
        notes: row.notes != null ? String(row.notes) : "",
        createdAt: row.created_at,
        linkUrl: row.type === "master" ? (row.website_url || "") : (row.affiliate_link || ""),
      } : null;
      return res.status(200).json({ message: "No changes.", item });
    }

    params.push(id);
    await pool.query(`UPDATE brand_companies SET ${updates.join(", ")} WHERE id = ?`, params);

    const [[row]] = await pool.query(
      `SELECT bc.id, bc.username, bc.brand_id, b.name AS brand_name, bc.type, bc.website_url, bc.affiliate_link, bc.is_active, bc.notes, bc.created_at
       FROM brand_companies bc INNER JOIN brands b ON b.id = bc.brand_id WHERE bc.id = ?`,
      [id]
    );
    const item = row ? {
      id: row.id,
      username: row.username || "",
      brandId: row.brand_id,
      website: row.brand_name || "",
      type: row.type || "master",
      websiteUrl: row.website_url != null ? String(row.website_url) : "",
      affiliateLink: row.affiliate_link != null ? String(row.affiliate_link) : "",
      status: row.is_active ? "Active" : "Inactive",
      statusRaw: row.is_active ? "active" : "inactive",
      notes: row.notes != null ? String(row.notes) : "",
      createdAt: row.created_at,
      linkUrl: row.type === "master" ? (row.website_url || "") : (row.affiliate_link || ""),
    } : null;

    return res.status(200).json({ message: "Updated.", item });
  } catch (err) {
    console.error("updateAdminBrandCompany error:", err);
    return res.status(500).json({ message: "Failed to update." });
  }
};
