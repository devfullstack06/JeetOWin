-- Last successful login (updated on every POST /api/auth/login for any role).
-- Run once per environment.

USE jeetowin;

SET @db = DATABASE();

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login_at'
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL DEFAULT NULL COMMENT ''Last successful login'' AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
