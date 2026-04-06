-- Who created the row: client username (ticket flow) or admin username (admin create).
-- Run once per environment after client_accounts exists.

USE jeetowin;

SET @db = DATABASE();

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client_accounts' AND COLUMN_NAME = 'created_by_username'
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE client_accounts ADD COLUMN created_by_username VARCHAR(255) NULL COMMENT ''users.username of client (ticket) or admin (admin create)'' AFTER initial_password',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
