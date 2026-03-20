/**
 * Ledger account IDs used in general_entries.from_account_id / to_account_id.
 * These reference accounts.id (PK), not accounts.reference_id.
 *
 * Admin Account row is created in migration_accounts.sql with id=1, type='admin',
 * reference_id=NULL — there is no separate "admin entity" row to point at.
 * Payment wallets use type='payment_wallet', reference_id=payment_wallets.id.
 * Clients use type='client', reference_id=clients.user_id (= users.id).
 */
const ADMIN_LEDGER_ACCOUNT_ID = 1;

module.exports = {
  ADMIN_LEDGER_ACCOUNT_ID,
};
