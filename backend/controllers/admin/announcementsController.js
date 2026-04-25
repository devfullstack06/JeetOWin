const path = require("path");
const fs = require("fs");
const { pool } = require("../../config/database");
const {
  allocateGeneralEntryTransactionNumber,
  GE_TXN_SERIES,
} = require("../../utils/generalEntryTransactionNumber");

const ANN_STATUS = {
  SCHEDULED: "scheduled",
  SENT: "sent",
};

const BAND_MAP = {
  brand: "brand",
  wallet: "wallet",
  member: "member",
};

const ANNOUNCEMENT_IMAGE_MAX_FILE_BYTES = Math.floor(2.5 * 1024 * 1024);
const ANNOUNCEMENT_IMAGE_MAX_TOTAL_BYTES = 25 * 1024 * 1024;

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function toWordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function parseBool(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function toSafeBand(v) {
  return BAND_MAP[String(v || "").trim().toLowerCase()] || null;
}

function toUtcDateInput(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

async function refreshDueAnnouncements(connLike = pool) {
  await connLike.query(
    `
      UPDATE announcements
      SET status = 'sent', sent_at = COALESCE(sent_at, UTC_TIMESTAMP())
      WHERE status = 'scheduled'
        AND scheduled_at_utc IS NOT NULL
        AND scheduled_at_utc <= UTC_TIMESTAMP()
    `
  );
}

async function listClientsByBandAndGroup(conn, band, groupId) {
  if (band === "brand") {
    const [rows] = await conn.query(
      `
      SELECT DISTINCT u.id AS user_id
      FROM client_accounts ca
      INNER JOIN users u ON u.id = ca.client_id
      INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
      WHERE ca.brand_id = ?
      `,
      [groupId]
    );
    return rows.map((r) => Number(r.user_id)).filter((x) => Number.isInteger(x) && x > 0);
  }
  if (band === "wallet") {
    const [rows] = await conn.query(
      `
      SELECT DISTINCT cw.client_id AS user_id
      FROM client_wallets cw
      INNER JOIN users u ON u.id = cw.client_id
      INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
      WHERE cw.wallet_company_id = ?
      `,
      [groupId]
    );
    return rows.map((r) => Number(r.user_id)).filter((x) => Number.isInteger(x) && x > 0);
  }
  const [rows] = await conn.query(
    `
    SELECT DISTINCT ngm.user_id
    FROM notification_group_members ngm
    INNER JOIN users u ON u.id = ngm.user_id
    INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
    WHERE ngm.group_id = ?
    `,
    [groupId]
  );
  return rows.map((r) => Number(r.user_id)).filter((x) => Number.isInteger(x) && x > 0);
}

async function getAllClientUserIds(conn) {
  const [rows] = await conn.query(
    `
    SELECT u.id
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'client'
    `
  );
  return rows.map((r) => Number(r.id)).filter((x) => Number.isInteger(x) && x > 0);
}

async function assertClientUsers(conn, userIds) {
  if (!userIds.length) return true;
  const placeholders = userIds.map(() => "?").join(",");
  const [rows] = await conn.query(
    `
    SELECT u.id
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'client' AND u.id IN (${placeholders})
    `,
    userIds
  );
  return rows.length === userIds.length;
}

async function loadBandChildren(conn) {
  const [brands] = await conn.query(`SELECT id, name FROM brands ORDER BY name ASC`);
  const [wallets] = await conn.query(
    `SELECT id, name FROM wallet_companies ORDER BY name ASC`
  );
  const [members] = await conn.query(
    `SELECT id, name FROM notification_groups ORDER BY name ASC`
  );
  let activeMemberGroups = [];
  try {
    const [activeMembers] = await conn.query(
      `SELECT id, name FROM notification_groups WHERE status = 'active' ORDER BY name ASC`
    );
    activeMemberGroups = (activeMembers || []).map((x) => ({ id: x.id, name: x.name || "" }));
  } catch (e) {
    if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
  }
  return {
    brand: brands.map((x) => ({ id: x.id, name: x.name || "" })),
    wallet: wallets.map((x) => ({ id: x.id, name: x.name || "" })),
    member: members.map((x) => ({ id: x.id, name: x.name || "" })),
    activeMemberGroups,
  };
}

function normalizeAudienceRows(rawRows) {
  const arr = Array.isArray(rawRows) ? rawRows : [];
  const out = [];
  for (const row of arr) {
    const band = toSafeBand(row?.band);
    const groupIdsRaw = Array.isArray(row?.groupIds) ? row.groupIds : [];
    const groupIds = [...new Set(groupIdsRaw.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
    if (!band || !groupIds.length) continue;
    out.push({ band, groupIds });
  }
  return out;
}

async function validateAudienceRows(conn, rows) {
  const children = await loadBandChildren(conn);
  for (const row of rows) {
    if (row.band === "member") {
      if (!row.groupIds.length) continue;
      const ph = row.groupIds.map(() => "?").join(",");
      const [activeRows] = await conn.query(
        `SELECT id FROM notification_groups WHERE status = 'active' AND id IN (${ph})`,
        row.groupIds
      );
      const ok = new Set((activeRows || []).map((x) => Number(x.id)));
      for (const gid of row.groupIds) {
        if (!ok.has(Number(gid))) {
          return `Invalid or inactive notification group id: ${gid}`;
        }
      }
      continue;
    }
    const validSet = new Set((children[row.band] || []).map((x) => Number(x.id)));
    for (const gid of row.groupIds) {
      if (!validSet.has(Number(gid))) {
        return `Invalid ${row.band} group id: ${gid}`;
      }
    }
  }
  return "";
}

exports.getAdminAnnouncementFilterOptions = async (req, res) => {
  try {
    const children = await loadBandChildren(pool);
    return res.json({
      bandOptions: [
        { value: "brand", label: "Brand" },
        { value: "wallet", label: "Wallet" },
        { value: "member", label: "Member" },
      ],
      statusOptions: [
        { value: "scheduled", label: "Scheduled" },
        { value: "sent", label: "Sent" },
      ],
      childrenByBand: {
        brand: children.brand,
        wallet: children.wallet,
        member: children.member,
      },
      activeMemberGroups: children.activeMemberGroups || [],
      timezones: [
        { value: "Asia/Karachi", label: "PKT (Asia/Karachi)" },
        { value: "UTC", label: "UTC" },
      ],
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Announcements dependencies are missing. Run database/migration_announcements.sql",
      });
    }
    console.error("[announcements/options]", e);
    return res.status(500).json({ message: "Failed to load announcement filter options." });
  }
};

/**
 * POST /api/admin/announcements/member-count-preview
 * Body: { groupIds: number[], excludeUserIds?: number[], includeUserIds?: number[] }
 * Returns distinct client user count: union of group members and optional extra users, minus excludes.
 */
exports.postAdminAnnouncementMemberCountPreview = async (req, res) => {
  try {
    const groupIds = [
      ...new Set(
        Array.isArray(req.body?.groupIds)
          ? req.body.groupIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : []
      ),
    ];
    const excludeUserIds = [
      ...new Set(
        Array.isArray(req.body?.excludeUserIds)
          ? req.body.excludeUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : []
      ),
    ];
    const includeUserIds = [
      ...new Set(
        Array.isArray(req.body?.includeUserIds)
          ? req.body.includeUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : []
      ),
    ];

    if (!groupIds.length && !includeUserIds.length) {
      return res.json({ count: 0 });
    }

    const params = [];
    const unionParts = [];
    if (groupIds.length) {
      const ph = groupIds.map(() => "?").join(",");
      const [activeRows] = await pool.query(
        `SELECT id FROM notification_groups WHERE status = 'active' AND id IN (${ph})`,
        groupIds
      );
      if ((activeRows || []).length !== groupIds.length) {
        return res.status(400).json({ message: "One or more groups are missing or inactive." });
      }
      unionParts.push(`
        SELECT DISTINCT ngm.user_id AS user_id
        FROM notification_group_members ngm
        INNER JOIN users u ON u.id = ngm.user_id
        INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
        WHERE ngm.group_id IN (${ph})
      `);
      params.push(...groupIds);
    }
    if (includeUserIds.length) {
      const incPh = includeUserIds.map(() => "?").join(",");
      unionParts.push(`
        SELECT u.id AS user_id
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id AND r.name = 'client'
        WHERE u.id IN (${incPh})
      `);
      params.push(...includeUserIds);
    }
    const unionSql = unionParts.join("\nUNION\n");
    let sql = `SELECT COUNT(DISTINCT x.user_id) AS c FROM (${unionSql}) AS x WHERE 1=1`;
    if (excludeUserIds.length) {
      const exPh = excludeUserIds.map(() => "?").join(",");
      sql += ` AND x.user_id NOT IN (${exPh})`;
      params.push(...excludeUserIds);
    }

    const [[row]] = await pool.query(sql, params);
    return res.json({ count: Number(row?.c || 0) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Required tables are missing.", count: 0 });
    }
    console.error("[announcements/member-count-preview]", e);
    return res.status(500).json({ message: "Failed to preview member count." });
  }
};

exports.getAdminAnnouncements = async (req, res) => {
  try {
    await refreshDueAnnouncements(pool);
    const id = String(req.query.id || "").trim();
    const username = String(req.query.username || "").trim().toLowerCase();
    const band = toSafeBand(req.query.band);
    const groupId = req.query.groupId ? Number(req.query.groupId) : null;
    const statusRaw = String(req.query.status || "").trim().toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);

    const where = [];
    const params = [];
    if (id) {
      where.push("a.public_id LIKE ?");
      params.push(`%${id}%`);
    }
    if (statusRaw === ANN_STATUS.SCHEDULED || statusRaw === ANN_STATUS.SENT) {
      where.push("a.status = ?");
      params.push(statusRaw);
    }
    if (band && Number.isInteger(groupId) && groupId > 0) {
      where.push(
        "EXISTS (SELECT 1 FROM announcement_audience_rows aar WHERE aar.announcement_id = a.id AND aar.band = ? AND aar.group_id = ?)"
      );
      params.push(band, groupId);
    }
    if (username) {
      where.push(
        "EXISTS (SELECT 1 FROM announcement_recipients ar INNER JOIN users u ON u.id = ar.user_id WHERE ar.announcement_id = a.id AND LOWER(u.username) LIKE ?)"
      );
      params.push(`%${username}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM announcements a ${whereSql}`,
      params
    );
    const total = Number(countRow?.total || 0);
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.public_id,
        a.title,
        a.status,
        a.sent_at,
        a.scheduled_at_utc,
        a.created_at,
        a.audience_count,
        (
          SELECT COUNT(*)
          FROM announcement_reads ar2
          WHERE ar2.announcement_id = a.id
        ) AS seen_count
      FROM announcements a
      ${whereSql}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );
    const items = rows.map((r) => ({
      id: r.public_id,
      dbId: r.id,
      title: r.title || "",
      audienceCount: Number(r.audience_count || 0),
      seenByCount: Number(r.seen_count || 0),
      status: r.status === ANN_STATUS.SCHEDULED ? "Scheduled" : "Sent",
      statusRaw: r.status,
      sentAt: r.sent_at,
      scheduledAtUtc: r.scheduled_at_utc,
      createdAt: r.created_at,
    }));
    return res.json({ items, total, page, pageSize });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Announcements table is missing. Run database/migration_announcements.sql",
        items: [],
        total: 0,
      });
    }
    console.error("[announcements/list]", e);
    return res.status(500).json({ message: "Failed to load announcements." });
  }
};

exports.getAdminAnnouncementById = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const [[a]] = await pool.query(
      `
      SELECT id, public_id, title, body_markdown, audience_mode, status, timezone, scheduled_at_utc, sent_at, audience_count, created_at
      FROM announcements
      WHERE public_id = ?
      LIMIT 1
      `,
      [id]
    );
    if (!a) return res.status(404).json({ message: "Announcement not found." });
    const [rows] = await pool.query(
      `SELECT band, group_id FROM announcement_audience_rows WHERE announcement_id = ? ORDER BY id ASC`,
      [a.id]
    );
    const grouped = [];
    const keyed = new Map();
    for (const r of rows) {
      const b = toSafeBand(r.band);
      if (!b) continue;
      const key = b;
      if (!keyed.has(key)) {
        const entry = { band: b, groupIds: [] };
        keyed.set(key, entry);
        grouped.push(entry);
      }
      keyed.get(key).groupIds.push(Number(r.group_id));
    }
    const [images] = await pool.query(
      `SELECT path, sort_order FROM announcement_images WHERE announcement_id = ? ORDER BY sort_order ASC, id ASC`,
      [a.id]
    );
    const [excluded] = await pool.query(
      `
      SELECT u.id AS userId, u.username
      FROM announcement_excluded_users ex
      INNER JOIN users u ON u.id = ex.user_id
      WHERE ex.announcement_id = ?
      ORDER BY u.username ASC
      `,
      [a.id]
    );
    return res.json({
      item: {
        id: a.public_id,
        title: a.title || "",
        bodyMarkdown: a.body_markdown || "",
        audienceMode: a.audience_mode,
        statusRaw: a.status,
        timezone: a.timezone || "Asia/Karachi",
        scheduledAtUtc: a.scheduled_at_utc,
        sentAt: a.sent_at,
        audienceCount: Number(a.audience_count || 0),
        createdAt: a.created_at,
        audienceRows: grouped,
        excludeUsers: excluded.map((x) => ({ userId: x.userId, username: x.username || "" })),
        imagePaths: images.map((x) => x.path),
      },
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Announcements table is missing. Run database/migration_announcements.sql",
      });
    }
    console.error("[announcements/get]", e);
    return res.status(500).json({ message: "Failed to load announcement." });
  }
};

exports.createAdminAnnouncement = async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const bodyMarkdown = String(req.body?.messageMarkdown || "").trim();
  const audienceModeRaw = String(req.body?.audienceMode || "all").toLowerCase();
  const audienceMode = audienceModeRaw === "custom" ? "custom" : "all";
  const timezone = String(req.body?.timezone || "Asia/Karachi").trim() || "Asia/Karachi";
  const scheduledAtIso = req.body?.scheduledAt || null;
  const audienceRows = normalizeAudienceRows(req.body?.audienceRows);
  const excludedIds = Array.isArray(req.body?.excludeUserIds)
    ? [...new Set(req.body.excludeUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))]
    : [];
  const includedIds = Array.isArray(req.body?.includeUserIds)
    ? [...new Set(req.body.includeUserIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))]
    : [];
  const imagePathsRaw = Array.isArray(req.body?.imagePaths) ? req.body.imagePaths : [];
  const imagePaths = imagePathsRaw
    .map((x) => String(x || "").trim())
    .filter((x) => x.startsWith("/uploads/announcements/"))
    .slice(0, 10);

  if (!title) return res.status(400).json({ message: "Title is required." });
  if (!bodyMarkdown) return res.status(400).json({ message: "Message is required." });
  if (toWordCount(bodyMarkdown) > 300) {
    return res.status(400).json({ message: "Message exceeds 300 word limit." });
  }
  if (imagePaths.length > 10) {
    return res.status(400).json({ message: "Maximum 10 images allowed." });
  }
  if (imagePaths.length) {
    const uploadsDir = path.join(__dirname, "..", "..", "uploads", "announcements");
    let totalBytes = 0;
    for (const webPath of imagePaths) {
      const rel = webPath.startsWith("/uploads/announcements/")
        ? webPath.slice("/uploads/announcements/".length)
        : "";
      if (!rel || rel.includes("..") || rel.includes("/") || rel.includes("\\")) {
        return res.status(400).json({ message: "Invalid announcement image path." });
      }
      const diskPath = path.join(uploadsDir, rel);
      let st;
      try {
        st = fs.statSync(diskPath);
      } catch (_) {
        return res.status(400).json({
          message: "One or more images were not found. Re-upload and try again.",
        });
      }
      if (!st.isFile()) {
        return res.status(400).json({ message: "Invalid announcement image file." });
      }
      if (st.size > ANNOUNCEMENT_IMAGE_MAX_FILE_BYTES) {
        return res.status(400).json({ message: "Each image must be 2.5MB or smaller." });
      }
      totalBytes += st.size;
      if (totalBytes > ANNOUNCEMENT_IMAGE_MAX_TOTAL_BYTES) {
        return res.status(400).json({ message: "Total image size cannot exceed 25MB." });
      }
    }
  }
  if (audienceMode === "custom" && audienceRows.length === 0 && includedIds.length === 0) {
    return res.status(400).json({
      message: "Select at least one group or include at least one user.",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await refreshDueAnnouncements(conn);

    const idCheck = [...new Set([...excludedIds, ...includedIds])];
    if (!(await assertClientUsers(conn, idCheck))) {
      await conn.rollback();
      return res.status(400).json({
        message: "Excluded and selected users must be existing client accounts.",
      });
    }

    const audienceErr = await validateAudienceRows(conn, audienceRows);
    if (audienceErr) {
      await conn.rollback();
      return res.status(400).json({ message: audienceErr });
    }

    let recipientsSet = new Set();
    if (audienceMode === "all") {
      const allClientIds = await getAllClientUserIds(conn);
      recipientsSet = new Set(allClientIds);
    } else {
      for (const row of audienceRows) {
        for (const gid of row.groupIds) {
          const ids = await listClientsByBandAndGroup(conn, row.band, gid);
          ids.forEach((id) => recipientsSet.add(id));
        }
      }
    }
    includedIds.forEach((id) => recipientsSet.add(id));
    excludedIds.forEach((id) => recipientsSet.delete(id));
    const recipients = [...recipientsSet];

    const scheduledAtUtc = toUtcDateInput(scheduledAtIso);
    const nowMs = Date.now();
    const scheduledMs = scheduledAtUtc ? new Date(`${scheduledAtUtc}Z`).getTime() : NaN;
    const shouldSchedule = Number.isFinite(scheduledMs) && scheduledMs > nowMs;
    const status = shouldSchedule ? ANN_STATUS.SCHEDULED : ANN_STATUS.SENT;
    const sentAt = shouldSchedule ? null : toUtcDateInput(new Date().toISOString());

    const publicId = await allocateGeneralEntryTransactionNumber(
      conn,
      GE_TXN_SERIES.ANNOUNCEMENT
    );
    const [ins] = await conn.query(
      `
      INSERT INTO announcements
      (public_id, title, body_markdown, audience_mode, status, timezone, scheduled_at_utc, sent_at, audience_count, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        publicId,
        title,
        bodyMarkdown,
        audienceMode,
        status,
        timezone,
        shouldSchedule ? scheduledAtUtc : null,
        sentAt,
        recipients.length,
        req.authUser?.id || null,
      ]
    );
    const annId = ins.insertId;

    for (const row of audienceRows) {
      for (const gid of row.groupIds) {
        await conn.query(
          `INSERT INTO announcement_audience_rows (announcement_id, band, group_id) VALUES (?, ?, ?)`,
          [annId, row.band, gid]
        );
      }
    }
    for (const uid of excludedIds) {
      await conn.query(
        `INSERT INTO announcement_excluded_users (announcement_id, user_id) VALUES (?, ?)`,
        [annId, uid]
      );
    }
    for (let i = 0; i < imagePaths.length; i += 1) {
      await conn.query(
        `
        INSERT INTO announcement_images (announcement_id, sort_order, path, original_name, mime, size_bytes)
        VALUES (?, ?, ?, NULL, NULL, NULL)
        `,
        [annId, i + 1, imagePaths[i]]
      );
    }
    for (const uid of recipients) {
      await conn.query(
        `INSERT INTO announcement_recipients (announcement_id, user_id) VALUES (?, ?)`,
        [annId, uid]
      );
    }

    await conn.commit();
    return res.status(201).json({
      item: {
        id: publicId,
        audienceCount: recipients.length,
        statusRaw: status,
      },
    });
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Announcements table is missing. Run database/migration_announcements.sql",
      });
    }
    console.error("[announcements/create]", e);
    return res.status(500).json({ message: "Failed to create announcement." });
  } finally {
    conn.release();
  }
};

exports.deleteAdminAnnouncement = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const [del] = await pool.query(`DELETE FROM announcements WHERE public_id = ?`, [id]);
    if (!del.affectedRows) return res.status(404).json({ message: "Announcement not found." });
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Announcements table is missing. Run database/migration_announcements.sql",
      });
    }
    console.error("[announcements/delete]", e);
    return res.status(500).json({ message: "Failed to delete announcement." });
  }
};

exports.getAdminAnnouncementAudience = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const [[a]] = await pool.query(
      `SELECT id FROM announcements WHERE public_id = ? LIMIT 1`,
      [id]
    );
    if (!a) return res.status(404).json({ message: "Announcement not found." });
    const [bands] = await pool.query(
      `
      SELECT band, group_id
      FROM announcement_audience_rows
      WHERE announcement_id = ?
      ORDER BY id ASC
      `,
      [a.id]
    );
    const children = await loadBandChildren(pool);
    const byBandName = {
      brand: new Map((children.brand || []).map((x) => [Number(x.id), x.name || ""])),
      wallet: new Map((children.wallet || []).map((x) => [Number(x.id), x.name || ""])),
      member: new Map((children.member || []).map((x) => [Number(x.id), x.name || ""])),
    };
    const [users] = await pool.query(
      `
      SELECT u.id AS userId, u.username
      FROM announcement_recipients ar
      INNER JOIN users u ON u.id = ar.user_id
      WHERE ar.announcement_id = ?
      ORDER BY u.username ASC
      `,
      [a.id]
    );
    return res.json({
      bands: bands.map((x) => ({
        band: x.band,
        groupId: Number(x.group_id),
        groupName:
          byBandName[x.band]?.get(Number(x.group_id)) || `#${Number(x.group_id)}`,
      })),
      users: users.map((x) => ({ userId: x.userId, username: x.username || "" })),
    });
  } catch (e) {
    console.error("[announcements/audience]", e);
    return res.status(500).json({ message: "Failed to load audience details." });
  }
};

exports.getAdminAnnouncementSeenBy = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const [[a]] = await pool.query(
      `SELECT id FROM announcements WHERE public_id = ? LIMIT 1`,
      [id]
    );
    if (!a) return res.status(404).json({ message: "Announcement not found." });
    const [users] = await pool.query(
      `
      SELECT u.id AS userId, u.username, ar.read_at AS readAt
      FROM announcement_reads ar
      INNER JOIN users u ON u.id = ar.user_id
      WHERE ar.announcement_id = ?
      ORDER BY ar.read_at DESC
      `,
      [a.id]
    );
    return res.json({
      users: users.map((x) => ({
        userId: x.userId,
        username: x.username || "",
        readAt: x.readAt,
      })),
    });
  } catch (e) {
    console.error("[announcements/seen]", e);
    return res.status(500).json({ message: "Failed to load seen-by users." });
  }
};

exports.getClientAnnouncementUnreadCount = async (req, res) => {
  try {
    await refreshDueAnnouncements(pool);
    const userId = Number(req.user?.userId || 0);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const [[row]] = await pool.query(
      `
      SELECT COUNT(*) AS cnt
      FROM announcement_recipients rc
      INNER JOIN announcements a ON a.id = rc.announcement_id
      LEFT JOIN announcement_reads rd ON rd.announcement_id = a.id AND rd.user_id = rc.user_id
      WHERE rc.user_id = ?
        AND a.status = 'sent'
        AND rd.user_id IS NULL
      `,
      [userId]
    );
    return res.json({ count: Number(row?.cnt || 0) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json({ count: 0 });
    console.error("[client/announcements/unread-count]", e);
    return res.status(500).json({ error: "Failed to load unread count." });
  }
};

exports.getClientAnnouncements = async (req, res) => {
  try {
    await refreshDueAnnouncements(pool);
    const userId = Number(req.user?.userId || 0);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const [rows] = await pool.query(
      `
      SELECT
        a.public_id AS id,
        a.title,
        a.body_markdown AS bodyMarkdown,
        a.sent_at AS createdAt,
        CASE WHEN rd.user_id IS NULL THEN 0 ELSE 1 END AS isRead
      FROM announcement_recipients rc
      INNER JOIN announcements a ON a.id = rc.announcement_id
      LEFT JOIN announcement_reads rd ON rd.announcement_id = a.id AND rd.user_id = rc.user_id
      WHERE rc.user_id = ?
        AND a.status = 'sent'
      ORDER BY COALESCE(a.sent_at, a.created_at) DESC, a.id DESC
      `,
      [userId]
    );
    const ids = rows.map((r) => r.id).filter(Boolean);
    let imageMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [imgRows] = await pool.query(
        `
        SELECT a.public_id AS id, ai.path
        FROM announcement_images ai
        INNER JOIN announcements a ON a.id = ai.announcement_id
        WHERE a.public_id IN (${placeholders})
        ORDER BY ai.sort_order ASC, ai.id ASC
        `,
        ids
      );
      imageMap = imgRows.reduce((acc, row) => {
        const k = row.id;
        if (!acc.has(k)) acc.set(k, []);
        acc.get(k).push(row.path);
        return acc;
      }, new Map());
    }
    return res.json({
      items: rows.map((r) => ({
        id: r.id,
        type: "announcement",
        title: r.title || "",
        body: r.bodyMarkdown || "",
        createdAt: r.createdAt,
        isRead: !!Number(r.isRead || 0),
        imagePaths: imageMap.get(r.id) || [],
      })),
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json({ items: [] });
    console.error("[client/announcements]", e);
    return res.status(500).json({ error: "Failed to load announcements." });
  }
};

exports.markClientAnnouncementRead = async (req, res) => {
  try {
    const userId = Number(req.user?.userId || 0);
    const publicId = String(req.params.id || "").trim();
    if (!userId || !publicId) return res.status(400).json({ error: "Invalid request." });
    const [[a]] = await pool.query(`SELECT id FROM announcements WHERE public_id = ? LIMIT 1`, [
      publicId,
    ]);
    if (!a) return res.status(404).json({ error: "Announcement not found." });

    const [[isRecipient]] = await pool.query(
      `SELECT 1 AS ok FROM announcement_recipients WHERE announcement_id = ? AND user_id = ? LIMIT 1`,
      [a.id, userId]
    );
    if (!isRecipient) return res.status(403).json({ error: "Forbidden" });

    await pool.query(
      `
      INSERT INTO announcement_reads (announcement_id, user_id, read_at)
      VALUES (?, ?, UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)
      `,
      [a.id, userId]
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error("[client/announcements/read]", e);
    return res.status(500).json({ error: "Failed to mark announcement as read." });
  }
};
