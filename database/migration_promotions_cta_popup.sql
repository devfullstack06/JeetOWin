-- Promotions: CTA link vs details popup (markdown body)
USE jeetowin;

SET @has_cta_mode := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'cta_mode'
);
SET @sql1 := IF(
  @has_cta_mode = 0,
  "ALTER TABLE promotions ADD COLUMN cta_mode ENUM('link','popup') NOT NULL DEFAULT 'link' AFTER open_in_new_tab",
  'SELECT 1'
);
PREPARE stmt FROM @sql1;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_details := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'details_markdown'
);
SET @sql2 := IF(
  @has_details = 0,
  'ALTER TABLE promotions ADD COLUMN details_markdown TEXT NULL AFTER cta_mode',
  'SELECT 1'
);
PREPARE stmt FROM @sql2;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
