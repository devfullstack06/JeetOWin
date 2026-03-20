-- Account-based ledger: accounts table + account_id in general_entries.
-- Run after migration_general_entries, migration_admin_account_balance, migration_payment_wallets.
-- Enables unique account identification (multiple accounts can share same name).

USE jeetowin;

-- 1. Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('admin', 'payment_wallet') NOT NULL DEFAULT 'payment_wallet',
  reference_id BIGINT UNSIGNED NULL COMMENT 'payment_wallets.id for payment_wallet type',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ref (type, reference_id),
  KEY idx_type (type)
);

-- 2. Insert Admin Account (id=1)
INSERT INTO accounts (id, name, type, reference_id) VALUES (1, 'Admin Account', 'admin', NULL)
ON DUPLICATE KEY UPDATE name = name;

-- 3. Create account for each payment_wallet (if payment_wallets exists)
  INSERT INTO accounts (name, type, reference_id)
  SELECT CONCAT(p.name, ' (', p.number, ')'), 'payment_wallet', p.id
  FROM payment_wallets p
  WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.type = 'payment_wallet' AND a.reference_id = p.id);

-- 4. Add account_id columns to general_entries (skip if already in migration_general_entries.sql)
SET @db := DATABASE();

SET @need_from := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'from_account_id'
);
SET @stmt := IF(@need_from = 0,
  'ALTER TABLE general_entries ADD COLUMN from_account_id INT NULL AFTER from_account, ADD KEY idx_from_account_id (from_account_id)',
  'SELECT 1');
PREPARE ge_from_id FROM @stmt;
EXECUTE ge_from_id;
DEALLOCATE PREPARE ge_from_id;

SET @need_to := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'general_entries' AND COLUMN_NAME = 'to_account_id'
);
SET @stmt := IF(@need_to = 0,
  'ALTER TABLE general_entries ADD COLUMN to_account_id INT NULL AFTER to_account, ADD KEY idx_to_account_id (to_account_id)',
  'SELECT 1');
PREPARE ge_to_id FROM @stmt;
EXECUTE ge_to_id;
DEALLOCATE PREPARE ge_to_id;

-- 5. Backfill: Admin Account
UPDATE general_entries SET from_account_id = 1 WHERE from_account = 'Admin Account' AND from_account_id IS NULL;
UPDATE general_entries SET to_account_id = 1 WHERE to_account = 'Admin Account' AND to_account_id IS NULL;

-- 6. Backfill: Payment wallet accounts (match by name/number)
UPDATE general_entries ge
INNER JOIN payment_wallets pw ON ge.to_account = CONCAT(TRIM(pw.name), ' (', TRIM(pw.number), ')')
INNER JOIN accounts a ON a.type = 'payment_wallet' AND a.reference_id = pw.id
SET ge.to_account_id = a.id
WHERE ge.to_account_id IS NULL AND ge.to_account != 'Admin Account';

UPDATE general_entries ge
INNER JOIN payment_wallets pw ON ge.from_account = CONCAT(TRIM(pw.name), ' (', TRIM(pw.number), ')')
INNER JOIN accounts a ON a.type = 'payment_wallet' AND a.reference_id = pw.id
SET ge.from_account_id = a.id
WHERE ge.from_account_id IS NULL AND ge.from_account != 'Admin Account';
