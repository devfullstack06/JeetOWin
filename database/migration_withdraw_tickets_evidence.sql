-- Add evidence_path to withdraw_tickets for optional rejection evidence image.
-- Idempotent: skips if column already exists.

USE jeetowin;

SET @db := DATABASE();

SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'withdraw_tickets' AND COLUMN_NAME = 'evidence_path'
);

SET @stmt := IF(@need = 0,
  'ALTER TABLE withdraw_tickets ADD COLUMN evidence_path VARCHAR(500) NULL COMMENT ''Rejection evidence image path (e.g. /uploads/withdraw-evidence/filename)'' AFTER reason',
  'SELECT 1');

PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
