-- Who created the deposit ticket: client (self-service) or admin (on behalf of client).
-- Idempotent: skips if column already exists.

USE jeetowin;

SET @db := DATABASE();
SET @need := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'deposit_tickets' AND COLUMN_NAME = 'created_by_user_id'
);
SET @stmt := IF(@need = 0,
  'ALTER TABLE deposit_tickets ADD COLUMN created_by_user_id INT NULL COMMENT ''User who created this ticket (client or admin)'' AFTER client_id',
  'SELECT 1');
PREPARE dtc FROM @stmt;
EXECUTE dtc;
DEALLOCATE PREPARE dtc;

-- Historical rows: assume created by the client the ticket belongs to
UPDATE deposit_tickets SET created_by_user_id = client_id WHERE created_by_user_id IS NULL;
