const { pool } = require("../../config/database");
const { parseAffiliateDateRange } = require("../../utils/affiliateDateRanges");
const { getPublicChatWidgetSettings } = require("../admin/chatWidgetSettingsController");
const { getAffiliateSettingsMap } = require("../../services/affiliateSettingsService");

async function getAdminSupportContact() {
  const settings = await getAffiliateSettingsMap();
  return {
    telegram: settings.support_telegram || null,
    whatsapp: settings.support_whatsapp || null,
    email: settings.support_email || null,
  };
}

exports.getAffiliateAssets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, type, file_url AS fileUrl, text_content AS textContent,
              status, sort_order AS sortOrder
       FROM affiliate_assets
       WHERE status = 'active'
       ORDER BY sort_order ASC, id DESC`
    );
    return res.json({ assets: rows || [] });
  } catch (e) {
    console.error("[affiliate] assets:", e);
    return res.status(500).json({ error: "Failed to load marketing assets." });
  }
};

exports.getAffiliateReports = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const range = parseAffiliateDateRange(req.query);

    const [[clicks]] = await pool.query(
      `SELECT COUNT(*) AS c FROM affiliate_clicks
       WHERE affiliate_id = ? AND created_at >= ? AND created_at <= ?`,
      [affiliate.id, range.start, range.end]
    );

    const [[regs]] = await pool.query(
      `SELECT COUNT(*) AS c FROM affiliate_players
       WHERE affiliate_id = ? AND registered_at >= ? AND registered_at <= ?`,
      [affiliate.id, range.start, range.end]
    );

    const [[activePlayers]] = await pool.query(
      `SELECT COUNT(*) AS c FROM affiliate_players
       WHERE affiliate_id = ? AND status = 'active'`,
      [affiliate.id]
    );

    const [[comm]] = await pool.query(
      `SELECT
         COALESCE(SUM(transfer_in_total), 0) AS transferIn,
         COALESCE(SUM(transfer_out_total), 0) AS transferOut,
         COALESCE(SUM(bonus_paid_total), 0) AS bonusPaid,
         COALESCE(SUM(net_amount), 0) AS netAmount,
         COALESCE(SUM(commission_amount), 0) AS commission
       FROM affiliate_commissions
       WHERE affiliate_id = ?
         AND period_start >= ? AND period_end <= ?`,
      [affiliate.id, range.startYmd, range.endYmd]
    );

    const [[withdrawals]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM affiliate_withdrawals
       WHERE affiliate_id = ?
         AND created_at >= ? AND created_at <= ?
         AND status IN ('approved', 'paid')`,
      [affiliate.id, range.start, range.end]
    );

    const metrics = {
      clicks: Number(clicks?.c || 0),
      registrations: Number(regs?.c || 0),
      activePlayers: Number(activePlayers?.c || 0),
      transferIn: Number(comm?.transferIn || 0),
      transferOut: Number(comm?.transferOut || 0),
      bonusPaid: Number(comm?.bonusPaid || 0),
      netAmount: Number(comm?.netAmount || 0),
      commission: Number(comm?.commission || 0),
      withdrawals: Number(withdrawals?.total || 0),
    };

    if (String(req.query.format || "").toLowerCase() === "csv") {
      const lines = [
        "Metric,Value",
        ...Object.entries(metrics).map(([k, v]) => `${k},${v}`),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=affiliate-report.csv");
      return res.send(lines.join("\n"));
    }

    return res.json({ range, metrics });
  } catch (e) {
    console.error("[affiliate] reports:", e);
    return res.status(500).json({ error: "Failed to load reports." });
  }
};

exports.getAffiliateNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [announcements] = await pool.query(
      `SELECT a.id, a.public_id AS publicId, a.title, a.body_markdown AS body,
              a.sent_at AS sentAt, rd.read_at AS readAt, 'announcement' AS kind
       FROM announcements a
       INNER JOIN announcement_recipients ar ON ar.announcement_id = a.id AND ar.user_id = ?
       LEFT JOIN announcement_reads rd ON rd.announcement_id = a.id AND rd.user_id = ?
       WHERE a.status = 'sent'
       ORDER BY a.sent_at DESC
       LIMIT 100`,
      [userId, userId]
    );

    let inbox = [];
    try {
      const [inboxRows] = await pool.query(
        `SELECT m.id, m.public_id AS publicId, m.title, m.body_markdown AS body,
                m.sent_at AS sentAt, rd.read_at AS readAt, 'inbox' AS kind
         FROM inbox_messages m
         INNER JOIN inbox_recipients mr ON mr.inbox_message_id = m.id AND mr.user_id = ?
         LEFT JOIN inbox_reads rd ON rd.inbox_message_id = m.id AND rd.user_id = ?
         WHERE m.status = 'sent'
         ORDER BY m.sent_at DESC
         LIMIT 100`,
        [userId, userId]
      );
      inbox = inboxRows || [];
    } catch (e) {
      if (e.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    const [commissionUpdates] = await pool.query(
      `SELECT id, commission_amount AS amount, status, updated_at AS at, 'commission' AS kind
       FROM affiliate_commissions
       WHERE affiliate_id = ?
       ORDER BY updated_at DESC
       LIMIT 50`,
      [req.affiliate.id]
    );

    const [withdrawalUpdates] = await pool.query(
      `SELECT id, amount, status, updated_at AS at, 'withdrawal' AS kind
       FROM affiliate_withdrawals
       WHERE affiliate_id = ?
       ORDER BY updated_at DESC
       LIMIT 50`,
      [req.affiliate.id]
    );

    return res.json({
      announcements: announcements || [],
      personalMessages: inbox,
      commissionUpdates: commissionUpdates || [],
      withdrawalUpdates: withdrawalUpdates || [],
    });
  } catch (e) {
    console.error("[affiliate] notifications:", e);
    return res.status(500).json({ error: "Failed to load notifications." });
  }
};

exports.postAffiliateSupport = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const message = String(req.body?.message || "").trim();
    if (!message || message.length < 5) {
      return res.status(400).json({ error: "Message is required (min 5 characters)." });
    }

    const userId = req.user?.userId || affiliate.user_id;
    await pool.query(
      `INSERT INTO affiliate_support_messages (affiliate_id, user_id, message, status)
       VALUES (?, ?, ?, 'open')`,
      [affiliate.id, userId, message]
    );

    let chatSettings = null;
    try {
      await new Promise((resolve) => {
        getPublicChatWidgetSettings(
          { query: {} },
          {
            json: (data) => {
              chatSettings = data;
              resolve();
            },
            status: () => ({ json: () => resolve() }),
          }
        );
      });
    } catch {
      /* optional */
    }

    const contact = await getAdminSupportContact();

    return res.json({
      ok: true,
      message: "Your message has been received. Our team will contact you via inbox or chat.",
      contact: {
        ...contact,
        chatWidget: chatSettings,
      },
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        error: "Support inbox is not ready. Please contact admin.",
      });
    }
    console.error("[affiliate] support:", e);
    return res.status(500).json({ error: "Failed to submit support request." });
  }
};

exports.getAffiliateSupport = async (req, res) => {
  try {
    let chatSettings = null;
    await new Promise((resolve) => {
      getPublicChatWidgetSettings(
        { query: {} },
        {
          json: (data) => {
            chatSettings = data;
            resolve();
          },
          status: () => ({ json: () => resolve() }),
        }
      );
    });

    const contact = await getAdminSupportContact();

    let myMessages = [];
    try {
      const [rows] = await pool.query(
        `SELECT id, message, status, admin_reply AS adminReply, replied_at AS repliedAt, created_at AS createdAt
         FROM affiliate_support_messages
         WHERE affiliate_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.affiliate.id]
      );
      myMessages = rows || [];
    } catch (e) {
      if (e.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    return res.json({
      contact,
      chatWidget: chatSettings,
      messages: myMessages,
    });
  } catch (e) {
    console.error("[affiliate] support get:", e);
    return res.status(500).json({ error: "Failed to load support options." });
  }
};
