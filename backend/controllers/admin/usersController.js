const bcrypt = require("bcrypt");
const { pool } = require("../../config/database");

const SORT_COLUMN_MAP = {
  username: "u.username",
  name: "c.full_name",
  contact: "c.mobile",
  balance: "c.balance",
  status: "c.status",
  joinDateISO: "c.created_at",
};

function normalizeSortDir(value) {
  return String(value || "").toLowerCase() === "desc" ? "DESC" : "ASC";
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

exports.getAdminUsers = async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    const contact = String(req.query.contact || "").trim();
    const startDate = String(req.query.startDate || "").trim();
    const endDate = String(req.query.endDate || "").trim();

    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);

    const sortKey = SORT_COLUMN_MAP[req.query.sortKey] ? req.query.sortKey : "joinDateISO";
    const sortColumn = SORT_COLUMN_MAP[sortKey];
    const sortDir = normalizeSortDir(req.query.sortDir);

    const where = [`r.name = 'client'`];
    const params = [];

    if (username) {
      where.push(`u.username LIKE ?`);
      params.push(`%${username}%`);
    }

    if (contact) {
      where.push(`c.mobile LIKE ?`);
      params.push(`%${contact}%`);
    }

    if (startDate) {
      where.push(`c.created_at >= ?`);
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      where.push(`c.created_at <= ?`);
      params.push(`${endDate} 23:59:59`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*) AS total
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      INNER JOIN clients c ON c.user_id = u.id
      ${whereSql}
    `;

    const [countRows] = await pool.query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);

    const offset = (page - 1) * pageSize;

    const dataSql = `
      SELECT
        u.id,
        u.username,
        COALESCE(c.full_name, '') AS name,
        COALESCE(c.mobile, '') AS contact,
        COALESCE(c.balance, 0) AS balance,
        c.status,
        c.created_at AS joinDateISO
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      INNER JOIN clients c ON c.user_id = u.id
      ${whereSql}
      ORDER BY ${sortColumn} ${sortDir}, u.id DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, pageSize, offset];
    const [rows] = await pool.query(dataSql, dataParams);

    const items = rows.map((row) => ({
      id: row.id,
      username: row.username || "",
      name: row.name || "",
      contact: row.contact || "",
      balance: Number(row.balance || 0),
      balanceText: Number(row.balance || 0).toFixed(2),
      status:
        String(row.status || "").toLowerCase() === "active" ? "Active" : "Inactive",
      statusRaw:
        String(row.status || "").toLowerCase() === "active" ? "active" : "suspended",
      joinDateISO: row.joinDateISO,
      joinDateText: row.joinDateISO,
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
    console.error("getAdminUsers error:", err);
    return res.status(500).json({
      message: "Something went wrong while loading users.",
    });
  }
};

function normalizeContactToDigits(contact) {
  const digits = String(contact || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("92")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(0, 10);
  return digits;
}

exports.updateAdminUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const name = String(req.body?.name || "").trim();
    const contactRaw = String(req.body?.contact || "").trim();
    const status = String(req.body?.status || "").trim().toLowerCase();
    const newPassword = req.body?.newPassword != null ? String(req.body.newPassword) : null;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user id.",
      });
    }

    if (!name || name.length < 3) {
      return res.status(400).json({
        message: "Full name must be at least 3 characters.",
      });
    }

    const contactDigits = normalizeContactToDigits(contactRaw);
    if (contactDigits.length !== 10) {
      return res.status(400).json({
        message: "Mobile number must be exactly 10 digits.",
      });
    }
    if (!/^3/.test(contactDigits)) {
      return res.status(400).json({
        message: "Mobile number must start with 3.",
      });
    }
    if (!/^\d{10}$/.test(contactDigits)) {
      return res.status(400).json({
        message: "Mobile number must contain only digits.",
      });
    }
    const contact = `+92${contactDigits}`;

    if (newPassword !== null && newPassword !== "") {
      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters.",
        });
      }
    }

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        message: "Status must be active or suspended.",
      });
    }

    const findSql = `
      SELECT
        u.id,
        u.username,
        COALESCE(c.full_name, '') AS name,
        COALESCE(c.mobile, '') AS contact,
        COALESCE(c.balance, 0) AS balance,
        c.status,
        c.created_at AS joinDateISO
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      INNER JOIN clients c ON c.user_id = u.id
      WHERE u.id = ? AND r.name = 'client'
      LIMIT 1
    `;

    const [existingRows] = await pool.query(findSql, [userId]);

    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        message: "Client user not found.",
      });
    }

    const updateSql = `
      UPDATE clients
      SET full_name = ?, mobile = ?, status = ?
      WHERE user_id = ?
      LIMIT 1
    `;

    await pool.query(updateSql, [name, contact, status, userId]);

    if (newPassword !== null && newPassword !== "") {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      await pool.query(
        `UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1`,
        [passwordHash, userId]
      );
    }

    const [updatedRows] = await pool.query(findSql, [userId]);
    const updated = updatedRows[0];

    return res.status(200).json({
      message: "User updated successfully.",
      item: {
        id: updated.id,
        username: updated.username || "",
        name: updated.name || "",
        contact: updated.contact || "",
        balance: Number(updated.balance || 0),
        balanceText: Number(updated.balance || 0).toFixed(2),
        status:
          String(updated.status || "").toLowerCase() === "active" ? "Active" : "Inactive",
        statusRaw:
          String(updated.status || "").toLowerCase() === "active" ? "active" : "suspended",
        joinDateISO: updated.joinDateISO,
        joinDateText: updated.joinDateISO,
      },
    });
  } catch (err) {
    console.error("updateAdminUser error:", err);
    return res.status(500).json({
      message: "Something went wrong while updating user.",
    });
  }
};