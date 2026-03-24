const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");

const authenticateToken = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

const {
  getTransferHistory,
  createTransferTicket,
  getTransferTicketStatus,
  getTransferBrands,
  getTransferAccountsByBrand,
} = require("../controllers/transfersController");

/**
 * Ensure client role
 */
function requireClient(req, res, next) {
  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({ error: "Forbidden: client role required" });
  }
  next();
}

// All transfers routes require logged-in client
router.use(authenticateToken, roleCheck("client"), requireClient);

// History: last N
router.get("/history", getTransferHistory);

// Create ticket
router.post("/tickets", createTransferTicket);

// Poll ticket status
router.get("/tickets/:ticketId", getTransferTicketStatus);

// Helpers for Step2
router.get("/brands", getTransferBrands);
router.get("/accounts", getTransferAccountsByBrand);

/**
 * DEV-ONLY endpoint to simulate approval/rejection without admin UI.
 * PATCH /api/transfers/tickets/:ticketId/mock?status=approved|rejected
 */
router.patch("/tickets/:ticketId/mock", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const ticketId = req.params.ticketId;
  const status = String(req.query.status || "").toLowerCase();

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" });
  }

  try {
    const [trows] = await pool.query(
      "SELECT id, client_id, amount, direction, status FROM transfer_tickets WHERE id = ? LIMIT 1",
      [ticketId]
    );
    if (!trows.length) return res.status(404).json({ error: "Ticket not found" });
    const tk = trows[0];
    if (tk.client_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });
    if ((tk.status || "").toLowerCase() !== "pending") {
      return res.status(400).json({ error: "Ticket is not pending" });
    }

    if (status === "rejected") {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        if (String(tk.direction || "").toUpperCase() === "IN") {
          const [crows] = await conn.query(
            "SELECT balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
            [tk.client_id]
          );
          if (crows.length) {
            const nb = Number(crows[0].balance || 0) + Number(tk.amount || 0);
            await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [nb, tk.client_id]);
          }
        }
        await conn.query(
          "UPDATE transfer_tickets SET status='rejected', reason='Rejected (dev mock)', updated_at=NOW() WHERE id=?",
          [ticketId]
        );
        await conn.commit();
      } catch (e) {
        try {
          await conn.rollback();
        } catch (_) {}
        throw e;
      } finally {
        conn.release();
      }
      return res.json({ ok: true });
    }

    return res.status(400).json({
      error: "Mock approve disabled — use admin UI (balances & ledger are not updated by mock approve).",
    });
  } catch (e) {
    console.error("[transfers] PATCH /tickets/:id/mock error:", e);
    return res.status(500).json({ error: "Mock update failed" });
  }
});

module.exports = router;
