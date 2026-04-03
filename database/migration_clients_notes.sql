-- Optional admin notes per client (User Info edit form).
-- Run once per environment.

USE jeetowin;

SET @db = DATABASE();

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'notes'
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE clients ADD COLUMN notes TEXT NULL COMMENT ''Admin notes (optional)''',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
