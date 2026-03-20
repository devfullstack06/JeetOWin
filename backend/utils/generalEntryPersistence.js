/**
 * general_entries column name differs by migration: transaction_number (new) vs trx_id (legacy).
 */

const { pool } = require("../config/database");

/** @type {'transaction_number'|'trx_id'|null|undefined} */
let ledgerColumnCache;
/** @type {boolean | undefined} */
let geAccountIdColumnsCache;

/**
 * Which column stores the public transaction id (PWT… / DP…).
 * @returns {Promise<'transaction_number'|'trx_id'|null>} null if table missing or both column names missing (run migrations).
 */
async function resolveGeneralEntryLedgerColumn() {
  if (ledgerColumnCache !== undefined) return ledgerColumnCache;

  try {
    await pool.query("SELECT transaction_number FROM general_entries LIMIT 0");
    ledgerColumnCache = "transaction_number";
    return ledgerColumnCache;
  } catch (e) {
    if (e && e.code === "ER_NO_SUCH_TABLE") {
      ledgerColumnCache = null;
      return null;
    }
    /* ER_BAD_FIELD_ERROR: column missing — try legacy trx_id */
  }

  try {
    await pool.query("SELECT trx_id FROM general_entries LIMIT 0");
    ledgerColumnCache = "trx_id";
    return ledgerColumnCache;
  } catch (e) {
    if (e && e.code === "ER_NO_SUCH_TABLE") {
      ledgerColumnCache = null;
      return null;
    }
  }

  ledgerColumnCache = null;
  return null;
}

/**
 * True when general_entries has both from_account_id and to_account_id (migration_accounts).
 */
async function resolveGeHasAccountIdColumns() {
  if (geAccountIdColumnsCache !== undefined) return geAccountIdColumnsCache;
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_entries'
         AND COLUMN_NAME IN ('from_account_id','to_account_id')`
    );
    if (Number(rows?.[0]?.c) >= 2) {
      geAccountIdColumnsCache = true;
      return true;
    }
  } catch {
    /* probe */
  }
  try {
    await pool.query("SELECT from_account_id, to_account_id FROM general_entries LIMIT 0");
    geAccountIdColumnsCache = true;
  } catch {
    geAccountIdColumnsCache = false;
  }
  return geAccountIdColumnsCache;
}

function isBadFieldError(err) {
  return err && err.code === "ER_BAD_FIELD_ERROR";
}

function errMsg(err) {
  return String(err.sqlMessage || err.message || "");
}

/**
 * Insert a general entry; tries transaction_number vs trx_id and with/without account id columns.
 *
 * @param {*} conn mysql2 connection (in transaction)
 * @param {object} data
 */
async function insertGeneralEntry(conn, data) {
  const {
    transactionNumber,
    fromAccount,
    fromAccountId,
    toAccount,
    toAccountId,
    amount,
    narration,
  } = data;
  // Nullable FKs: always persist whichever ids we have (do not require BOTH).
  // Previously we only used the 7-column INSERT when both were set; if one side failed
  // we fell back to text-only INSERT and dropped BOTH ids → blank Types on reports.
  const normFromId =
    fromAccountId != null && Number.isFinite(Number(fromAccountId))
      ? Number(fromAccountId)
      : null;
  const normToId =
    toAccountId != null && Number.isFinite(Number(toAccountId)) ? Number(toAccountId) : null;

  async function runInsert(idCol, useAccountIds) {
    if (useAccountIds) {
      await conn.query(
        `INSERT INTO general_entries (${idCol}, from_account, from_account_id, to_account, to_account_id, amount, narration)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionNumber,
          fromAccount,
          normFromId,
          toAccount,
          normToId,
          amount,
          narration,
        ]
      );
    } else {
      await conn.query(
        `INSERT INTO general_entries (${idCol}, from_account, to_account, amount, narration)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionNumber, fromAccount, toAccount, amount, narration]
      );
    }
  }

  const idCols = ["transaction_number", "trx_id"];
  for (const idCol of idCols) {
    try {
      await runInsert(idCol, true);
      return;
    } catch (e) {
      if (!isBadFieldError(e)) throw e;
      const m = errMsg(e);
      if (/from_account_id|to_account_id/i.test(m)) break;
      if (/transaction_number|trx_id/i.test(m)) continue;
      throw e;
    }
  }

  for (const idCol of idCols) {
    try {
      await runInsert(idCol, false);
      return;
    } catch (e) {
      if (!isBadFieldError(e)) throw e;
      const m = errMsg(e);
      if (/transaction_number|trx_id/i.test(m)) continue;
      throw e;
    }
  }

  throw new Error("Could not insert into general_entries (check table columns).");
}

module.exports = {
  resolveGeneralEntryLedgerColumn,
  resolveGeHasAccountIdColumns,
  insertGeneralEntry,
};
