-- One-time initial password for client display (set at account creation / ticket approve).
-- Run once per environment after client_accounts exists.

USE jeetowin;

SET @db = DATABASE();

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client_accounts' AND COLUMN_NAME = 'initial_password'
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE client_accounts ADD COLUMN initial_password VARCHAR(255) NULL COMMENT ''One-time initial password for client UI'' AFTER password_hash',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
