/**
 * Referral commission balances (earned, released, releasable).
 */

const { pool } = require("../config/database");

async function getCommissionTotals(earnerClientId) {
  const [[acc]] = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS earned
     FROM referral_accruals
     WHERE earner_client_id = ? AND status != 'void'`,
    [earnerClientId]
  );

  const [[rel]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS withdrawn
     FROM referral_releases
     WHERE earner_client_id = ?`,
    [earnerClientId]
  );

  const earned = Math.round(Number(acc?.earned || 0) * 100) / 100;
  const withdrawn = Math.round(Number(rel?.withdrawn || 0) * 100) / 100;
  const balance = Math.round((earned - withdrawn) * 100) / 100;
  const releasable = Math.max(0, balance);

  return { earned, withdrawn, balance, releasable };
}

/**
 * Monthly commission totals for earner.
 */
async function getCommissionByMonth(earnerClientId) {
  const [rows] = await pool.query(
    `SELECT accrual_month AS monthYm, COALESCE(SUM(amount), 0) AS commission
     FROM referral_accruals
     WHERE earner_client_id = ? AND status != 'void'
     GROUP BY accrual_month
     ORDER BY accrual_month DESC`,
    [earnerClientId]
  );
  return (rows || []).map((r) => ({
    monthYm: r.monthYm,
    commission: Math.round(Number(r.commission) * 100) / 100,
  }));
}

/**
 * Release commission to client wallet (partial allowed).
 */
async function releaseCommission({
  earnerClientId,
  amount,
  negativeHandling,
  note,
  releasedByUserId,
}) {
  const releaseAmount = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(releaseAmount) || releaseAmount <= 0) {
    throw new Error("Release amount must be positive");
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const totals = await getCommissionTotals(earnerClientId);
    if (releaseAmount > totals.releasable + 0.001) {
      throw new Error(`Amount exceeds releasable balance (${totals.releasable})`);
    }

    const [relResult] = await connection.query(
      `INSERT INTO referral_releases
        (earner_client_id, amount, negative_handling, note, released_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        earnerClientId,
        releaseAmount,
        negativeHandling || "none",
        note || null,
        releasedByUserId || null,
      ]
    );

    await connection.query(
      "UPDATE clients SET balance = balance + ? WHERE id = ?",
      [releaseAmount, earnerClientId]
    );

    await connection.commit();
    connection.release();

    return { releaseId: relResult.insertId, amount: releaseAmount };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Apply negative accrual month at release (deduct wallet or postpone).
 * Called when admin releases a negative period explicitly.
 */
async function applyNegativeAccrualRelease({
  earnerClientId,
  amount,
  mode,
  note,
  releasedByUserId,
}) {
  const negAmount = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(negAmount) || negAmount >= 0) {
    throw new Error("Negative release requires a negative amount");
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    if (mode === "deduct_wallet") {
      await connection.query(
        "UPDATE clients SET balance = balance + ? WHERE id = ?",
        [negAmount, earnerClientId]
      );
    }

    const [relResult] = await connection.query(
      `INSERT INTO referral_releases
        (earner_client_id, amount, negative_handling, note, released_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        earnerClientId,
        negAmount,
        mode === "deduct_wallet" ? "deduct_wallet" : "postpone_offset",
        note || null,
        releasedByUserId || null,
      ]
    );

    await connection.commit();
    connection.release();
    return { releaseId: relResult.insertId, amount: negAmount, mode };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

module.exports = {
  getCommissionTotals,
  getCommissionByMonth,
  releaseCommission,
  applyNegativeAccrualRelease,
};
