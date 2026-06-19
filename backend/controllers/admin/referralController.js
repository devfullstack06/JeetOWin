const { pool } = require("../../config/database");
const { generateUniqueReferralCode } = require("../../utils/referralCode");
const { toMysqlDatetime } = require("../../services/referralBrandRules");
const { runAccrualForMonth } = require("../../services/referralAccrualService");
const {
  getCommissionTotals,
  getCommissionByMonth,
  releaseCommission,
  applyNegativeAccrualRelease,
} = require("../../services/referralLedgerService");
const { pktMonthLabel, pktYmdForInstant } = require("../../utils/pakistanTime");
const { buildReferralDownline } = require("../../services/referralDownlineService");

function currentMonthYm() {
  return pktYmdForInstant().slice(0, 7);
}

function mapSettings(row) {
  if (!row) return null;
  return {
    isEnabled: !!row.is_enabled,
    tier1Rate: Number(row.tier1_rate),
    tier2Rate: Number(row.tier2_rate),
    tier3Rate: Number(row.tier3_rate),
    negativeReleaseMode: row.negative_release_mode,
    allowNegativeDeductWallet: !!row.allow_negative_deduct_wallet,
    allowNegativePostpone: !!row.allow_negative_postpone,
    shareUrlTemplate: row.share_url_template,
    accrualStartMonth: row.accrual_start_month,
    overviewLead: row.overview_lead,
    overviewInfo: row.overview_info,
    detailsModalTitle: row.details_modal_title,
    detailsModalBody: row.details_modal_body,
    steps: [
      { title: row.step1_title, subtitle: row.step1_subtitle },
      { title: row.step2_title, subtitle: row.step2_subtitle },
      { title: row.step3_title, subtitle: row.step3_subtitle },
    ],
  };
}

exports.getAdminReferralSettings = async (req, res) => {
  try {
    const [[row]] = await pool.query("SELECT * FROM referral_program_settings WHERE id = 1 LIMIT 1");
    return res.json({ settings: mapSettings(row) });
  } catch (e) {
    console.error("[admin referral] get settings:", e);
    return res.status(500).json({ error: "Failed to load referral settings." });
  }
};

exports.patchAdminReferralSettings = async (req, res) => {
  try {
    const b = req.body || {};
    const fields = [];
    const values = [];

    const map = {
      isEnabled: ["is_enabled", (v) => (v ? 1 : 0)],
      tier1Rate: ["tier1_rate", Number],
      tier2Rate: ["tier2_rate", Number],
      tier3Rate: ["tier3_rate", Number],
      negativeReleaseMode: ["negative_release_mode", String],
      allowNegativeDeductWallet: ["allow_negative_deduct_wallet", (v) => (v ? 1 : 0)],
      allowNegativePostpone: ["allow_negative_postpone", (v) => (v ? 1 : 0)],
      shareUrlTemplate: ["share_url_template", String],
      accrualStartMonth: ["accrual_start_month", (v) => v || null],
      overviewLead: ["overview_lead", String],
      overviewInfo: ["overview_info", (v) => v ?? null],
      detailsModalTitle: ["details_modal_title", String],
      detailsModalBody: ["details_modal_body", (v) => v ?? null],
      step1Title: ["step1_title", String],
      step1Subtitle: ["step1_subtitle", String],
      step2Title: ["step2_title", String],
      step2Subtitle: ["step2_subtitle", String],
      step3Title: ["step3_title", String],
      step3Subtitle: ["step3_subtitle", String],
    };

    for (const [key, [col, fn]] of Object.entries(map)) {
      if (b[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(fn(b[key]));
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    await pool.query(`UPDATE referral_program_settings SET ${fields.join(", ")} WHERE id = 1`, values);
    const [[row]] = await pool.query("SELECT * FROM referral_program_settings WHERE id = 1 LIMIT 1");
    return res.json({ settings: mapSettings(row) });
  } catch (e) {
    console.error("[admin referral] patch settings:", e);
    return res.status(500).json({ error: "Failed to update referral settings." });
  }
};

exports.getAdminReferrers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    let where = "1=1";
    const params = [];
    if (q) {
      where += " AND (u.username LIKE ? OR c.referral_code LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM clients c
       INNER JOIN users u ON u.id = c.user_id
       WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT c.id AS clientId, u.username, c.referral_code AS referralCode,
              c.referrer_status AS referrerStatus, c.referrer_stop_accruals AS stopAccruals,
              c.referrer_tier1_rate AS tier1Override, c.referrer_tier2_rate AS tier2Override,
              c.referrer_tier3_rate AS tier3Override, c.created_at AS createdAt
       FROM clients c
       INNER JOIN users u ON u.id = c.user_id
       WHERE ${where}
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      items: rows || [],
      total: Number(countRow?.cnt || 0),
      limit,
      offset,
    });
  } catch (e) {
    console.error("[admin referral] list referrers:", e);
    return res.status(500).json({ error: "Failed to load referrers." });
  }
};

exports.patchAdminReferrer = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    const b = req.body || {};
    const fields = [];
    const values = [];

    if (b.referrerStatus !== undefined) {
      fields.push("referrer_status = ?");
      values.push(b.referrerStatus === "disabled" ? "disabled" : "active");
    }
    if (b.stopAccruals !== undefined) {
      fields.push("referrer_stop_accruals = ?");
      values.push(b.stopAccruals ? 1 : 0);
    }
    if (b.tier1Override !== undefined) {
      fields.push("referrer_tier1_rate = ?");
      values.push(b.tier1Override === null || b.tier1Override === "" ? null : Number(b.tier1Override));
    }
    if (b.tier2Override !== undefined) {
      fields.push("referrer_tier2_rate = ?");
      values.push(b.tier2Override === null || b.tier2Override === "" ? null : Number(b.tier2Override));
    }
    if (b.tier3Override !== undefined) {
      fields.push("referrer_tier3_rate = ?");
      values.push(b.tier3Override === null || b.tier3Override === "" ? null : Number(b.tier3Override));
    }
    if (b.regenerateCode) {
      const [[urow]] = await pool.query(
        "SELECT u.username FROM clients c INNER JOIN users u ON u.id = c.user_id WHERE c.id = ? LIMIT 1",
        [clientId]
      );
      if (!urow) return res.status(404).json({ error: "Client not found." });
      const code = await generateUniqueReferralCode(urow.username, null, clientId);
      fields.push("referral_code = ?");
      values.push(code);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    values.push(clientId);
    const [result] = await pool.query(`UPDATE clients SET ${fields.join(", ")} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Client not found." });

    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin referral] patch referrer:", e);
    return res.status(500).json({ error: "Failed to update referrer." });
  }
};

exports.getAdminReferrerCommission = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    const [[row]] = await pool.query(
      `SELECT c.id AS clientId, u.username
       FROM clients c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.id = ?
       LIMIT 1`,
      [clientId]
    );
    if (!row) return res.status(404).json({ error: "Client not found." });

    const totals = await getCommissionTotals(clientId);
    const byMonth = await getCommissionByMonth(clientId);

    return res.json({
      username: row.username || "",
      overall: {
        earned: totals.earned,
        withdrawn: totals.withdrawn,
        balance: totals.balance,
      },
      byMonth: byMonth.map((m, i) => ({
        id: i + 1,
        month: pktMonthLabel(m.monthYm),
        monthYm: m.monthYm,
        commission: m.commission,
      })),
    });
  } catch (e) {
    console.error("[admin referral] referrer commission:", e);
    return res.status(500).json({ error: "Failed to load referrer commission." });
  }
};

exports.getAdminReferrerStats = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    const [[clientRow]] = await pool.query("SELECT c.id FROM clients c WHERE c.id = ? LIMIT 1", [
      clientId,
    ]);
    if (!clientRow) return res.status(404).json({ error: "Client not found." });

    const tier = Math.min(3, Math.max(1, Number(req.query.tier) || 1));
    const monthYm = String(req.query.month || currentMonthYm()).slice(0, 7);

    const [rows] = await pool.query(
      `SELECT ra.id, ra.tier, ra.transfer_in_total AS transferIn,
              ra.transfer_out_total AS transferOut, ra.net_base AS net,
              ra.amount AS commission, us.username AS username
       FROM referral_accruals ra
       INNER JOIN clients cs ON cs.id = ra.source_client_id
       INNER JOIN users us ON us.id = cs.user_id
       WHERE ra.earner_client_id = ? AND ra.accrual_month = ? AND ra.tier = ?
       ORDER BY ra.amount DESC, ra.id DESC`,
      [clientId, monthYm, tier]
    );

    const summary = (rows || []).reduce(
      (acc, r) => {
        acc.totalReferrals += 1;
        acc.totalCommission += Number(r.commission) || 0;
        acc.totalTransferIn += Number(r.transferIn) || 0;
        acc.totalTransferOut += Number(r.transferOut) || 0;
        return acc;
      },
      { totalReferrals: 0, totalCommission: 0, totalTransferIn: 0, totalTransferOut: 0 }
    );

    const round = (n) => Math.round(n * 100) / 100;
    summary.totalCommission = round(summary.totalCommission);
    summary.totalTransferIn = round(summary.totalTransferIn);
    summary.totalTransferOut = round(summary.totalTransferOut);

    return res.json({
      tier,
      monthYm,
      monthLabel: pktMonthLabel(monthYm),
      summary,
      rows: (rows || []).map((r) => ({
        id: r.id,
        username: r.username,
        transferIn: Number(r.transferIn),
        transferOut: Number(r.transferOut),
        net: Number(r.net),
        commission: Number(r.commission),
      })),
    });
  } catch (e) {
    console.error("[admin referral] referrer stats:", e);
    return res.status(500).json({ error: "Failed to load referrer stats." });
  }
};

exports.getAdminReferrerDownline = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    const [[clientRow]] = await pool.query("SELECT c.id FROM clients c WHERE c.id = ? LIMIT 1", [
      clientId,
    ]);
    if (!clientRow) return res.status(404).json({ error: "Client not found." });

    const downline = await buildReferralDownline(clientId);
    return res.json(downline);
  } catch (e) {
    console.error("[admin referral] referrer downline:", e);
    return res.status(500).json({ error: "Failed to load referrer downline." });
  }
};

exports.getAdminReferrerTree = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const [direct] = await pool.query(
      `SELECT c.id AS clientId, u.username, c.created_at AS createdAt
       FROM clients c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.referred_by_client_id = ?
       ORDER BY c.created_at DESC
       LIMIT 200`,
      [clientId]
    );

    const level2 = [];
    for (const d of direct || []) {
      const [kids] = await pool.query(
        `SELECT c.id AS clientId, u.username, c.created_at AS createdAt
         FROM clients c INNER JOIN users u ON u.id = c.user_id
         WHERE c.referred_by_client_id = ? ORDER BY c.created_at DESC LIMIT 50`,
        [d.clientId]
      );
      const level3 = [];
      for (const k of kids || []) {
        const [gkids] = await pool.query(
          `SELECT c.id AS clientId, u.username, c.created_at AS createdAt
           FROM clients c INNER JOIN users u ON u.id = c.user_id
           WHERE c.referred_by_client_id = ? ORDER BY c.created_at DESC LIMIT 20`,
          [k.clientId]
        );
        level3.push({ ...k, children: gkids || [] });
      }
      level2.push({ ...d, children: level3 });
    }

    return res.json({ tree: level2 });
  } catch (e) {
    console.error("[admin referral] tree:", e);
    return res.status(500).json({ error: "Failed to load referral tree." });
  }
};

exports.getAdminBrandRules = async (req, res) => {
  try {
    const clientId = req.query.clientId != null ? Number(req.query.clientId) : null;
    let sql = `SELECT r.id, r.scope, r.client_id AS clientId, r.brand_id AS brandId, b.name AS brandName,
                      r.is_included AS isIncluded, r.effective_from AS effectiveFrom, r.created_at AS createdAt
               FROM referral_brand_rules r
               INNER JOIN brands b ON b.id = r.brand_id`;
    const params = [];
    if (clientId) {
      sql += " WHERE r.scope = 'client' AND r.client_id = ?";
      params.push(clientId);
    } else {
      sql += " WHERE r.scope = 'global'";
    }
    sql += " ORDER BY r.effective_from DESC, r.id DESC LIMIT 500";
    const [rows] = await pool.query(sql, params);
    return res.json({ items: rows || [] });
  } catch (e) {
    console.error("[admin referral] brand rules:", e);
    return res.status(500).json({ error: "Failed to load brand rules." });
  }
};

exports.postAdminBrandRule = async (req, res) => {
  try {
    const scope = req.body?.scope === "client" ? "client" : "global";
    const brandId = Number(req.body?.brandId);
    const isIncluded = !!req.body?.isIncluded;
    const clientId = scope === "client" ? Number(req.body?.clientId) : null;
    const effectiveFrom = req.body?.effectiveFrom
      ? toMysqlDatetime(new Date(req.body.effectiveFrom))
      : toMysqlDatetime(new Date());

    if (!Number.isFinite(brandId)) {
      return res.status(400).json({ error: "brandId is required." });
    }
    if (scope === "client" && !Number.isFinite(clientId)) {
      return res.status(400).json({ error: "clientId is required for client scope." });
    }

    const adminUserId = req.authUser?.id ?? null;
    const [result] = await pool.query(
      `INSERT INTO referral_brand_rules
        (scope, client_id, brand_id, is_included, effective_from, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [scope, clientId, brandId, isIncluded ? 1 : 0, effectiveFrom, adminUserId]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    console.error("[admin referral] post brand rule:", e);
    return res.status(500).json({ error: "Failed to create brand rule." });
  }
};

exports.getAdminAccrualPreview = async (req, res) => {
  try {
    const monthYm = String(req.query.month || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthYm)) {
      return res.status(400).json({ error: "month must be YYYY-MM." });
    }

    const [rows] = await pool.query(
      `SELECT ra.id, ra.tier, ra.accrual_month AS monthYm,
              ra.transfer_in_total AS transferIn, ra.transfer_out_total AS transferOut,
              ra.net_base AS net, ra.rate_applied AS rate, ra.amount, ra.status,
              ue.username AS earnerUsername, us.username AS sourceUsername
       FROM referral_accruals ra
       INNER JOIN clients ce ON ce.id = ra.earner_client_id
       INNER JOIN users ue ON ue.id = ce.user_id
       INNER JOIN clients cs ON cs.id = ra.source_client_id
       INNER JOIN users us ON us.id = cs.user_id
       WHERE ra.accrual_month = ?
       ORDER BY ra.amount DESC, ra.id DESC
       LIMIT 500`,
      [monthYm]
    );

    return res.json({ items: rows || [], monthYm });
  } catch (e) {
    console.error("[admin referral] accrual preview:", e);
    return res.status(500).json({ error: "Failed to load accrual preview." });
  }
};

exports.postAdminRunAccrual = async (req, res) => {
  try {
    const monthYm = String(req.body?.month || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthYm)) {
      return res.status(400).json({ error: "month must be YYYY-MM." });
    }
    const result = await runAccrualForMonth(monthYm);
    return res.json(result);
  } catch (e) {
    console.error("[admin referral] run accrual:", e);
    return res.status(500).json({ error: e.message || "Accrual run failed." });
  }
};

exports.getAdminReleaseQueue = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id AS clientId, u.username, c.referral_code AS referralCode
       FROM clients c
       INNER JOIN users u ON u.id = c.user_id
       ORDER BY c.id ASC
       LIMIT 500`
    );

    const items = [];
    for (const r of rows || []) {
      const totals = await getCommissionTotals(r.clientId);
      if (totals.balance !== 0 || totals.earned !== 0) {
        items.push({ ...r, ...totals });
      }
    }

    items.sort((a, b) => b.balance - a.balance);
    return res.json({ items });
  } catch (e) {
    console.error("[admin referral] release queue:", e);
    return res.status(500).json({ error: "Failed to load release queue." });
  }
};

exports.postAdminReleaseCommission = async (req, res) => {
  try {
    const clientId = Number(req.body?.clientId);
    const amount = Number(req.body?.amount);
    const note = req.body?.note || null;
    const negativeMode = req.body?.negativeMode;

    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ error: "clientId is required." });
    }

    const adminUserId = req.authUser?.id ?? null;

    if (Number.isFinite(amount) && amount < 0) {
      const [[settings]] = await pool.query("SELECT * FROM referral_program_settings WHERE id = 1 LIMIT 1");
      const mode =
        negativeMode === "deduct_wallet" && settings?.allow_negative_deduct_wallet
          ? "deduct_wallet"
          : "postpone";
      const result = await applyNegativeAccrualRelease({
        earnerClientId: clientId,
        amount,
        mode,
        note,
        releasedByUserId: adminUserId,
      });
      return res.json(result);
    }

    const result = await releaseCommission({
      earnerClientId: clientId,
      amount,
      negativeHandling: "none",
      note,
      releasedByUserId: adminUserId,
    });
    return res.json(result);
  } catch (e) {
    console.error("[admin referral] release:", e);
    return res.status(400).json({ error: e.message || "Release failed." });
  }
};

exports.getAdminReleaseHistory = async (req, res) => {
  try {
    const clientId = req.query.clientId != null ? Number(req.query.clientId) : null;
    let sql = `SELECT rr.id, rr.earner_client_id AS clientId, u.username, rr.amount,
                      rr.negative_handling AS negativeHandling, rr.note, rr.created_at AS createdAt
               FROM referral_releases rr
               INNER JOIN clients c ON c.id = rr.earner_client_id
               INNER JOIN users u ON u.id = c.user_id`;
    const params = [];
    if (clientId) {
      sql += " WHERE rr.earner_client_id = ?";
      params.push(clientId);
    }
    sql += " ORDER BY rr.created_at DESC LIMIT 200";
    const [rows] = await pool.query(sql, params);
    return res.json({ items: rows || [] });
  } catch (e) {
    console.error("[admin referral] release history:", e);
    return res.status(500).json({ error: "Failed to load release history." });
  }
};
