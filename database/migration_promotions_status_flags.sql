-- Promotions: status lifecycle (draft/scheduled/active/ended) + is_paused / is_archived flags
-- Safe to re-run on DBs that already have promotions from migration_promotions.sql

USE jeetowin;

-- Add flag columns (ignore if already present)
SET @has_is_paused := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'is_paused'
);
SET @sql_paused := IF(
  @has_is_paused = 0,
  'ALTER TABLE promotions ADD COLUMN is_paused TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql_paused;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_is_archived := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'is_archived'
);
SET @sql_archived := IF(
  @has_is_archived = 0,
  'ALTER TABLE promotions ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0 AFTER is_paused',
  'SELECT 1'
);
PREPARE stmt FROM @sql_archived;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Legacy status values -> flags
UPDATE promotions SET is_paused = 1 WHERE status = 'paused';
UPDATE promotions SET is_archived = 1 WHERE status = 'archived';
UPDATE promotions SET archived_at = COALESCE(archived_at, NOW()) WHERE status = 'archived' AND archived_at IS NULL;

UPDATE promotions SET status = 'draft' WHERE status IN ('paused', 'archived');

-- Must include 'ended' in ENUM before assigning it (old schema has no 'ended')
ALTER TABLE promotions
  MODIFY COLUMN status ENUM('draft','scheduled','active','paused','archived','ended')
  NOT NULL DEFAULT 'draft';

-- Recompute base status from schedule (session NOW(); align MySQL session to PKT in production if needed)
UPDATE promotions
SET status = 'ended'
WHERE starts_at IS NOT NULL
  AND ends_at IS NOT NULL
  AND ends_at <= NOW();

UPDATE promotions
SET status = 'scheduled'
WHERE starts_at IS NOT NULL
  AND ends_at IS NOT NULL
  AND starts_at > NOW()
  AND ends_at > NOW()
  AND status <> 'ended';

UPDATE promotions
SET status = 'active'
WHERE starts_at IS NOT NULL
  AND ends_at IS NOT NULL
  AND starts_at <= NOW()
  AND ends_at > NOW();

UPDATE promotions
SET status = 'draft'
WHERE starts_at IS NULL AND ends_at IS NULL;

-- Drop legacy enum members (paused/archived no longer used as status)
ALTER TABLE promotions
  MODIFY COLUMN status ENUM('draft','scheduled','active','ended') NOT NULL DEFAULT 'draft';
