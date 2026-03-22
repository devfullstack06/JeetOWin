-- Add slip_path to withdraw_tickets for optional payout slip on approve.
-- Idempotent: skips if column already exists.

USE jeetowin;

SET @db := DATABASE();

SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'withdraw_tickets' AND COLUMN_NAME = 'slip_path'
);

SET @stmt := IF(@need = 0,
  'ALTER TABLE withdraw_tickets ADD COLUMN slip_path VARCHAR(500) NULL COMMENT ''Payout slip image path (optional, on approve)'' AFTER ledger_transaction_number',
  'SELECT 1');

PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
