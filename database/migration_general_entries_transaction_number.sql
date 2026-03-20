-- Replace general_entries.trx_id with transaction_number + sequence table for PWT/PWD/DP numbers.
-- Run after migration_general_entries.sql and migration_accounts.sql.
-- Idempotent: safe if trx_id was already renamed.

USE jeetowin;

CREATE TABLE IF NOT EXISTS general_entry_sequences (
  series VARCHAR(16) NOT NULL PRIMARY KEY COMMENT 'PWT | PWD | DP',
  last_number BIGINT UNSIGNED NOT NULL COMMENT 'Last numeric suffix issued (next = last_number + 1 from 569001)'
) ENGINE=InnoDB;

INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('PWT', 569000),
  ('PWD', 569000),
  ('DP', 569000);

DELIMITER $$

DROP PROCEDURE IF EXISTS jeetowin_migrate_ge_transaction_number $$

CREATE PROCEDURE jeetowin_migrate_ge_transaction_number()
BEGIN
  DECLARE col_trx INT DEFAULT 0;
  DECLARE col_txn INT DEFAULT 0;
  DECLARE idx_name VARCHAR(128) DEFAULT NULL;

  SELECT COUNT(*) INTO col_trx FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'trx_id';

  SELECT COUNT(*) INTO col_txn FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'transaction_number';

  IF col_trx > 0 AND col_txn = 0 THEN
    SELECT INDEX_NAME INTO idx_name FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'trx_id'
        AND SEQ_IN_INDEX = 1
      LIMIT 1;
    IF idx_name IS NOT NULL AND idx_name <> '' THEN
      SET @dsql = CONCAT('ALTER TABLE general_entries DROP INDEX `', idx_name, '`');
      PREPARE stmt FROM @dsql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
    ALTER TABLE general_entries
      CHANGE COLUMN trx_id transaction_number VARCHAR(64) NOT NULL
        COMMENT 'Transaction No.: PWT/PWD/DP + sequential from general_entry_sequences',
      ADD UNIQUE KEY uk_transaction_number (transaction_number);
  END IF;
END$$

DELIMITER ;

CALL jeetowin_migrate_ge_transaction_number();
DROP PROCEDURE jeetowin_migrate_ge_transaction_number;

-- Raise sequence counters if rows already use PWT569xxx / PWD569xxx / DP569xxx
UPDATE general_entry_sequences SET last_number = GREATEST(
  last_number,
  IFNULL((SELECT MAX(CAST(SUBSTRING(ge.transaction_number, 4) AS UNSIGNED))
          FROM general_entries ge WHERE ge.transaction_number REGEXP '^PWT[0-9]+$'), 569000)
) WHERE series = 'PWT';

UPDATE general_entry_sequences SET last_number = GREATEST(
  last_number,
  IFNULL((SELECT MAX(CAST(SUBSTRING(ge.transaction_number, 4) AS UNSIGNED))
          FROM general_entries ge WHERE ge.transaction_number REGEXP '^PWD[0-9]+$'), 569000)
) WHERE series = 'PWD';

UPDATE general_entry_sequences SET last_number = GREATEST(
  last_number,
  IFNULL((SELECT MAX(CAST(SUBSTRING(ge.transaction_number, 4) AS UNSIGNED))
          FROM general_entries ge WHERE ge.transaction_number REGEXP '^DP[0-9]+$'), 569000)
) WHERE series = 'DP';
