-- Ledger transaction number (e.g. DP569001) stored on approve; shown in admin View ticket.
-- Idempotent: skips if column already exists (e.g. from updated migration_deposit_tickets.sql).

USE jeetowin;

SET @db := DATABASE();
SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'deposit_tickets' AND COLUMN_NAME = 'ledger_transaction_number'
);
SET @stmt := IF(@need = 0,
  'ALTER TABLE deposit_tickets ADD COLUMN ledger_transaction_number VARCHAR(64) NULL COMMENT ''general_entries transaction_number when approved (DP…)'' AFTER trx_id',
  'SELECT 1');
PREPARE dtl FROM @stmt;
EXECUTE dtl;
DEALLOCATE PREPARE dtl;

-- Optional: backfill from general_entries narration pattern (uncomment if needed)
UPDATE deposit_tickets dt
INNER JOIN general_entries ge
  ON ge.narration LIKE CONCAT('Deposit ticket #', dt.id, ' approved%')
   OR ge.narration LIKE CONCAT('Deposit ticket #', dt.id, ' approved (%')
SET dt.ledger_transaction_number = ge.transaction_number
WHERE dt.status = 'approved' AND dt.ledger_transaction_number IS NULL;
