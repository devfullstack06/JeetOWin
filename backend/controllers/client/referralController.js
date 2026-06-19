const { pool } = require("../../config/database");
const { pktMonthLabel, pktYmdForInstant } = require("../../utils/pakistanTime");
const { getProgramSettings, effectiveRatesForEarner } = require("../../services/referralRates");
const { getCommissionTotals, getCommissionByMonth } = require("../../services/referralLedgerService");
const { buildReferralDownline } = require("../../services/referralDownlineService");

async function getClientIdForUser(userId) {
  const [[row]] = await pool.query("SELECT * FROM clients WHERE user_id = ? LIMIT 1", [userId]);
  return row || null;
}

function currentMonthYm() {
  return pktYmdForInstant().slice(0, 7);
}

function mapOverviewSettings(settings, client, rates) {
  const template = settings?.share_url_template || "https://www.jeetowin.com/signup?ref={code}";
  const code = client?.referral_code || "";
  const shareUrl = template.replace(/\{code\}/gi, encodeURIComponent(code));

  return {
    referralCode: code,
    shareUrl,
    isProgramEnabled: !!settings?.is_enabled,
    tierRates: {
      tier1: rates.tier1,
      tier2: rates.tier2,
      tier3: rates.tier3,
    },
    overviewLead: settings?.overview_lead || "",
    infoParagraph: settings?.overview_info || "",
    detailsModalTitle: settings?.details_modal_title || "",
    detailsModalBody: settings?.details_modal_body || "",
    steps: [
      { title: settings?.step1_title, subtitle: settings?.step1_subtitle },
      { title: settings?.step2_title, subtitle: settings?.step2_subtitle },
      { title: settings?.step3_title, subtitle: settings?.step3_subtitle },
    ],
  };
}

exports.getClientReferralOverview = async (req, res) => {
  try {
    const client = await getClientIdForUser(req.user.userId);
    if (!client) return res.status(404).json({ error: "Client profile not found." });

    const settings = await getProgramSettings();
    const rates = effectiveRatesForEarner(settings, client);

    return res.json({
      overview: mapOverviewSettings(settings, client, rates),
    });
  } catch (e) {
    console.error("[client referral] overview:", e);
    return res.status(500).json({ error: "Failed to load referral overview." });
  }
};

exports.getClientReferralStats = async (req, res) => {
  try {
    const client = await getClientIdForUser(req.user.userId);
    if (!client) return res.status(404).json({ error: "Client profile not found." });

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
      [client.id, monthYm, tier]
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
    console.error("[client referral] stats:", e);
    return res.status(500).json({ error: "Failed to load referral stats." });
  }
};

exports.getClientReferralDownline = async (req, res) => {
  try {
    const client = await getClientIdForUser(req.user.userId);
    if (!client) return res.status(404).json({ error: "Client profile not found." });

    const settings = await getProgramSettings();
    if (!settings?.is_enabled) {
      return res.status(404).json({
        error: "Referral program is not available.",
        hidden: true,
      });
    }

    const downline = await buildReferralDownline(client.id);
    return res.json(downline);
  } catch (e) {
    console.error("[client referral] downline:", e);
    return res.status(500).json({ error: "Failed to load referral details." });
  }
};

exports.getClientReferralCommission = async (req, res) => {
  try {
    const client = await getClientIdForUser(req.user.userId);
    if (!client) return res.status(404).json({ error: "Client profile not found." });

    const totals = await getCommissionTotals(client.id);
    const byMonth = await getCommissionByMonth(client.id);

    return res.json({
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
    console.error("[client referral] commission:", e);
    return res.status(500).json({ error: "Failed to load commission data." });
  }
};
