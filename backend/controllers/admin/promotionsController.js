const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/database");
const { UPLOADS_PROMOTIONS } = require("../../middleware/uploadPromotionsImage");

const STATUS_SET = new Set(["draft", "scheduled", "active", "ended"]);
const KARACHI_TIMEZONE = "Asia/Karachi";

/** Wall-clock in Asia/Karachi for a given Date (for DATETIME string compare with DB values). */
function dateToKarachiSql(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: KARACHI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const obj = {};
  for (const p of parts) obj[p.type] = p.value;
  return `${obj.year}-${obj.month}-${obj.day} ${obj.hour}:${obj.minute}:${obj.second}`;
}

function nowKarachiSql() {
  return dateToKarachiSql(new Date());
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function parseBool(value, fallback = false) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (value == null) return fallback;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "no" || s === "off") return false;
  return fallback;
}

function normalizeStatus(value, fallback = "draft") {
  const s = String(value || "").trim().toLowerCase();
  return STATUS_SET.has(s) ? s : fallback;
}

/**
 * Base status from schedule only (both dates set or both empty).
 * @returns {string|null} null if schedule pair is invalid (only one date set)
 */
function computeStatusFromSchedule(startsAt, endsAt, now = nowKarachiSql()) {
  const sStart = normalizePromoWallDatetime(startsAt);
  const sEnd = normalizePromoWallDatetime(endsAt);
  const sNow = typeof now === "string" ? normalizeDateTime(now) || now : normalizePromoWallDatetime(now) || nowKarachiSql();
  const hasStart = sStart != null && sStart !== "";
  const hasEnd = sEnd != null && sEnd !== "";
  if (hasStart !== hasEnd) return null;
  if (!hasStart && !hasEnd) return "draft";
  if (sEnd <= sNow) return "ended";
  if (sStart > sNow) return "scheduled";
  return "active";
}

function validateSchedulePair(startsAt, endsAt) {
  const sStart = normalizePromoWallDatetime(startsAt);
  const sEnd = normalizePromoWallDatetime(endsAt);
  const hasStart = sStart != null && sStart !== "";
  const hasEnd = sEnd != null && sEnd !== "";
  if (hasStart !== hasEnd) {
    return "Start and end must both be set, or both left empty.";
  }
  if (hasStart && hasEnd && sStart > sEnd) {
    return "Start cannot be after end.";
  }
  return null;
}

function normalizeDateTime(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim().replace("T", " ").slice(0, 19);
  if (!/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(s)) return null;
  return s.length === 16 ? `${s}:00` : s;
}

/** mysql2 returns DATETIME as Date — Date vs string comparisons break; normalize to YYYY-MM-DD HH:mm:ss */
function normalizePromoWallDatetime(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return normalizeDateTime(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  return normalizeDateTime(value);
}

/** Accept ISO (announcements-style) or naive YYYY-MM-DD HH:mm:ss; store Karachi wall in DB. */
function normalizeIncomingScheduleValue(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) || s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return dateToKarachiSql(d);
  }
  return normalizeDateTime(s);
}

function looksExternalLink(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(String(ip)).digest("hex");
}

function uniquePromoFilename(ext) {
  const hex = crypto.randomBytes(6).toString("hex");
  return `promo-${Date.now()}-${hex}${ext}`;
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m === "image/jpeg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  if (m === "image/avif") return ".avif";
  return null;
}

function savePromotionImage(file) {
  const ext = extFromMime(file?.mimetype);
  if (!ext || !file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { error: "Invalid image file." };
  }
  const base = uniquePromoFilename(ext);
  const full = path.join(UPLOADS_PROMOTIONS, base);
  try {
    fs.mkdirSync(UPLOADS_PROMOTIONS, { recursive: true });
    fs.writeFileSync(full, file.buffer);
  } catch (e) {
    console.error("savePromotionImage error:", e.message);
    return { error: "Failed to save image." };
  }
  return { imageUrl: `/uploads/promotions/${base}` };
}

function deletePromotionImage(storedPath) {
  if (!storedPath || typeof storedPath !== "string" || !storedPath.startsWith("/uploads/promotions/")) return;
  const base = path.basename(storedPath);
  if (!base || base.includes(path.sep) || base.startsWith("..")) return;
  const full = path.join(UPLOADS_PROMOTIONS, base);
  const rel = path.relative(UPLOADS_PROMOTIONS, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.error("deletePromotionImage error:", e.message);
  }
}

function mapPromotionRow(r) {
  const startsAt = normalizePromoWallDatetime(r.starts_at);
  const endsAt = normalizePromoWallDatetime(r.ends_at);
  const now = nowKarachiSql();
  const computedStatus = computeStatusFromSchedule(startsAt, endsAt, now);
  const storedStatus = normalizeStatus(r.status, "draft");
  const status = computedStatus || storedStatus;
  const isPaused = !!Number(r.is_paused);
  const isArchived = !!Number(r.is_archived);
  const isVisibleOnClient =
    status === "active" &&
    !isPaused &&
    !isArchived &&
    startsAt &&
    endsAt &&
    startsAt <= now &&
    endsAt > now;

  return {
    id: r.id,
    title: r.title || "",
    description: r.description || "",
    tag: r.tag || "",
    imageUrl: r.image_url || "",
    buttonLabel: r.button_label || "Read More",
    ctaLink: r.cta_link || "",
    ctaMode: normalizeCtaMode(r.cta_mode),
    detailsMarkdown: r.details_markdown != null ? String(r.details_markdown) : "",
    openInNewTab: !!r.open_in_new_tab,
    placement: r.placement || "home_rail",
    sortOrder: Number(r.sort_order || 0),
    status,
    storedStatus,
    isPaused,
    isArchived,
    isVisibleOnClient,
    startsAt,
    endsAt,
    locale: r.locale || "en",
    createdByAdminId: r.created_by_admin_id != null ? Number(r.created_by_admin_id) : null,
    updatedByAdminId: r.updated_by_admin_id != null ? Number(r.updated_by_admin_id) : null,
    archivedAt: r.archived_at || null,
    createdAt: r.created_at || null,
    updatedAt: r.updated_at || null,
    clickCount: r.clickCount != null ? Number(r.clickCount) : undefined,
    clickCount7d: r.clickCount7d != null ? Number(r.clickCount7d) : undefined,
  };
}

function normalizeCtaMode(value) {
  const s = String(value || "").trim().toLowerCase();
  return s === "popup" ? "popup" : "link";
}

function validatePromotionInput(data, { isCreate = false } = {}) {
  const errors = [];
  if (isCreate && !data.title) errors.push("Title is required.");
  if (isCreate && !data.description) errors.push("Description is required.");
  const ctaMode = normalizeCtaMode(data.ctaMode);
  if (ctaMode === "link") {
    if (isCreate && !String(data.ctaLink || "").trim()) errors.push("CTA link is required.");
    if (!isCreate && data.ctaLink !== undefined && !String(data.ctaLink || "").trim()) {
      errors.push("CTA link cannot be empty.");
    }
  } else {
    const md = String(data.detailsMarkdown ?? "").trim();
    if (isCreate && !md) errors.push("Details content is required for Details Popup.");
    if (!isCreate && data.detailsMarkdown !== undefined && !md) {
      errors.push("Details content cannot be empty when using Details Popup.");
    }
  }
  const scheduleErr = validateSchedulePair(data.startsAt, data.endsAt);
  if (scheduleErr) errors.push(scheduleErr);
  return errors;
}

function readAuthUserId(req) {
  const fromAdmin = req?.authUser?.id;
  if (fromAdmin != null) return Number(fromAdmin) || null;
  return null;
}

function decodeOptionalClientUserId(authHeader) {
  const token = String(authHeader || "").split(" ")[1];
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret);
    if (decoded?.role !== "client") return null;
    const id = Number(decoded?.userId || decoded?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Job tick: recompute stored status from schedule (Asia/Karachi wall DATETIME strings).
 */
async function runPromotionStatusTransitions() {
  const now = nowKarachiSql();
  try {
    const [toEnded] = await pool.query(
      `UPDATE promotions
       SET status = 'ended', updated_at = NOW()
       WHERE starts_at IS NOT NULL
         AND ends_at IS NOT NULL
         AND ends_at <= ?`,
      [now]
    );
    const [toScheduled] = await pool.query(
      `UPDATE promotions
       SET status = 'scheduled', updated_at = NOW()
       WHERE starts_at IS NOT NULL
         AND ends_at IS NOT NULL
         AND starts_at > ?
         AND ends_at > ?
         AND status <> 'ended'`,
      [now, now]
    );
    const [toActive] = await pool.query(
      `UPDATE promotions
       SET status = 'active', updated_at = NOW()
       WHERE starts_at IS NOT NULL
         AND ends_at IS NOT NULL
         AND starts_at <= ?
         AND ends_at > ?`,
      [now, now]
    );
    const [toDraft] = await pool.query(
      `UPDATE promotions
       SET status = 'draft', updated_at = NOW()
       WHERE starts_at IS NULL AND ends_at IS NULL`
    );
    return {
      ended: Number(toEnded?.affectedRows || 0),
      scheduled: Number(toScheduled?.affectedRows || 0),
      activated: Number(toActive?.affectedRows || 0),
      draft: Number(toDraft?.affectedRows || 0),
    };
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return { ended: 0, scheduled: 0, activated: 0, draft: 0, skipped: true };
    }
    throw err;
  }
}

exports.runPromotionStatusTransitions = runPromotionStatusTransitions;

/**
 * GET /api/admin/promotions
 */
exports.getAdminPromotions = async (req, res) => {
  try {
    await runPromotionStatusTransitions();

    const q = String(req.query.q || "").trim();
    const status = normalizeStatus(req.query.status, "");
    const placement = String(req.query.placement || "").trim();
    const dateFrom = normalizeDateTime(req.query.dateFrom);
    const dateTo = normalizeDateTime(req.query.dateTo);
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = Math.min(normalizePositiveInt(req.query.pageSize, 25), 100);
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (q) {
      where.push("(p.title LIKE ? OR p.tag LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (status && STATUS_SET.has(status)) {
      where.push("p.status = ?");
      params.push(status);
    }
    if (placement) {
      where.push("p.placement = ?");
      params.push(placement);
    }
    if (dateFrom) {
      where.push("p.created_at >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("p.created_at <= ?");
      params.push(dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total FROM promotions p ${whereSql}`,
      params
    );
    const total = Number(count?.total || 0);

    const [rows] = await pool.query(
      `SELECT
          p.*,
          (SELECT COUNT(*) FROM promotion_click_events e WHERE e.promotion_id = p.id) AS clickCount,
          (SELECT COUNT(*) FROM promotion_click_events e WHERE e.promotion_id = p.id AND e.clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS clickCount7d
       FROM promotions p
       ${whereSql}
       ORDER BY p.sort_order ASC, p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return res.status(200).json({
      items: (rows || []).map(mapPromotionRow),
      total,
      page,
      pageSize,
      nowKarachi: nowKarachiSql(),
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(200).json({ items: [], total: 0, page: 1, pageSize: 25 });
    }
    console.error("getAdminPromotions error:", err);
    return res.status(500).json({ message: "Failed to load promotions." });
  }
};

/**
 * GET /api/admin/promotions/click-summary?promotionId=&dateFrom=&dateTo=
 * Groups by calendar day (server/MySQL date of clicked_at) and source.
 */
exports.getAdminPromotionClickSummary = async (req, res) => {
  try {
    const promotionId = normalizePositiveInt(req.query.promotionId, 0) || 0;
    const dateFrom = normalizeDateTime(req.query.dateFrom);
    const dateTo = normalizeDateTime(req.query.dateTo);

    const where = ["1=1"];
    const params = [];
    if (promotionId) {
      where.push("e.promotion_id = ?");
      params.push(promotionId);
    }
    if (dateFrom) {
      where.push("e.clicked_at >= ?");
      params.push(dateFrom);
    } else {
      where.push("e.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    }
    if (dateTo) {
      where.push("e.clicked_at <= ?");
      params.push(dateTo);
    }

    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(CONVERT_TZ(e.clicked_at, '+00:00', '+05:00'), '%Y-%m-%d') AS \`day\`,
         e.source,
         COUNT(*) AS clickCount
       FROM promotion_click_events e
       WHERE ${where.join(" AND ")}
       GROUP BY DATE_FORMAT(CONVERT_TZ(e.clicked_at, '+00:00', '+05:00'), '%Y-%m-%d'), e.source
       ORDER BY \`day\` DESC, e.source ASC
       LIMIT 500`,
      params
    );

    const items = (rows || []).map((r) => ({
      day:
        r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day).slice(0, 10),
      source: String(r.source || "unknown"),
      clickCount: Number(r.clickCount || 0),
    }));

    return res.status(200).json({ items });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(200).json({ items: [] });
    }
    console.error("getAdminPromotionClickSummary error:", err);
    return res.status(500).json({ message: "Failed to load click summary." });
  }
};

/**
 * POST /api/admin/promotions
 */
exports.createAdminPromotion = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const tag = String(req.body?.tag || "").trim();
    const buttonLabel = String(req.body?.buttonLabel || "Read More").trim() || "Read More";
    const openInNewTab = parseBool(req.body?.openInNewTab, false) ? 1 : 0;
    const ctaMode = normalizeCtaMode(req.body?.ctaMode);
    const detailsMarkdown = String(req.body?.detailsMarkdown ?? "").trim();
    let ctaLink = String(req.body?.ctaLink || "").trim();
    if (ctaMode === "popup") {
      ctaLink = "#";
    }
    const placement = String(req.body?.placement || "home_rail").trim() || "home_rail";
    const sortOrder = normalizeInt(req.body?.sortOrder, 0);
    const startsAt = normalizeIncomingScheduleValue(req.body?.startsAt);
    const endsAt = normalizeIncomingScheduleValue(req.body?.endsAt);
    const locale = String(req.body?.locale || "en").trim() || "en";
    const adminId = readAuthUserId(req);
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Image is required." });
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }
    const errs = validatePromotionInput(
      { title, description, ctaLink, ctaMode, detailsMarkdown, startsAt, endsAt },
      { isCreate: true }
    );
    if (errs.length) return res.status(400).json({ message: errs[0] });

    const status = computeStatusFromSchedule(startsAt, endsAt);
    if (!status) return res.status(400).json({ message: "Invalid schedule." });

    const saved = savePromotionImage(file);
    if (saved.error) return res.status(400).json({ message: saved.error });

    const [result] = await pool.query(
      `INSERT INTO promotions
        (title, description, tag, image_url, button_label, cta_link, open_in_new_tab, cta_mode, details_markdown, placement,
         sort_order, status, is_paused, is_archived, starts_at, ends_at, locale, created_by_admin_id, updated_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        tag || null,
        saved.imageUrl,
        buttonLabel,
        ctaLink,
        openInNewTab,
        ctaMode,
        ctaMode === "popup" ? detailsMarkdown || null : null,
        placement,
        sortOrder,
        status,
        startsAt,
        endsAt,
        locale,
        adminId,
        adminId,
      ]
    );
    const id = Number(result?.insertId || 0);
    if (!id) return res.status(500).json({ message: "Failed to create promotion." });

    const [rows] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [id]);
    return res.status(201).json({ item: mapPromotionRow(rows[0]) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "Promotions table missing. Run migration_promotions.sql." });
    }
    console.error("createAdminPromotion error:", err);
    return res.status(500).json({ message: "Failed to create promotion." });
  }
};

/**
 * PATCH /api/admin/promotions/:id
 */
exports.updateAdminPromotion = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [id]);
    if (!rows?.length) return res.status(404).json({ message: "Promotion not found." });
    const existing = rows[0];

    const title = req.body?.title !== undefined ? String(req.body.title || "").trim() : undefined;
    const description = req.body?.description !== undefined ? String(req.body.description || "").trim() : undefined;
    const tag = req.body?.tag !== undefined ? String(req.body.tag || "").trim() : undefined;
    const buttonLabel = req.body?.buttonLabel !== undefined ? String(req.body.buttonLabel || "").trim() : undefined;
    const ctaLink = req.body?.ctaLink !== undefined ? String(req.body.ctaLink || "").trim() : undefined;
    const openInNewTab = req.body?.openInNewTab !== undefined ? (parseBool(req.body.openInNewTab, false) ? 1 : 0) : undefined;
    const placement = req.body?.placement !== undefined ? String(req.body.placement || "").trim() : undefined;
    const sortOrder = req.body?.sortOrder !== undefined ? normalizeInt(req.body.sortOrder, 0) : undefined;
    const startsAt = req.body?.startsAt !== undefined ? normalizeIncomingScheduleValue(req.body.startsAt) : undefined;
    const endsAt = req.body?.endsAt !== undefined ? normalizeIncomingScheduleValue(req.body.endsAt) : undefined;
    const isPaused = req.body?.isPaused !== undefined ? (parseBool(req.body.isPaused, false) ? 1 : 0) : undefined;
    const isArchived = req.body?.isArchived !== undefined ? (parseBool(req.body.isArchived, false) ? 1 : 0) : undefined;
    const locale = req.body?.locale !== undefined ? String(req.body.locale || "").trim() : undefined;
    const adminId = readAuthUserId(req);

    if (req.body?.status !== undefined) {
      return res.status(400).json({ message: "Status is computed automatically from the schedule." });
    }

    const nextStartsAt = startsAt !== undefined ? startsAt : existing.starts_at;
    const nextEndsAt = endsAt !== undefined ? endsAt : existing.ends_at;

    const nextCtaMode =
      req.body?.ctaMode !== undefined ? normalizeCtaMode(req.body.ctaMode) : normalizeCtaMode(existing.cta_mode);
    const nextDetailsMd =
      req.body?.detailsMarkdown !== undefined
        ? String(req.body.detailsMarkdown).trim()
        : String((existing.details_markdown != null ? existing.details_markdown : "") || "").trim();
    let storedCtaLink =
      req.body?.ctaLink !== undefined ? String(req.body.ctaLink || "").trim() : String(existing.cta_link || "").trim();
    if (nextCtaMode === "popup") {
      storedCtaLink = "#";
    }

    const nextValidate = {
      title: title !== undefined ? title : existing.title,
      description: description !== undefined ? description : existing.description,
      ctaLink: storedCtaLink,
      ctaMode: nextCtaMode,
      detailsMarkdown:
        req.body?.detailsMarkdown !== undefined
          ? String(req.body.detailsMarkdown)
          : existing.details_markdown != null
            ? String(existing.details_markdown)
            : "",
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
    };
    const errs = validatePromotionInput(nextValidate, { isCreate: false });
    if (errs.length) return res.status(400).json({ message: errs[0] });

    const touchCta =
      req.body?.ctaMode !== undefined ||
      req.body?.ctaLink !== undefined ||
      req.body?.detailsMarkdown !== undefined;

    const nextStatus = computeStatusFromSchedule(nextStartsAt, nextEndsAt);
    if (!nextStatus) return res.status(400).json({ message: "Invalid schedule." });

    let nextImage = null;
    if (req.file) {
      const saved = savePromotionImage(req.file);
      if (saved.error) return res.status(400).json({ message: saved.error });
      nextImage = saved.imageUrl;
    }

    const updates = [];
    const params = [];
    if (title !== undefined) {
      if (!title) return res.status(400).json({ message: "Title cannot be empty." });
      updates.push("title = ?");
      params.push(title);
    }
    if (description !== undefined) {
      if (!description) return res.status(400).json({ message: "Description cannot be empty." });
      updates.push("description = ?");
      params.push(description);
    }
    if (tag !== undefined) {
      updates.push("tag = ?");
      params.push(tag || null);
    }
    if (buttonLabel !== undefined) {
      updates.push("button_label = ?");
      params.push(buttonLabel || "Read More");
    }
    if (touchCta) {
      updates.push("cta_mode = ?");
      params.push(nextCtaMode);
      updates.push("details_markdown = ?");
      params.push(nextCtaMode === "popup" ? nextDetailsMd || null : null);
      updates.push("cta_link = ?");
      params.push(storedCtaLink || "#");
    }
    if (openInNewTab !== undefined) {
      updates.push("open_in_new_tab = ?");
      params.push(openInNewTab);
    }
    if (placement !== undefined) {
      updates.push("placement = ?");
      params.push(placement || "home_rail");
    }
    if (sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }
    updates.push("status = ?");
    params.push(nextStatus);
    if (isPaused !== undefined) {
      updates.push("is_paused = ?");
      params.push(isPaused);
    }
    if (isArchived !== undefined) {
      updates.push("is_archived = ?");
      params.push(isArchived);
      if (isArchived === 1 && !existing.archived_at) {
        updates.push("archived_at = NOW()");
      }
      if (isArchived === 0) {
        updates.push("archived_at = NULL");
      }
    }
    if (startsAt !== undefined) {
      updates.push("starts_at = ?");
      params.push(startsAt);
    }
    if (endsAt !== undefined) {
      updates.push("ends_at = ?");
      params.push(endsAt);
    }
    if (locale !== undefined) {
      updates.push("locale = ?");
      params.push(locale || "en");
    }
    if (nextImage !== null) {
      updates.push("image_url = ?");
      params.push(nextImage);
    }
    updates.push("updated_by_admin_id = ?");
    params.push(adminId);

    if (updates.length === 1) {
      return res.status(200).json({ item: mapPromotionRow(existing) });
    }

    params.push(id);
    await pool.query(`UPDATE promotions SET ${updates.join(", ")} WHERE id = ?`, params);

    if (nextImage && existing.image_url && existing.image_url !== nextImage) {
      deletePromotionImage(existing.image_url);
    }

    const [latest] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [id]);
    return res.status(200).json({ item: mapPromotionRow(latest[0]) });
  } catch (err) {
    console.error("updateAdminPromotion error:", err);
    return res.status(500).json({ message: "Failed to update promotion." });
  }
};

/**
 * PATCH /api/admin/promotions/:id/flags  JSON { isPaused?, isArchived? }
 */
exports.patchAdminPromotionFlags = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [id]);
    if (!rows?.length) return res.status(404).json({ message: "Promotion not found." });
    const existing = rows[0];

    const isPaused = req.body?.isPaused !== undefined ? (parseBool(req.body.isPaused, false) ? 1 : 0) : undefined;
    const isArchived = req.body?.isArchived !== undefined ? (parseBool(req.body.isArchived, false) ? 1 : 0) : undefined;
    if (isPaused === undefined && isArchived === undefined) {
      return res.status(400).json({ message: "No flags to update." });
    }

    const adminId = readAuthUserId(req);
    const updates = ["updated_by_admin_id = ?"];
    const params = [adminId];

    if (isPaused !== undefined) {
      updates.push("is_paused = ?");
      params.push(isPaused);
    }
    if (isArchived !== undefined) {
      updates.push("is_archived = ?");
      params.push(isArchived);
      if (isArchived === 1 && !existing.archived_at) {
        updates.push("archived_at = NOW()");
      }
      if (isArchived === 0) {
        updates.push("archived_at = NULL");
      }
    }

    params.push(id);
    await pool.query(`UPDATE promotions SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, params);

    const [latest] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [id]);
    return res.status(200).json({ item: mapPromotionRow(latest[0]) });
  } catch (err) {
    console.error("patchAdminPromotionFlags error:", err);
    return res.status(500).json({ message: "Failed to update promotion flags." });
  }
};

exports.duplicateAdminPromotion = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });
    const adminId = readAuthUserId(req);

    const [rows] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [id]);
    if (!rows?.length) return res.status(404).json({ message: "Promotion not found." });
    const p = rows[0];

    const [[maxRow]] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) AS m FROM promotions");
    const nextSort = Number(maxRow?.m || 0) + 1;

    const [result] = await pool.query(
      `INSERT INTO promotions
        (title, description, tag, image_url, button_label, cta_link, open_in_new_tab, cta_mode, details_markdown, placement,
         sort_order, status, is_paused, is_archived, starts_at, ends_at, locale, created_by_admin_id, updated_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, NULL, NULL, ?, ?, ?)`,
      [
        `${p.title} (Copy)`,
        p.description,
        p.tag,
        p.image_url,
        p.button_label,
        p.cta_link,
        Number(p.open_in_new_tab) ? 1 : 0,
        normalizeCtaMode(p.cta_mode),
        p.details_markdown != null ? String(p.details_markdown) : null,
        p.placement || "home_rail",
        nextSort,
        p.locale || "en",
        adminId,
        adminId,
      ]
    );
    const newId = Number(result?.insertId || 0);
    const [latest] = await pool.query("SELECT * FROM promotions WHERE id = ? LIMIT 1", [newId]);
    return res.status(201).json({ item: mapPromotionRow(latest[0]) });
  } catch (err) {
    console.error("duplicateAdminPromotion error:", err);
    return res.status(500).json({ message: "Failed to duplicate promotion." });
  }
};

/**
 * GET /api/client/promotions?placement=home_rail
 */
exports.getClientPromotions = async (req, res) => {
  try {
    const placement = String(req.query.placement || "home_rail").trim() || "home_rail";
    const now = nowKarachiSql();
    await runPromotionStatusTransitions();

    const [rows] = await pool.query(
      `SELECT id, title, description, tag, image_url, button_label, cta_link, open_in_new_tab, cta_mode, details_markdown,
              placement, sort_order, status, starts_at, ends_at, locale
       FROM promotions
       WHERE placement = ?
         AND status = 'active'
         AND is_paused = 0
         AND is_archived = 0
         AND starts_at IS NOT NULL
         AND ends_at IS NOT NULL
         AND starts_at <= ?
         AND ends_at > ?
       ORDER BY sort_order ASC, id DESC`,
      [placement, now, now]
    );
    const items = (rows || []).map((r) => ({
      id: r.id,
      title: r.title || "",
      description: r.description || "",
      tag: r.tag || "",
      image: r.image_url || "",
      buttonLabel: r.button_label || "Read More",
      ctaLink: r.cta_link || "",
      ctaMode: normalizeCtaMode(r.cta_mode),
      detailsMarkdown: r.details_markdown != null ? String(r.details_markdown) : "",
      openInNewTab: !!r.open_in_new_tab,
      placement: r.placement || placement,
      sortOrder: Number(r.sort_order || 0),
      locale: r.locale || "en",
    }));
    return res.status(200).json({ items, nowKarachi: now });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ items: [] });
    console.error("getClientPromotions error:", err);
    return res.status(500).json({ message: "Failed to load promotions." });
  }
};

/**
 * POST /api/client/promotions/:id/click
 */
exports.logPromotionClick = async (req, res) => {
  try {
    const promotionId = normalizePositiveInt(req.params.id, 0);
    if (!promotionId) return res.status(400).json({ message: "Invalid promotion id." });

    const source = String(req.body?.source || req.query?.source || "unknown").trim().slice(0, 50) || "unknown";
    const sessionId = String(req.body?.sessionId || req.query?.sessionId || "").trim().slice(0, 128) || null;
    const authClientId = decodeOptionalClientUserId(req.headers.authorization);
    const bodyClientId = normalizePositiveInt(req.body?.clientUserId, 0);
    const clientUserId = authClientId || (bodyClientId || null);
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 255) || null;
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const remoteIp = forwarded || req.socket?.remoteAddress || "";
    const ipHash = remoteIp ? hashIp(remoteIp) : null;

    await pool.query(
      `INSERT INTO promotion_click_events
        (promotion_id, source, client_user_id, session_id, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [promotionId, source, clientUserId, sessionId, userAgent, ipHash]
    );
    return res.status(201).json({ message: "Logged." });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ message: "Skipped." });
    if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(404).json({ message: "Promotion not found." });
    console.error("logPromotionClick error:", err);
    return res.status(500).json({ message: "Failed to log click." });
  }
};
