const fs = require("fs");
const path = require("path");
const { pool } = require("../../config/database");
const { sanitizeSvg } = require("../../utils/svgSanitize");
const { optimizeSvg } = require("../../utils/svgOptimize");
const { generatePngFromSvg } = require("../../utils/svgToPng");
const { uniqueWalletIconFilename, UPLOADS_WALLETS } = require("../../middleware/uploadWalletIcon");

// Legacy: frontend assets (kept for backward compat when writing from iconSvg body)
const WALLETS_ASSETS_DIR = path.resolve(__dirname, "../../../frontend/src/assets/wallets");

function ensureWalletsAssetsDir() {
  try {
    fs.mkdirSync(WALLETS_ASSETS_DIR, { recursive: true });
    return true;
  } catch (e) {
    console.error("ensureWalletsAssetsDir:", e.message, "path:", WALLETS_ASSETS_DIR);
    return false;
  }
}

function writeSvgToAssets(id, svgContent) {
  if (!id || !svgContent || typeof svgContent !== "string") return null;
  if (!ensureWalletsAssetsDir()) return null;
  const filename = `${id}.svg`;
  const filepath = path.join(WALLETS_ASSETS_DIR, filename);
  try {
    fs.writeFileSync(filepath, svgContent, "utf8");
    return filename;
  } catch (e) {
    console.error("writeSvgToAssets error:", e.message, "filepath:", filepath);
    return null;
  }
}

function ensureUploadsWalletsDir() {
  try {
    fs.mkdirSync(UPLOADS_WALLETS, { recursive: true });
    return true;
  } catch (e) {
    console.error("ensureUploadsWalletsDir:", e.message);
    return false;
  }
}

/**
 * Process uploaded SVG buffer: sanitize, optimize, write SVG + PNG to backend/uploads/wallets.
 * @param {Buffer} buffer - Raw SVG file buffer
 * @param {string} baseName - Filename without path (e.g. "jazzcash-1234-abcd.svg")
 * @returns {{ iconPath: string } | { error: string }}
 */
function processUploadedIconBuffer(buffer, baseName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { error: "Empty icon file." };
  }
  const raw = buffer.toString("utf8");
  const sanitized = sanitizeSvg(raw);
  if (!sanitized.ok) {
    return { error: sanitized.error || "Invalid SVG." };
  }
  const optimized = optimizeSvg(sanitized.data);
  if (!ensureUploadsWalletsDir()) {
    return { error: "Failed to create uploads directory." };
  }
  const svgPath = path.join(UPLOADS_WALLETS, baseName);
  try {
    fs.writeFileSync(svgPath, optimized, "utf8");
  } catch (e) {
    console.error("processUploadedIconBuffer write SVG:", e.message);
    return { error: "Failed to save icon file." };
  }
  generatePngFromSvg(svgPath, Buffer.from(optimized, "utf8")).catch(() => {});
  return { iconPath: `/uploads/wallets/${baseName}` };
}

const SORT_COLUMN_MAP = {
  name: "name",
  forDP: "available_for_deposit",
  forWD: "available_for_withdraw",
  sortOrder: "sort_order",
};

function normalizeSortDir(value) {
  return String(value || "").toLowerCase() === "desc" ? "DESC" : "ASC";
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function slugifyWalletCompanyCode(value) {
  const raw = String(value || "").trim().toLowerCase();

  const slug = raw
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (slug || "wallet-company").slice(0, 32);
}

async function getUniqueWalletCompanyCode(name) {
  const baseCode = slugifyWalletCompanyCode(name);

  try {
    const [rows] = await pool.query(
      "SELECT code FROM wallet_companies WHERE code = ? OR code LIKE ?",
      [baseCode, `${baseCode}-%`]
    );

    const used = new Set(
      (rows || [])
        .map((row) => String(row.code || "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (!used.has(baseCode)) {
      return baseCode;
    }

    for (let i = 2; i <= 9999; i += 1) {
      const suffix = `-${i}`;
      const trimmedBase = baseCode.slice(0, Math.max(1, 32 - suffix.length));
      const candidate = `${trimmedBase}${suffix}`;
      if (!used.has(candidate)) {
        return candidate;
      }
    }

    return `${baseCode.slice(0, 28)}-x`;
  } catch (err) {
    if (err.code === "ER_BAD_FIELD_ERROR" || err.code === "ER_NO_SUCH_TABLE") {
      throw err;
    }
    throw err;
  }
}

/**
 * GET /api/admin/wallet-companies
 * List wallet companies with filters (name, status), sort, pagination.
 * Works with or without icon_svg column; if table is missing, returns empty list.
 */
exports.getAdminWalletCompanies = async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const availability = String(req.query.availability || "").trim().toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = SORT_COLUMN_MAP[req.query.sortKey] ? req.query.sortKey : "name";
    const sortColumn = SORT_COLUMN_MAP[sortKey];
    const sortDir = normalizeSortDir(req.query.sortDir);

    const where = [];
    const params = [];

    if (name) {
      where.push("name LIKE ?");
      params.push(`%${name}%`);
    }
    if (availability === "deposit") {
      where.push("available_for_deposit = 1");
    } else if (availability === "withdraw") {
      where.push("available_for_withdraw = 1");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    let rows = [];

    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM wallet_companies ${whereSql}`,
        params
      );
      total = Number(countRows?.[0]?.total || 0);
    } catch (tableErr) {
      if (tableErr.code === "ER_BAD_FIELD_ERROR" && (availability === "deposit" || availability === "withdraw")) {
        const whereNoAvail = name ? ["name LIKE ?"] : [];
        const paramsNoAvail = name ? [`%${name}%`] : [];
        const whereSqlNoAvail = whereNoAvail.length ? `WHERE ${whereNoAvail.join(" AND ")}` : "";
        const [countRows] = await pool.query(
          `SELECT COUNT(*) AS total FROM wallet_companies ${whereSqlNoAvail}`,
          paramsNoAvail
        );
        total = Number(countRows?.[0]?.total || 0);
      } else if (tableErr.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          sortKey: "name",
          sortDir: "asc",
        });
      }
      throw tableErr;
    }

    const offset = (page - 1) * pageSize;

    const selectCols = "id, name, code, icon_key, icon_path, icon_svg, is_active, sort_order, created_at";
    const selectColsNoIconPath = "id, name, code, icon_key, icon_svg, is_active, sort_order, created_at";
    const selectColsWithFlags =
      selectCols +
      ", available_for_deposit, available_for_withdraw, min_withdraw, deposit_process_minutes, withdraw_process_minutes";

    let dataRows;
    try {
      [dataRows] = await pool.query(
        `SELECT ${selectColsWithFlags}
         FROM wallet_companies ${whereSql}
         ORDER BY ${sortColumn} ${sortDir}, id ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (colErr) {
      if (colErr.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          sortKey: "name",
          sortDir: "asc",
        });
      }
      if (colErr.code === "ER_BAD_FIELD_ERROR") {
        const orderCol = (sortColumn === "available_for_deposit" || sortColumn === "available_for_withdraw") ? "name" : sortColumn;
        const stripAvailability = availability === "deposit" || availability === "withdraw";
        const whereSqlFallback = stripAvailability ? (name ? "WHERE name LIKE ?" : "") : whereSql;
        const paramsFallback = stripAvailability ? (name ? [`%${name}%`] : []) : params;
        [dataRows] = await pool.query(
          `SELECT ${selectColsNoIconPath}
           FROM wallet_companies ${whereSqlFallback}
           ORDER BY ${orderCol} ${sortDir}, id ASC
           LIMIT ? OFFSET ?`,
          [...paramsFallback, pageSize, offset]
        );
      } else {
        throw colErr;
      }
    }
    rows = dataRows;

    const hasDepositWithdrawCols = rows[0] && "available_for_deposit" in rows[0];
    const hasMinWdProcessCols = rows[0] && "min_withdraw" in rows[0];

    const items = rows.map((row) => {
      const forDep = hasDepositWithdrawCols ? !!row.available_for_deposit : !!row.is_active;
      const forWd = hasDepositWithdrawCols ? !!row.available_for_withdraw : !!row.is_active;
      const hasPath = !!(row.icon_path || row.icon_key);
      let minWithdraw = null;
      let depositProcessMinutes = null;
      let withdrawProcessMinutes = null;
      if (hasMinWdProcessCols) {
        const mw = row.min_withdraw;
        if (mw != null && Number.isFinite(Number(mw))) minWithdraw = Number(mw);
        const dp = row.deposit_process_minutes;
        if (dp != null && Number.isFinite(Number(dp))) depositProcessMinutes = Math.floor(Number(dp));
        const wp = row.withdraw_process_minutes;
        if (wp != null && Number.isFinite(Number(wp))) withdrawProcessMinutes = Math.floor(Number(wp));
      }
      return {
        id: row.id,
        name: row.name || "",
        code: row.code || "",
        iconPath: row.icon_path != null ? String(row.icon_path) : "",
        iconKey: row.icon_key || "",
        iconSvg: !hasPath && row.icon_svg != null ? String(row.icon_svg) : "",
        forDP: forDep ? "Yes" : "No",
        forWD: forWd ? "Yes" : "No",
        availableForDeposit: forDep,
        availableForWithdraw: forWd,
        minWithdraw,
        depositProcessMinutes,
        withdrawProcessMinutes,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };
    });

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      sortKey,
      sortDir: sortDir.toLowerCase(),
    });
  } catch (err) {
    console.error("getAdminWalletCompanies error:", err);
    return res.status(500).json({ message: "Failed to load wallet companies." });
  }
};

/**
 * POST /api/admin/wallet-companies
 * Create wallet company. Body: { name, status, iconSvg? }
 */
function buildItemFromRow(row) {
  const forDep = row.available_for_deposit != null ? !!row.available_for_deposit : !!row.is_active;
  const forWd = row.available_for_withdraw != null ? !!row.available_for_withdraw : !!row.is_active;
  const hasPath = !!(row.icon_path || row.icon_key);
  let minWithdraw = null;
  let depositProcessMinutes = null;
  let withdrawProcessMinutes = null;
  if ("min_withdraw" in row && row.min_withdraw != null && Number.isFinite(Number(row.min_withdraw))) {
    minWithdraw = Number(row.min_withdraw);
  }
  if (
    "deposit_process_minutes" in row &&
    row.deposit_process_minutes != null &&
    Number.isFinite(Number(row.deposit_process_minutes))
  ) {
    depositProcessMinutes = Math.floor(Number(row.deposit_process_minutes));
  }
  if (
    "withdraw_process_minutes" in row &&
    row.withdraw_process_minutes != null &&
    Number.isFinite(Number(row.withdraw_process_minutes))
  ) {
    withdrawProcessMinutes = Math.floor(Number(row.withdraw_process_minutes));
  }
  return {
    id: row.id,
    name: row.name || "",
    code: row.code != null ? row.code : "",
    iconPath: row.icon_path != null ? String(row.icon_path) : "",
    iconKey: row.icon_key != null ? row.icon_key : "",
    iconSvg: !hasPath && row.icon_svg != null ? String(row.icon_svg) : "",
    forDP: forDep ? "Yes" : "No",
    forWD: forWd ? "Yes" : "No",
    availableForDeposit: forDep,
    availableForWithdraw: forWd,
    minWithdraw,
    depositProcessMinutes,
    withdrawProcessMinutes,
    sortOrder: row.sort_order != null ? row.sort_order : 0,
    createdAt: row.created_at != null ? row.created_at : null,
  };
}

function parseYesNo(value) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  const s = String(value || "").trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1" ? 1 : 0;
}

/** Persist min_withdraw / process minutes; ignores missing columns */
async function applyWalletCompanyFinancialColumns(id, fields) {
  const sets = [];
  const params = [];
  if ("minWithdraw" in fields) {
    sets.push("min_withdraw = ?");
    params.push(fields.minWithdraw);
  }
  if ("depositProcessMinutes" in fields) {
    sets.push("deposit_process_minutes = ?");
    params.push(fields.depositProcessMinutes);
  }
  if ("withdrawProcessMinutes" in fields) {
    sets.push("withdraw_process_minutes = ?");
    params.push(fields.withdrawProcessMinutes);
  }
  if (sets.length === 0) return;
  params.push(id);
  try {
    await pool.query(`UPDATE wallet_companies SET ${sets.join(", ")} WHERE id = ?`, params);
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR") return;
    throw e;
  }
}

function parseMinWithdrawCreate(body) {
  const raw = body.minWithdraw ?? body.min_withdraw;
  if (raw === undefined || raw === null || String(raw).trim() === "") return { value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { error: "Min. withdraw must be a non-negative number." };
  return { value: n };
}

function parseProcessMinutesCreate(body, camelKey, snakeKey, label) {
  const raw = body[camelKey] ?? body[snakeKey];
  if (raw === undefined || raw === null || String(raw).trim() === "") return { error: `${label} is required.` };
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return { error: `${label} must be a positive whole number (1 or greater).` };
  return { value: n };
}

function parseMinWithdrawPatch(body) {
  if (!("minWithdraw" in body) && !("min_withdraw" in body)) return { skip: true };
  const raw = body.minWithdraw ?? body.min_withdraw;
  if (raw === "" || raw === null || raw === undefined) return { value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { error: "Min. withdraw must be a non-negative number." };
  return { value: n };
}

function parseProcessMinutesPatch(body, camelKey, snakeKey, label) {
  if (!(camelKey in body) && !(snakeKey in body)) return { skip: true };
  const raw = body[camelKey] ?? body[snakeKey];
  if (raw === "" || raw === null || raw === undefined) return { value: null };
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) {
    return { error: `${label} must be a positive whole number (1 or greater), or leave empty to clear.` };
  }
  return { value: n };
}

exports.createAdminWalletCompany = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const availableForDeposit = parseYesNo(req.body?.availableForDeposit ?? 1);
    const availableForWithdraw = parseYesNo(req.body?.availableForWithdraw ?? 1);
    const iconSvg = req.body?.iconSvg != null ? String(req.body.iconSvg) : null;
    const sortOrderFromBody = req.body?.sortOrder !== undefined && req.body?.sortOrder !== null
      ? Number(req.body.sortOrder)
      : null;
    const iconFile = req.file;

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    const minWCreate = parseMinWithdrawCreate(req.body);
    if (minWCreate.error) return res.status(400).json({ message: minWCreate.error });
    const dpPmCreate = parseProcessMinutesCreate(
      req.body,
      "depositProcessMinutes",
      "deposit_process_minutes",
      "DP process minutes"
    );
    if (dpPmCreate.error) return res.status(400).json({ message: dpPmCreate.error });
    const wdPmCreate = parseProcessMinutesCreate(
      req.body,
      "withdrawProcessMinutes",
      "withdraw_process_minutes",
      "WD process minutes"
    );
    if (wdPmCreate.error) return res.status(400).json({ message: wdPmCreate.error });

    let iconPathFromFile = null;
    if (iconFile && iconFile.buffer && iconFile.buffer.length > 0) {
      const baseName = uniqueWalletIconFilename(slugifyWalletCompanyCode(name));
      const result = processUploadedIconBuffer(iconFile.buffer, baseName);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      iconPathFromFile = result.iconPath;
    }

    let existing;
    try {
      [existing] = await pool.query(
        "SELECT id FROM wallet_companies WHERE name = ? LIMIT 1",
        [name]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({
          message:
            "Wallet companies table is not set up. Please run the database migration (database/migration_wallet_companies.sql).",
        });
      }
      throw e;
    }

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "A wallet company with this name already exists." });
    }

    let sortOrder = 1;
    if (Number.isFinite(sortOrderFromBody) && sortOrderFromBody >= 0) {
      sortOrder = Math.floor(sortOrderFromBody);
    } else {
      try {
        const [[maxRow]] = await pool.query(
          "SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextOrder FROM wallet_companies"
        );
        sortOrder = Number(maxRow?.nextOrder) || 1;
      } catch (e) {
        if (e.code === "ER_NO_SUCH_TABLE") {
          return res.status(503).json({
            message:
              "Wallet companies table is not set up. Please run the database migration (database/migration_wallet_companies.sql).",
          });
        }
        throw e;
      }
    }

    let code;
    try {
      code = await getUniqueWalletCompanyCode(name);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({
          message:
            "Wallet companies table is not set up. Please run the database migration (database/migration_wallet_companies.sql).",
        });
      }
      throw e;
    }

    let result;
    const insertIconPath = iconPathFromFile || null;
    try {
      [result] = await pool.query(
        `INSERT INTO wallet_companies (name, code, available_for_deposit, available_for_withdraw, icon_path, icon_svg, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, code, availableForDeposit, availableForWithdraw, insertIconPath, iconSvg || null, sortOrder]
      );
    } catch (insertErr) {
      if (insertErr.code === "ER_BAD_FIELD_ERROR") {
        try {
          [result] = await pool.query(
            `INSERT INTO wallet_companies (name, code, available_for_deposit, available_for_withdraw, icon_svg, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, code, availableForDeposit, availableForWithdraw, iconSvg || null, sortOrder]
          );
        } catch (e2) {
          if (e2.code === "ER_BAD_FIELD_ERROR") {
            try {
              [result] = await pool.query(
                `INSERT INTO wallet_companies (name, code, is_active, icon_svg, sort_order)
                 VALUES (?, ?, 1, ?, ?)`,
                [name, code, iconSvg || null, sortOrder]
              );
            } catch (e3) {
              if (e3.code === "ER_BAD_FIELD_ERROR") {
                [result] = await pool.query(
                  `INSERT INTO wallet_companies (name, code, is_active)
                   VALUES (?, ?, 1)`,
                  [name, code]
                );
              } else {
                throw e3;
              }
            }
          } else {
            throw e2;
          }
        }
      } else {
        throw insertErr;
      }
    }

    const insertId = result.insertId;
    if (insertId == null || insertId === undefined) {
      console.error("createAdminWalletCompany: insertId missing", result);
      return res.status(500).json({ message: "Failed to create wallet company." });
    }

    if (iconPathFromFile) {
      // Already saved via file upload; no further action
    } else if (iconSvg && iconSvg.trim()) {
      const filename = writeSvgToAssets(insertId, iconSvg);
      if (filename) {
        try {
          await pool.query(
            "UPDATE wallet_companies SET icon_key = ? WHERE id = ?",
            [filename, insertId]
          );
        } catch (_) {}
      }
      // Also write to backend uploads and set icon_path for consistent serving from /uploads
      const sanitized = sanitizeSvg(iconSvg);
      if (sanitized.ok && ensureUploadsWalletsDir()) {
        const optimized = optimizeSvg(sanitized.data);
        const backendSvgName = `${insertId}.svg`;
        const backendSvgPath = path.join(UPLOADS_WALLETS, backendSvgName);
        try {
          fs.writeFileSync(backendSvgPath, optimized, "utf8");
          generatePngFromSvg(backendSvgPath, Buffer.from(optimized, "utf8")).catch(() => {});
          await pool.query(
            "UPDATE wallet_companies SET icon_path = ? WHERE id = ?",
            [`/uploads/wallets/${backendSvgName}`, insertId]
          ).catch(() => {});
        } catch (_) {}
      }
    }

    await applyWalletCompanyFinancialColumns(insertId, {
      minWithdraw: minWCreate.value,
      depositProcessMinutes: dpPmCreate.value,
      withdrawProcessMinutes: wdPmCreate.value,
    });

    let rows;
    try {
      [rows] = await pool.query(
        "SELECT id, name, code, icon_key, icon_path, icon_svg, is_active, sort_order, created_at, available_for_deposit, available_for_withdraw, min_withdraw, deposit_process_minutes, withdraw_process_minutes FROM wallet_companies WHERE id = ?",
        [insertId]
      );
    } catch (selErr) {
      if (selErr.code === "ER_BAD_FIELD_ERROR") {
        try {
          [rows] = await pool.query(
            "SELECT id, name, code, icon_key, icon_path, icon_svg, is_active, sort_order, created_at, available_for_deposit, available_for_withdraw FROM wallet_companies WHERE id = ?",
            [insertId]
          );
        } catch (e2) {
          if (e2.code === "ER_BAD_FIELD_ERROR") {
            try {
              [rows] = await pool.query(
                "SELECT id, name, code, icon_key, icon_svg, is_active, sort_order, created_at, available_for_deposit, available_for_withdraw FROM wallet_companies WHERE id = ?",
                [insertId]
              );
            } catch (e3) {
              [rows] = await pool.query(
                "SELECT id, name, code, icon_key, is_active, sort_order, created_at FROM wallet_companies WHERE id = ?",
                [insertId]
              );
            }
          } else {
            throw e2;
          }
        }
      } else {
        throw selErr;
      }
    }

    const row = rows[0];
    if (!row) {
      return res.status(500).json({ message: "Failed to create wallet company." });
    }

    return res.status(201).json({
      message: "Wallet company created.",
      item: buildItemFromRow(row),
    });
  } catch (err) {
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "A wallet company with this name or code already exists." });
    }
    console.error("createAdminWalletCompany error:", err);
    return res.status(500).json({ message: "Failed to create wallet company." });
  }
};

/**
 * PATCH /api/admin/wallet-companies/:id
 * Update wallet company. Body: { status?, iconSvg? }
 */
exports.updateAdminWalletCompany = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    const body = req.body || {};
    const availableForDepositRaw = body.availableForDeposit ?? body.available_for_deposit;
    const availableForWithdrawRaw = body.availableForWithdraw ?? body.available_for_withdraw;
    const availableForDeposit = availableForDepositRaw !== undefined && availableForDepositRaw !== null ? parseYesNo(availableForDepositRaw) : null;
    const availableForWithdraw = availableForWithdrawRaw !== undefined && availableForWithdrawRaw !== null ? parseYesNo(availableForWithdrawRaw) : null;
    const iconSvg = body.iconSvg !== undefined ? String(body.iconSvg) : undefined;
    const iconFile = req.file;
    const sortOrderRaw = body.sortOrder ?? body.sort_order;
    const sortOrder = sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw))
      ? Math.floor(Number(sortOrderRaw))
      : null;

    if (!id) {
      return res.status(400).json({ message: "Invalid id." });
    }

    let iconPathFromFile = null;
    if (iconFile && iconFile.buffer && iconFile.buffer.length > 0) {
      const baseName = uniqueWalletIconFilename(`id-${id}`);
      const result = processUploadedIconBuffer(iconFile.buffer, baseName);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      iconPathFromFile = result.iconPath;
    }

    let existing;
    try {
      [existing] = await pool.query(
        "SELECT id, name, is_active, icon_svg, available_for_deposit, available_for_withdraw FROM wallet_companies WHERE id = ?",
        [id]
      );
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR") {
        [existing] = await pool.query(
          "SELECT id, name, is_active, icon_svg FROM wallet_companies WHERE id = ?",
          [id]
        );
      } else {
        throw e;
      }
    }

    if (existing.length === 0) {
      return res.status(404).json({ message: "Wallet company not found." });
    }

    const financialPatch = {};
    const minWP = parseMinWithdrawPatch(body);
    if (minWP.error) return res.status(400).json({ message: minWP.error });
    if (!minWP.skip) financialPatch.minWithdraw = minWP.value;

    const dpPatch = parseProcessMinutesPatch(
      body,
      "depositProcessMinutes",
      "deposit_process_minutes",
      "DP process minutes"
    );
    if (dpPatch.error) return res.status(400).json({ message: dpPatch.error });
    if (!dpPatch.skip) financialPatch.depositProcessMinutes = dpPatch.value;

    const wdPatch = parseProcessMinutesPatch(
      body,
      "withdrawProcessMinutes",
      "withdraw_process_minutes",
      "WD process minutes"
    );
    if (wdPatch.error) return res.status(400).json({ message: wdPatch.error });
    if (!wdPatch.skip) financialPatch.withdrawProcessMinutes = wdPatch.value;

    const updates = [];
    const params = [];

    if (availableForDeposit !== null) {
      updates.push("available_for_deposit = ?");
      params.push(availableForDeposit);
    }
    if (availableForWithdraw !== null) {
      updates.push("available_for_withdraw = ?");
      params.push(availableForWithdraw);
    }
    if (iconSvg !== undefined) {
      updates.push("icon_svg = ?");
      params.push(iconSvg || null);
    }
    if (iconPathFromFile !== null) {
      updates.push("icon_path = ?");
      params.push(iconPathFromFile);
    }
    if (sortOrder !== null && sortOrder >= 0) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }

    if (updates.length === 0 && Object.keys(financialPatch).length === 0) {
      const row = existing[0];
      return res.status(200).json({
        message: "No changes.",
        item: buildItemFromRow(row),
      });
    }

    if (updates.length > 0) {
      params.push(id);
      try {
        await pool.query(
          `UPDATE wallet_companies SET ${updates.join(", ")} WHERE id = ?`,
          params
        );
      } catch (updErr) {
      if (updErr.code === "ER_BAD_FIELD_ERROR") {
        const depWdUpdates = updates.filter((u) => u.startsWith("available_for_"));
        const depWdParams = [];
        updates.forEach((u, i) => {
          if (u.startsWith("available_for_")) depWdParams.push(params[i]);
        });
        if (depWdUpdates.length > 0) {
          depWdParams.push(id);
          try {
            await pool.query(
              `UPDATE wallet_companies SET ${depWdUpdates.join(", ")} WHERE id = ?`,
              depWdParams
            );
          } catch (_) {}
        }
        const safeUpdates = updates.filter((u) => !u.startsWith("available_for_") && u !== "icon_path = ?");
        const safeParams = [];
        updates.forEach((u, i) => {
          if (!u.startsWith("available_for_") && u !== "icon_path = ?") safeParams.push(params[i]);
        });
        if (safeUpdates.length > 0) {
          safeParams.push(id);
          await pool.query(
            `UPDATE wallet_companies SET ${safeUpdates.join(", ")} WHERE id = ?`,
            safeParams
          );
        }
      } else {
        throw updErr;
      }
      }
    }

    if (Object.keys(financialPatch).length > 0) {
      await applyWalletCompanyFinancialColumns(id, financialPatch);
    }

    if (iconPathFromFile) {
      // Already updated icon_path above
    } else if (iconSvg !== undefined && iconSvg && String(iconSvg).trim()) {
      const filename = writeSvgToAssets(id, iconSvg);
      if (filename) {
        try {
          await pool.query(
            "UPDATE wallet_companies SET icon_key = ? WHERE id = ?",
            [filename, id]
          );
        } catch (_) {}
      }
      const sanitized = sanitizeSvg(iconSvg);
      if (sanitized.ok && ensureUploadsWalletsDir()) {
        const optimized = optimizeSvg(sanitized.data);
        const backendSvgName = `${id}.svg`;
        const backendSvgPath = path.join(UPLOADS_WALLETS, backendSvgName);
        try {
          fs.writeFileSync(backendSvgPath, optimized, "utf8");
          generatePngFromSvg(backendSvgPath, Buffer.from(optimized, "utf8")).catch(() => {});
          await pool.query(
            "UPDATE wallet_companies SET icon_path = ? WHERE id = ?",
            [`/uploads/wallets/${backendSvgName}`, id]
          ).catch(() => {});
        } catch (_) {}
      }
    }

    let rows;
    try {
      [rows] = await pool.query(
        "SELECT id, name, code, icon_key, icon_path, icon_svg, is_active, sort_order, created_at, available_for_deposit, available_for_withdraw, min_withdraw, deposit_process_minutes, withdraw_process_minutes FROM wallet_companies WHERE id = ?",
        [id]
      );
    } catch (selErr) {
      if (selErr.code === "ER_BAD_FIELD_ERROR") {
        try {
          [rows] = await pool.query(
            "SELECT id, name, code, icon_key, icon_path, icon_svg, is_active, sort_order, created_at, available_for_deposit, available_for_withdraw FROM wallet_companies WHERE id = ?",
            [id]
          );
        } catch (e2) {
          if (e2.code === "ER_BAD_FIELD_ERROR") {
            [rows] = await pool.query(
              "SELECT id, name, code, icon_key, icon_svg, is_active, sort_order, created_at, available_for_deposit, available_for_withdraw FROM wallet_companies WHERE id = ?",
              [id]
            );
          } else {
            throw e2;
          }
        }
      } else {
        throw selErr;
      }
    }

    const row = rows[0];

    return res.status(200).json({
      message: "Wallet company updated.",
      item: buildItemFromRow(row),
    });
  } catch (err) {
    console.error("updateAdminWalletCompany error:", err);
    return res.status(500).json({ message: "Failed to update wallet company." });
  }
};

/**
 * GET /api/admin/wallet-companies/active
 * Returns id, name, sortOrder for active companies only (for dropdowns).
 */
exports.getAdminWalletCompaniesActive = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, sort_order AS sortOrder FROM wallet_companies WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
    );
    return res.status(200).json({ companies: rows || [] });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.status(200).json({ companies: [] });
    console.error("getAdminWalletCompaniesActive error:", e);
    return res.status(500).json({ message: "Failed to load companies." });
  }
};