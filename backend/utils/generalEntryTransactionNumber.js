/**
 * Allocates sequential transaction numbers for general_entries:
 * PWT… payment wallet top-up, PWD… deduct, DP… deposit approval.
 * Requires table general_entry_sequences (see database migration).
 *
 * @param {*} conn mysql2 pool connection (use inside a transaction for atomicity with the insert).
 * @param {'PWT'|'PWD'|'DP'} seriesCode
 * @returns {Promise<string>} e.g. PWT569001
 */
const INITIAL_LAST = 569000; // first allocated value after increment = 569001

const GE_TXN_SERIES = {
  TOPUP: "PWT",
  DEDUCT: "PWD",
  DEPOSIT: "DP",
};

async function allocateGeneralEntryTransactionNumber(conn, seriesCode) {
  const [upd] = await conn.query(
    "UPDATE general_entry_sequences SET last_number = last_number + 1 WHERE series = ?",
    [seriesCode]
  );
  if (!upd.affectedRows) {
    await conn.query(
      "INSERT INTO general_entry_sequences (series, last_number) VALUES (?, ?)",
      [seriesCode, INITIAL_LAST]
    );
    await conn.query(
      "UPDATE general_entry_sequences SET last_number = last_number + 1 WHERE series = ?",
      [seriesCode]
    );
  }
  const [rows] = await conn.query(
    "SELECT last_number FROM general_entry_sequences WHERE series = ? LIMIT 1",
    [seriesCode]
  );
  if (!rows?.length) {
    throw new Error(`general_entry_sequences: missing series ${seriesCode}`);
  }
  return `${seriesCode}${rows[0].last_number}`;
}

module.exports = {
  allocateGeneralEntryTransactionNumber,
  GE_TXN_SERIES,
};
