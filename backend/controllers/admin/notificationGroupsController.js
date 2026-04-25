const { pool } = require("../../config/database");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeSortDir(value) {
  return String(value || "").toLowerCase() === "desc" ? "DESC" : "ASC";
}

const GROUP_NAME_RE = /^[A-Za-z0-9]+$/;

function isValidGroupName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 120 && GROUP_NAME_RE.test(name);
}

async function assertAllClientUserIds(userIds) {
  if (!userIds.length) return true;
  const placeholders = userIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `
    SELECT u.id
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    INNER JOIN clients cl ON cl.user_id = u.id
    WHERE r.name = 'client' AND u.id IN (${placeholders})
    `,
    userIds
  );
  return rows.length === userIds.length;
}

const AUDIENCE_TYPES = new Set(["all", "custom", "selected"]);

/**
 * Resolves audience rules to unique client user rows { userId, username } sorted by username.
 * @param {import('mysql2/promise').Pool} dbPool
 * @param {{ type: string, excludeUserIds?: unknown[], includeUserIds?: unknown[], customCriteria?: { kind?: string, id?: unknown }[] }} audience
 */
async function resolveAudienceToUserRows(dbPool, audience) {
  const type = String(audience?.type || "").toLowerCase();
  if (!AUDIENCE_TYPES.has(type)) {
    const err = new Error("INVALID_AUDIENCE_TYPE");
    err.code = "INVALID_AUDIENCE_TYPE";
    throw err;
  }

  const exclude = new Set(
    Array.isArray(audience.excludeUserIds)
      ? audience.excludeUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
      : []
  );

  /** @type {{ userId: number, username: string }[]} */
  let rows = [];

  if (type === "all") {
    const [r] = await dbPool.query(
      `
      SELECT u.id AS userId, u.username
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
      INNER JOIN clients cl ON cl.user_id = u.id
      `
    );
    rows = r;
  } else if (type === "selected") {
    const ids = [
      ...new Set(
        Array.isArray(audience.includeUserIds)
          ? audience.includeUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : []
      ),
    ];
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const [r] = await dbPool.query(
        `
        SELECT u.id AS userId, u.username
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
        INNER JOIN clients cl ON cl.user_id = u.id
        WHERE u.id IN (${ph})
        `,
        ids
      );
      rows = r;
    }
  } else if (type === "custom") {
    const criteria = Array.isArray(audience.customCriteria) ? audience.customCriteria : [];
    const byUser = new Map();
    for (const c of criteria) {
      const kind = String(c?.kind || "").toLowerCase();
      const id = Number(c?.id);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (kind === "brand") {
        const [r] = await dbPool.query(
          `
          SELECT DISTINCT u.id AS userId, u.username
          FROM client_accounts ca
          INNER JOIN clients cl ON cl.id = ca.client_id
          INNER JOIN users u ON u.id = cl.user_id
          INNER JOIN roles ro ON ro.id = u.role_id AND ro.name = 'client'
          WHERE ca.brand_id = ?
          `,
          [id]
        );
        r.forEach((row) => byUser.set(Number(row.userId), String(row.username || "")));
      } else if (kind === "wallet") {
        const [r] = await dbPool.query(
          `
          SELECT DISTINCT u.id AS userId, u.username
          FROM client_wallets cw
          INNER JOIN clients cl ON cl.id = cw.client_id
          INNER JOIN users u ON u.id = cl.user_id
          INNER JOIN roles ro ON ro.id = u.role_id AND ro.name = 'client'
          WHERE cw.wallet_company_id = ?
          `,
          [id]
        );
        r.forEach((row) => byUser.set(Number(row.userId), String(row.username || "")));
      }
    }
    rows = Array.from(byUser.entries()).map(([userId, username]) => ({ userId, username }));
  }

  const map = new Map();
  rows.forEach((row) => {
    const uid = Number(row.userId);
    if (!exclude.has(uid)) map.set(uid, String(row.username || ""));
  });

  return Array.from(map.entries())
    .map(([userId, username]) => ({ userId, username }))
    .sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: "base" }));
}

/**
 * GET /api/admin/notification-groups/audience/brands
 */
exports.getAdminNotificationGroupAudienceBrands = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await pool.query(
        `SELECT id, name FROM brands WHERE is_active = 1 ORDER BY name ASC`
      );
    } catch (inner) {
      if (inner.code === "ER_BAD_FIELD_ERROR") {
        [rows] = await pool.query(`SELECT id, name FROM brands ORDER BY name ASC`);
      } else {
        throw inner;
      }
    }
    return res.json({ items: rows.map((r) => ({ id: r.id, name: r.name || "" })) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "brands table is missing.", items: [] });
    }
    console.error("[notification-groups audience brands]", e);
    return res.status(500).json({ message: "Failed to load brands." });
  }
};

/**
 * GET /api/admin/notification-groups/audience/wallet-companies
 */
exports.getAdminNotificationGroupAudienceWalletCompanies = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await pool.query(
        `SELECT id, name FROM wallet_companies WHERE is_active = 1 ORDER BY name ASC`
      );
    } catch (inner) {
      if (inner.code === "ER_BAD_FIELD_ERROR") {
        [rows] = await pool.query(`SELECT id, name FROM wallet_companies ORDER BY name ASC`);
      } else {
        throw inner;
      }
    }
    return res.json({ items: rows.map((r) => ({ id: r.id, name: r.name || "" })) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "wallet_companies table is missing.", items: [] });
    }
    console.error("[notification-groups audience wallet-companies]", e);
    return res.status(500).json({ message: "Failed to load wallet companies." });
  }
};

const RESOLVE_PREVIEW_CAP = 4000;

/**
 * POST /api/admin/notification-groups/audience/resolve
 * Body: { type: 'all'|'custom'|'selected', excludeUserIds?: number[], includeUserIds?: number[], customCriteria?: { kind:'brand'|'wallet', id:number }[] }
 */
exports.postAdminNotificationGroupAudienceResolve = async (req, res) => {
  try {
    const members = await resolveAudienceToUserRows(pool, req.body || {});
    const count = members.length;
    const truncated = count > RESOLVE_PREVIEW_CAP;
    return res.json({
      count,
      members: truncated ? members.slice(0, RESOLVE_PREVIEW_CAP) : members,
      membersTruncated: truncated,
    });
  } catch (e) {
    if (e.code === "INVALID_AUDIENCE_TYPE") {
      return res.status(400).json({ message: "Audience type must be all, custom, or selected." });
    }
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Required tables are missing (e.g. client_accounts, client_wallets).",
        count: 0,
        members: [],
        membersTruncated: false,
      });
    }
    console.error("[notification-groups audience resolve]", e);
    return res.status(500).json({ message: "Failed to resolve audience." });
  }
};

/**
 * GET /api/admin/notification-groups/names
 * Dropdown: all groups { id, name }.
 */
exports.getAdminNotificationGroupNames = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name FROM notification_groups ORDER BY name ASC`
    );
    return res.json({ items: rows.map((r) => ({ id: r.id, name: r.name })) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "notification_groups table is missing. Run database/migration_notification_groups.sql",
        items: [],
      });
    }
    console.error("[notification-groups names]", e);
    return res.status(500).json({ message: "Failed to load group names." });
  }
};

const SORT_COLUMN_MAP = {
  name: "g.name",
  members: "member_count",
  status: "g.status",
  updatedAt: "g.updated_at",
};

/**
 * GET /api/admin/notification-groups
 * Query: memberUserId, groupId, status (all|active|inactive), page, pageSize, sortKey, sortDir
 */
exports.getAdminNotificationGroups = async (req, res) => {
  try {
    const memberUserId = req.query.memberUserId
      ? Number(req.query.memberUserId)
      : null;
    const groupId = req.query.groupId ? Number(req.query.groupId) : null;
    const statusRaw = String(req.query.status || "all").toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = SORT_COLUMN_MAP[req.query.sortKey] ? req.query.sortKey : "updatedAt";
    const sortCol = SORT_COLUMN_MAP[sortKey];
    const sortDir = normalizeSortDir(req.query.sortDir);

    const where = [];
    const params = [];

    if (Number.isInteger(memberUserId) && memberUserId > 0) {
      where.push(
        `EXISTS (SELECT 1 FROM notification_group_members m WHERE m.group_id = g.id AND m.user_id = ?)`
      );
      params.push(memberUserId);
    }

    if (Number.isInteger(groupId) && groupId > 0) {
      where.push(`g.id = ?`);
      params.push(groupId);
    }

    if (statusRaw === "active" || statusRaw === "inactive") {
      where.push(`g.status = ?`);
      params.push(statusRaw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*) AS total
      FROM notification_groups g
      ${whereSql}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);
    const offset = (page - 1) * pageSize;

    const dataSql = `
      SELECT
        g.id,
        g.name,
        g.status,
        g.created_at AS createdAt,
        g.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM notification_group_members m WHERE m.group_id = g.id) AS member_count
      FROM notification_groups g
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}, g.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      memberCount: Number(r.member_count || 0),
      status: r.status === "active" ? "Active" : "Inactive",
      statusRaw: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return res.json({
      items,
      total,
      page,
      pageSize,
      sortKey,
      sortDir: sortDir.toLowerCase(),
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "notification_groups table is missing. Run database/migration_notification_groups.sql",
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
      });
    }
    console.error("[notification-groups list]", e);
    return res.status(500).json({ message: "Failed to load notification groups." });
  }
};

/**
 * GET /api/admin/notification-groups/:id
 */
exports.getAdminNotificationGroupById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid group id." });
    }

    const [[g]] = await pool.query(
      `SELECT id, name, status, created_at AS createdAt, updated_at AS updatedAt FROM notification_groups WHERE id = ?`,
      [id]
    );
    if (!g) return res.status(404).json({ message: "Group not found." });

    const [members] = await pool.query(
      `
      SELECT u.id AS userId, u.username, COALESCE(c.full_name, '') AS fullName
      FROM notification_group_members ngm
      INNER JOIN users u ON u.id = ngm.user_id
      INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
      LEFT JOIN clients c ON c.user_id = u.id
      WHERE ngm.group_id = ?
      ORDER BY u.username ASC
      `,
      [id]
    );

    return res.json({
      item: {
        id: g.id,
        name: g.name,
        status: g.status === "active" ? "Active" : "Inactive",
        statusRaw: g.status,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        members: members.map((m) => ({
          userId: m.userId,
          username: m.username || "",
          fullName: m.fullName || "",
        })),
      },
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "notification_groups table is missing. Run database/migration_notification_groups.sql",
      });
    }
    console.error("[notification-groups get]", e);
    return res.status(500).json({ message: "Failed to load group." });
  }
};

/**
 * POST /api/admin/notification-groups
 * Body: { name, memberUserIds?: number[], audience?: { type, excludeUserIds?, includeUserIds?, customCriteria? } }
 */
exports.createAdminNotificationGroup = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const audience = req.body?.audience;
  let memberUserIds = [];

  if (audience && typeof audience === "object" && audience.type != null) {
    try {
      const rows = await resolveAudienceToUserRows(pool, audience);
      memberUserIds = rows.map((r) => r.userId);
    } catch (e) {
      if (e.code === "INVALID_AUDIENCE_TYPE") {
        return res.status(400).json({ message: "Audience type must be all, custom, or selected." });
      }
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({
          message:
            "Could not resolve audience (missing tables such as client_accounts or client_wallets).",
        });
      }
      console.error("[notification-groups create audience]", e);
      return res.status(500).json({ message: "Failed to resolve audience for this group." });
    }
  } else {
    memberUserIds = Array.isArray(req.body?.memberUserIds)
      ? req.body.memberUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
  }

  if (!isValidGroupName(name)) {
    return res.status(400).json({
      message:
        "Group name must be 1–120 characters and contain only letters and digits (A–Z, a–z, 0–9).",
    });
  }

  const uniqueIds = [...new Set(memberUserIds)];
  if (!(await assertAllClientUserIds(uniqueIds))) {
    return res.status(400).json({ message: "All members must be existing client users." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO notification_groups (name, status) VALUES (?, 'active')`,
      [name]
    );
    const groupId = ins.insertId;

    if (uniqueIds.length) {
      const values = uniqueIds.map(() => "(?, ?)").join(", ");
      const flat = uniqueIds.flatMap((uid) => [groupId, uid]);
      await conn.query(
        `INSERT INTO notification_group_members (group_id, user_id) VALUES ${values}`,
        flat
      );
    }

    await conn.commit();

    const [[row]] = await pool.query(
      `
      SELECT g.id, g.name, g.status, g.created_at AS createdAt, g.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM notification_group_members m WHERE m.group_id = g.id) AS member_count
      FROM notification_groups g WHERE g.id = ?
      `,
      [groupId]
    );

    return res.status(201).json({
      item: {
        id: row.id,
        name: row.name,
        memberCount: Number(row.member_count || 0),
        status: row.status === "active" ? "Active" : "Inactive",
        statusRaw: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A group with this name already exists." });
    }
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "notification_groups table is missing. Run database/migration_notification_groups.sql",
      });
    }
    console.error("[notification-groups create]", e);
    return res.status(500).json({ message: "Failed to create group." });
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/admin/notification-groups/:id
 * Body: { name?, statusRaw?: 'active'|'inactive', memberUserIds?: number[], audience?: { type, excludeUserIds?, includeUserIds?, customCriteria? } }
 */
exports.updateAdminNotificationGroup = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid group id." });
  }

  const patchName = req.body?.name !== undefined ? String(req.body.name).trim() : null;
  const patchStatus = req.body?.statusRaw !== undefined ? String(req.body.statusRaw).toLowerCase() : null;
  const hasAudience =
    req.body?.audience !== undefined &&
    req.body?.audience !== null &&
    typeof req.body.audience === "object" &&
    req.body.audience.type != null;
  const patchMembersLegacy = req.body?.memberUserIds !== undefined;

  if (patchName !== null && !isValidGroupName(patchName)) {
    return res.status(400).json({
      message:
        "Group name must be 1–120 characters and contain only letters and digits (A–Z, a–z, 0–9).",
    });
  }

  if (patchStatus !== null && patchStatus !== "active" && patchStatus !== "inactive") {
    return res.status(400).json({ message: "Status must be active or inactive." });
  }

  let memberUserIds = null;
  let shouldUpdateMembers = false;

  if (hasAudience) {
    shouldUpdateMembers = true;
    try {
      const rows = await resolveAudienceToUserRows(pool, req.body.audience);
      memberUserIds = rows.map((r) => r.userId);
    } catch (e) {
      if (e.code === "INVALID_AUDIENCE_TYPE") {
        return res.status(400).json({ message: "Audience type must be all, custom, or selected." });
      }
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({
          message:
            "Could not resolve audience (missing tables such as client_accounts or client_wallets).",
        });
      }
      console.error("[notification-groups patch audience]", e);
      return res.status(500).json({ message: "Failed to resolve audience for this group." });
    }
  } else if (patchMembersLegacy) {
    shouldUpdateMembers = true;
    memberUserIds = Array.isArray(req.body.memberUserIds)
      ? [...new Set(req.body.memberUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))]
      : [];
  }

  if (shouldUpdateMembers && memberUserIds !== null && !(await assertAllClientUserIds(memberUserIds))) {
    return res.status(400).json({ message: "All members must be existing client users." });
  }

  const [[existing]] = await pool.query(`SELECT id FROM notification_groups WHERE id = ?`, [id]);
  if (!existing) {
    return res.status(404).json({ message: "Group not found." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sets = [];
    const params = [];

    if (patchName !== null) {
      sets.push("name = ?");
      params.push(patchName);
    }
    if (patchStatus !== null) {
      sets.push("status = ?");
      params.push(patchStatus);
    }

    if (sets.length) {
      params.push(id);
      await conn.query(`UPDATE notification_groups SET ${sets.join(", ")} WHERE id = ?`, params);
    }

    if (shouldUpdateMembers && memberUserIds !== null) {
      await conn.query(`DELETE FROM notification_group_members WHERE group_id = ?`, [id]);
      if (memberUserIds.length) {
        const values = memberUserIds.map(() => "(?, ?)").join(", ");
        const flat = memberUserIds.flatMap((uid) => [id, uid]);
        await conn.query(
          `INSERT INTO notification_group_members (group_id, user_id) VALUES ${values}`,
          flat
        );
      }
    }

    await conn.commit();

    const [[row]] = await pool.query(
      `
      SELECT g.id, g.name, g.status, g.created_at AS createdAt, g.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM notification_group_members m WHERE m.group_id = g.id) AS member_count
      FROM notification_groups g WHERE g.id = ?
      `,
      [id]
    );

    return res.json({
      item: {
        id: row.id,
        name: row.name,
        memberCount: Number(row.member_count || 0),
        status: row.status === "active" ? "Active" : "Inactive",
        statusRaw: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A group with this name already exists." });
    }
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "notification_groups table is missing. Run database/migration_notification_groups.sql",
      });
    }
    console.error("[notification-groups patch]", e);
    return res.status(500).json({ message: "Failed to update group." });
  } finally {
    conn.release();
  }
};
