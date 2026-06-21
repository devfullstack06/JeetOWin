const { pool } = require("../config/database");
const { pktYmdForInstant, pktMonthBoundsUtc } = require("../utils/pakistanTime");
const { recalculateAccrualsForSourceClient } = require("../services/referralAccrualService");

async function main() {
  const monthYm = process.argv[2] || pktYmdForInstant().slice(0, 7);
  const { start, end } = pktMonthBoundsUtc(monthYm);
  const [transfers] = await pool.query(
    `SELECT DISTINCT tt.client_id
     FROM transfer_tickets tt
     WHERE tt.status = 'approved' AND tt.updated_at >= ? AND tt.updated_at <= ?`,
    [start, end]
  );

  const userIds = transfers.map((t) => t.client_id);
  if (!userIds.length) {
    console.log("No approved transfers for", monthYm);
    await pool.end();
    return;
  }

  const [clients] = await pool.query("SELECT id, user_id FROM clients WHERE user_id IN (?)", [
    userIds,
  ]);

  let total = 0;
  for (const client of clients) {
    const result = await recalculateAccrualsForSourceClient(client.id, monthYm);
    console.log(client.id, result);
    if (result.ok) total += result.rowsWritten;
  }

  const [[countRow]] = await pool.query("SELECT COUNT(*) AS cnt FROM referral_accruals");
  console.log(`Backfill complete for ${monthYm}. Rows written: ${total}. Total accruals: ${countRow.cnt}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
