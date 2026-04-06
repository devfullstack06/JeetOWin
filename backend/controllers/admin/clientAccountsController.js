const { pool } = require("../../config/database");
const bcrypt = require("bcrypt");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseActive(value) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  const s = String(value || "").trim().toLowerCase();
  return s === "active" || s === "yes" || s === "true" || s === "1" ? 1 : 0;
}

function buildItem(row) {
  const statusVal = row.status != null ? String(row.status).toLowerCase() : "active";
  return {
    id: row.id,
    clientId: row.client_id != null ? row.client_id : null,
    clientUsername: row.client_username != null ? String(row.client_username) : "",
    username: row.username || "",
    suggestedUsername: row.suggested_username != null ? String(row.suggested_username) : "",
    brand: row.brand_name != null ? row.brand_name : (row.brand || ""),
    brandId: row.brand_id != null ? row.brand_id : null,
    brandCompanyId: row.brand_company_id != null ? row.brand_company_id : null,
    status: statusVal === "active" ? "Active" : "Inactive",
    statusRaw: statusVal === "active" ? "active" : "inactive",
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    notes: row.notes != null ? String(row.notes) : "",
    initialPassword:
      row.initial_password != null && String(row.initial_password).trim() !== ""
        ? String(row.initial_password)
        : "",
    createdByUsername: row.created_by_username != null ? String(row.created_by_username) : "",
  };
}

const SORT_MAP = {
  clientUsername: "u.username",
  username: "ca.username",
  brand: "b.name",
  status: "ca.status",
  updatedAt: "ca.updated_at",
  createdAt: "ca.created_at",
  createdByUsername: "ca.created_by_username",
};

/**
 * GET /api/admin/client-accounts
 * List with filters: client (username from users where role_id=1), username, brand, status, dateFrom, dateTo. Pagination, sort.
 */
exports.getAdminClientAccounts = async (req, res) => {
  try {
    const client = String(req.query.client || "").trim();
    const username = String(req.query.username || "").trim();
    const brand = String(req.query.brand || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const dateFrom = String(req.query.dateFrom || req.query.startDate || "").trim();
    const dateTo = String(req.query.dateTo || req.query.endDate || "").trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = SORT_MAP[req.query.sortKey] ? req.query.sortKey : "updatedAt";
    const sortColumn = SORT_MAP[sortKey];
    const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const where = ["1=1"];
    const params = [];

    if (client) {
      where.push("u.role_id = 1 AND u.username LIKE ?");
      params.push(`%${client}%`);
    }
    if (username) {
      where.push("ca.username LIKE ?");
      params.push(`%${username}%`);
    }
    if (brand) {
      const brandNum = Number(brand);
      if (Number.isFinite(brandNum)) {
        where.push("ca.brand_id = ?");
        params.push(brandNum);
      } else {
        where.push("b.name LIKE ?");
        params.push(`%${brand}%`);
      }
    }
    if (status === "active") {
      where.push("(ca.status = 'active' OR ca.status IS NULL)");
    } else if (status === "inactive") {
      where.push("ca.status = 'inactive'");
    }
    if (dateFrom) {
      where.push("ca.created_at >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("ca.created_at <= ?");
      params.push(dateTo + " 23:59:59");
    }

    const whereSql = where.join(" AND ");

    let total = 0;
    let rows = [];

    const joinClient = " LEFT JOIN users u ON u.id = ca.client_id ";
    try {
      const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM client_accounts ca
         LEFT JOIN brands b ON b.id = ca.brand_id
         ${joinClient}
         WHERE ${whereSql}`,
        params
      );
      total = Number(c?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    const orderBy = `${sortColumn} ${sortDir}, ca.id DESC`;
    try {
      [rows] = await pool.query(
        `SELECT ca.id, ca.client_id, ca.username, ca.suggested_username, ca.brand, ca.brand_id, ca.brand_company_id, ca.status, ca.updated_at, ca.created_at, ca.notes,
                ca.initial_password, ca.created_by_username,
                b.name AS brand_name,
                u.username AS client_username
         FROM client_accounts ca
         LEFT JOIN brands b ON b.id = ca.brand_id
         ${joinClient}
         WHERE ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR") {
        [rows] = await pool.query(
          `SELECT ca.id, ca.client_id, ca.username, ca.brand, ca.created_at, u.username AS client_username
           FROM client_accounts ca
           LEFT JOIN brands b ON b.id = ca.brand_id
           ${joinClient}
           WHERE ${whereSql}
           ORDER BY ca.id DESC
           LIMIT ? OFFSET ?`,
          [...params, pageSize, offset]
        );
        rows = (rows || []).map((r) => ({
          ...r,
          brand_name: r.brand,
          status: "active",
          updated_at: r.created_at,
          notes: null,
        }));
      } else {
        throw e;
      }
    }

    const items = (rows || []).map((r) => buildItem(r));
    return res.status(200).json({ items, total, page, pageSize, sortKey, sortDir: sortDir.toLowerCase() });
  } catch (err) {
    console.error("getAdminClientAccounts error:", err);
    return res.status(500).json({ message: "Failed to load accounts.", items: [], total: 0, page: 1, pageSize: 25 });
  }
};

/**
 * GET /api/admin/client-accounts/:id
 */
exports.getAdminClientAccountById = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query(
      `SELECT ca.id, ca.username, ca.suggested_username, ca.brand, ca.brand_id, ca.brand_company_id, ca.status, ca.updated_at, ca.created_at, ca.notes,
              ca.initial_password, ca.created_by_username,
              b.name AS brand_name
       FROM client_accounts ca
       LEFT JOIN brands b ON b.id = ca.brand_id
       WHERE ca.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found." });
    return res.status(200).json({ item: buildItem(rows[0]) });
  } catch (err) {
    console.error("getAdminClientAccountById error:", err);
    return res.status(500).json({ message: "Failed to load account." });
  }
};

/**
 * POST /api/admin/client-accounts
 * Body: username, password, brandId (website), brandCompanyId (master, optional), status, notes
 */
exports.createAdminClientAccount = async (req, res) => {
  try {
    const body = req.body || {};
    const clientId = body.clientId != null && Number.isFinite(Number(body.clientId)) ? Number(body.clientId) : null;
    const username = String(body.username || "").trim();
    const password = body.password != null ? String(body.password) : "";
    const brandId = body.brandId != null ? Number(body.brandId) : null;
    const brandCompanyId = body.brandCompanyId != null ? Number(body.brandCompanyId) : null;
    const statusRaw = String(body.status || "active").trim().toLowerCase();
    const status = statusRaw === "inactive" ? "inactive" : "active";
    const notes = body.notes != null ? String(body.notes || "").trim() : null;

    if (!username) return res.status(400).json({ message: "Username is required." });
    if (!password) return res.status(400).json({ message: "Initial password is required." });
    if (!brandId || !Number.isFinite(brandId)) return res.status(400).json({ message: "Website (brand) is required." });

    let brandName = null;
    if (brandId) {
      const [bRows] = await pool.query("SELECT name FROM brands WHERE id = ? LIMIT 1", [brandId]);
      if (bRows.length) brandName = bRows[0].name;
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const auth = req.authUser || {};
    let createdByUsername = "";
    if (auth.username != null && String(auth.username).trim() !== "") {
      createdByUsername = String(auth.username).trim();
    } else if (auth.id) {
      const [ur] = await pool.query("SELECT username FROM users WHERE id = ? LIMIT 1", [auth.id]);
      if (ur.length && ur[0].username != null) createdByUsername = String(ur[0].username).trim();
    }

    const [result] = await pool.query(
      `INSERT INTO client_accounts (username, password_hash, initial_password, created_by_username, client_id, brand, brand_id, brand_company_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        username,
        passwordHash,
        password,
        createdByUsername || null,
        clientId,
        brandName || "",
        brandId,
        brandCompanyId || null,
        status,
        notes || null,
      ]
    );

    const [rows] = await pool.query(
      `SELECT ca.id, ca.username, ca.brand, ca.brand_id, ca.brand_company_id, ca.status, ca.updated_at, ca.created_at, ca.notes,
              ca.initial_password, ca.created_by_username,
              b.name AS brand_name
       FROM client_accounts ca
       LEFT JOIN brands b ON b.id = ca.brand_id
       WHERE ca.id = ? LIMIT 1`,
      [result.insertId]
    );
    return res.status(201).json({ message: "Created.", item: buildItem(rows[0]) });
  } catch (err) {
    console.error("createAdminClientAccount error:", err);
    return res.status(500).json({ message: err.message || "Failed to create account." });
  }
};

/**
 * PATCH /api/admin/client-accounts/:id
 * Editable: notes, status.
 */
exports.updateAdminClientAccount = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const notes = body.notes !== undefined ? String(body.notes || "").trim() : null;
    const statusRaw = body.status !== undefined ? String(body.status || "").trim().toLowerCase() : null;
    const status = statusRaw === "inactive" ? "inactive" : statusRaw === "active" ? "active" : null;

    const [existing] = await pool.query(
      "SELECT id, username, suggested_username, brand_id, brand_company_id, status, notes FROM client_accounts WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing.length) return res.status(404).json({ message: "Not found." });

    const updates = [];
    const params = [];

    if (notes !== null) {
      updates.push("notes = ?");
      params.push(notes);
    }
    if (status !== null) {
      updates.push("status = ?");
      params.push(status);
    }

    if (updates.length === 0) {
      const [rows] = await pool.query(
        `SELECT ca.id, ca.username, ca.suggested_username, ca.brand, ca.brand_id, ca.brand_company_id, ca.status, ca.updated_at, ca.created_at, ca.notes,
                ca.initial_password, ca.created_by_username,
                b.name AS brand_name
         FROM client_accounts ca LEFT JOIN brands b ON b.id = ca.brand_id WHERE ca.id = ?`,
        [id]
      );
      return res.status(200).json({ message: "No changes.", item: buildItem(rows[0]) });
    }

    updates.push("updated_at = NOW()");
    params.push(id);
    await pool.query(`UPDATE client_accounts SET ${updates.join(", ")} WHERE id = ?`, params);

    const [rows] = await pool.query(
      `SELECT ca.id, ca.username, ca.suggested_username, ca.brand, ca.brand_id, ca.brand_company_id, ca.status, ca.updated_at, ca.created_at, ca.notes,
              ca.initial_password, ca.created_by_username,
              b.name AS brand_name
       FROM client_accounts ca LEFT JOIN brands b ON b.id = ca.brand_id WHERE ca.id = ?`,
      [id]
    );
    return res.status(200).json({ message: "Updated.", item: buildItem(rows[0]) });
  } catch (err) {
    console.error("updateAdminClientAccount error:", err);
    return res.status(500).json({ message: err.message || "Failed to update account." });
  }
};
