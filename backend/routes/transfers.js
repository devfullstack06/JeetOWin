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
    const [rows] = await pool.query(
      "SELECT id, client_id FROM transfer_tickets WHERE id = ? LIMIT 1",
      [ticketId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    if (rows[0].client_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

    if (status === "rejected") {
      await pool.query(
        "UPDATE transfer_tickets SET status='rejected', admin_note='Rejected (dev mock)', updated_at=NOW() WHERE id=?",
        [ticketId]
      );
      return res.json({ ok: true });
    }

    await pool.query(
      "UPDATE transfer_tickets SET status='approved', admin_note=NULL, updated_at=NOW() WHERE id=?",
      [ticketId]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("[transfers] PATCH /tickets/:id/mock error:", e);
    return res.status(500).json({ error: "Mock update failed" });
  }
});

module.exports = router;
