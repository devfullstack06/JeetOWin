-- Add FK-style columns so admin Reports can show From/To *types* (from accounts.type).
-- Idempotent: skips if columns already exist.
-- Run after migration_general_entries.sql (and ideally migration_general_entries_transaction_number.sql).

USE jeetowin;

SET @db := DATABASE();

SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'from_account_id'
);
SET @stmt := IF(@need = 0,
  'ALTER TABLE general_entries ADD COLUMN from_account_id INT NULL COMMENT ''accounts.id (debit)'' AFTER from_account, ADD KEY idx_from_account_id (from_account_id)',
  'SELECT 1');
PREPARE geaf FROM @stmt;
EXECUTE geaf;
DEALLOCATE PREPARE geaf;

SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'to_account_id'
);
SET @stmt := IF(@need = 0,
  'ALTER TABLE general_entries ADD COLUMN to_account_id INT NULL COMMENT ''accounts.id (credit)'' AFTER to_account, ADD KEY idx_to_account_id (to_account_id)',
  'SELECT 1');
PREPARE geat FROM @stmt;
EXECUTE geat;
DEALLOCATE PREPARE geat;
