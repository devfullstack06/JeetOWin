-- Add suggested_username to client_accounts.
-- Idempotent: skips if column already exists.
-- Requires client_accounts table (e.g. migration_client_accounts_admin.sql).

USE jeetowin;

SET @db := DATABASE();
SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client_accounts' AND COLUMN_NAME = 'suggested_username'
);
SET @stmt := IF(@need = 0,
  'ALTER TABLE client_accounts ADD COLUMN suggested_username VARCHAR(150) NULL COMMENT ''Client suggestion when account was requested (from ticket)'' AFTER username',
  'SELECT 1');
PREPARE casu FROM @stmt;
EXECUTE casu;
DEALLOCATE PREPARE casu;

-- Backfill: for existing rows, copy current username into suggested_username where still null
UPDATE client_accounts SET suggested_username = username WHERE suggested_username IS NULL AND username IS NOT NULL AND username != '';
