const bcrypt = require("bcrypt");
const { pool } = require("../../config/database");
const {
  resolveGeneralEntryLedgerColumn,
  resolveGeHasAccountIdColumns,
} = require("../../utils/generalEntryPersistence");

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

/** Match admin Wallets balance column: integer grouping, no decimals */
function formatClientBalanceDisplay(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString();
}

function emptyLedgerStats() {
  return {
    deposit: { first: null, recent: null, total: 0 },
    withdraw: { first: null, recent: null, total: 0 },
    transferIn: { first: null, recent: null, total: 0 },
    transferOut: { first: null, recent: null, total: 0 },
  };
}

function mapLedgerCell(row) {
  if (!row || row.amount == null) return null;
  const at = row.created_at ? new Date(row.created_at).toISOString() : null;
  return {
    amount: Number(row.amount),
    at,
  };
}

/**
 * Stats from general_entries for client ledger account (same rules as client history).
 */
async function buildLedgerStatsForClientUser(userId) {
  const stats = emptyLedgerStats();
  const ledgerCol = await resolveGeneralEntryLedgerColumn();
  const hasIds = await resolveGeHasAccountIdColumns();

  if (!ledgerCol || !hasIds) {
    return {
      stats,
      warning: "Ledger is not fully configured (general_entries).",
    };
  }

  const [[accRow]] = await pool.query(
    "SELECT id FROM accounts WHERE type = 'client' AND reference_id = ? LIMIT 1",
    [userId]
  );
  if (!accRow) {
    return { stats, warning: null };
  }

  const aid = accRow.id;
  const presets = [
    ["deposit", "to_account_id", "DP%"],
    ["withdraw", "from_account_id", "WD%"],
    ["transferIn", "from_account_id", "TRI%"],
    ["transferOut", "to_account_id", "TRO%"],
  ];

  for (const [key, col, like] of presets) {
    const where = `ge.${col} = ? AND ge.${ledgerCol} LIKE ?`;
    const params = [aid, like];

    const [firstRows] = await pool.query(
      `SELECT ge.amount, ge.created_at FROM general_entries ge WHERE ${where} ORDER BY ge.created_at ASC LIMIT 1`,
      params
    );
    const [recentRows] = await pool.query(
      `SELECT ge.amount, ge.created_at FROM general_entries ge WHERE ${where} ORDER BY ge.created_at DESC LIMIT 1`,
      params
    );
    const [[sumRow]] = await pool.query(
      `SELECT COALESCE(SUM(ge.amount), 0) AS total FROM general_entries ge WHERE ${where}`,
      params
    );

    stats[key] = {
      first: firstRows?.[0] ? mapLedgerCell(firstRows[0]) : null,
      recent: recentRows?.[0] ? mapLedgerCell(recentRows[0]) : null,
      total: Number(sumRow?.total || 0),
    };
  }

  return { stats, warning: null };
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
        u.last_login_at AS lastLoginAt,
        COALESCE(c.full_name, '') AS name,
        COALESCE(c.mobile, '') AS contact,
        COALESCE(c.balance, 0) AS balance,
        c.status,
        c.created_at AS joinDateISO,
        c.notes AS clientNotes
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
      balanceText: formatClientBalanceDisplay(row.balance),
      status:
        String(row.status || "").toLowerCase() === "active" ? "Active" : "Inactive",
      statusRaw:
        String(row.status || "").toLowerCase() === "active" ? "active" : "suspended",
      joinDateISO: row.joinDateISO,
      joinDateText: row.joinDateISO,
      lastLoginAt: row.lastLoginAt || null,
      notes: row.clientNotes != null ? String(row.clientNotes) : "",
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

exports.getAdminUserDetail = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user id.",
      });
    }

    const findSql = `
      SELECT
        u.id,
        u.username,
        u.last_login_at AS lastLoginAt,
        COALESCE(c.full_name, '') AS name,
        COALESCE(c.mobile, '') AS contact,
        COALESCE(c.balance, 0) AS balance,
        c.status,
        c.created_at AS joinDateISO,
        COALESCE(c.notes, '') AS notes,
        c.referral_code AS referralCode,
        ref_u.username AS referredByUsername
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      INNER JOIN clients c ON c.user_id = u.id
      LEFT JOIN clients ref_c ON ref_c.id = c.referred_by_client_id
      LEFT JOIN users ref_u ON ref_u.id = ref_c.user_id
      WHERE u.id = ? AND r.name = 'client'
      LIMIT 1
    `;

    const [existingRows] = await pool.query(findSql, [userId]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        message: "Client user not found.",
      });
    }

    const row = existingRows[0];
    const { stats, warning } = await buildLedgerStatsForClientUser(userId);

    return res.status(200).json({
      item: {
        id: row.id,
        username: row.username || "",
        name: row.name || "",
        contact: row.contact || "",
        balance: Number(row.balance || 0),
        balanceText: formatClientBalanceDisplay(row.balance),
        status:
          String(row.status || "").toLowerCase() === "active" ? "Active" : "Inactive",
        statusRaw:
          String(row.status || "").toLowerCase() === "active" ? "active" : "suspended",
        joinDateISO: row.joinDateISO,
        joinDateText: row.joinDateISO,
        lastLoginAt: row.lastLoginAt || null,
        notes: row.notes != null ? String(row.notes) : "",
        referralCode: row.referralCode ? String(row.referralCode) : "",
        referredBy: row.referredByUsername ? String(row.referredByUsername) : "",
      },
      stats,
      warning: warning || null,
    });
  } catch (err) {
    console.error("getAdminUserDetail error:", err);
    return res.status(500).json({
      message: "Something went wrong while loading user details.",
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
        u.last_login_at AS lastLoginAt,
        COALESCE(c.full_name, '') AS name,
        COALESCE(c.mobile, '') AS contact,
        COALESCE(c.balance, 0) AS balance,
        c.status,
        c.created_at AS joinDateISO,
        COALESCE(c.notes, '') AS notes
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

    const hasNotesKey = Object.prototype.hasOwnProperty.call(req.body || {}, "notes");
    let notesToSave = undefined;
    if (hasNotesKey) {
      const s = String(req.body.notes ?? "").trim().slice(0, 20000);
      notesToSave = s === "" ? null : s;
    }

    if (hasNotesKey) {
      await pool.query(
        `UPDATE clients SET full_name = ?, mobile = ?, status = ?, notes = ? WHERE user_id = ? LIMIT 1`,
        [name, contact, status, notesToSave, userId]
      );
    } else {
      await pool.query(
        `UPDATE clients SET full_name = ?, mobile = ?, status = ? WHERE user_id = ? LIMIT 1`,
        [name, contact, status, userId]
      );
    }

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
        balanceText: formatClientBalanceDisplay(updated.balance),
        status:
          String(updated.status || "").toLowerCase() === "active" ? "Active" : "Inactive",
        statusRaw:
          String(updated.status || "").toLowerCase() === "active" ? "active" : "suspended",
        joinDateISO: updated.joinDateISO,
        joinDateText: updated.joinDateISO,
        lastLoginAt: updated.lastLoginAt || null,
        notes: updated.notes != null ? String(updated.notes) : "",
      },
    });
  } catch (err) {
    console.error("updateAdminUser error:", err);
    return res.status(500).json({
      message: "Something went wrong while updating user.",
    });
  }
};