-- withdraw_tickets: client withdraw requests. Admin approves/rejects.
-- Links: client_id (user), client_wallet_id; optional payment_wallet_id set on approve.
-- Uses payment_wallets with available_for_withdraw=1 for payout on approve.
-- Run after: client_wallets, wallet_companies, payment_wallets, general_entry_sequences exist.

USE jeetowin;

-- =============================================================================
-- 1. withdraw_tickets table
-- =============================================================================
CREATE TABLE IF NOT EXISTS withdraw_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL COMMENT 'Client user requesting withdraw',
  created_by_user_id INT NULL COMMENT 'User who created (client self-service or admin)',
  client_wallet_id BIGINT UNSIGNED NOT NULL COMMENT 'Client wallet to send money to',
  payment_wallet_id INT NULL COMMENT 'Payment wallet used for payout (set on approve)',
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected',
  trx_id VARCHAR(30) NULL COMMENT 'Admin payout/transfer reference, alphanumeric max 30',
  ledger_transaction_number VARCHAR(64) NULL COMMENT 'general_entries transaction_number when approved (WD…)',
  reason TEXT NULL COMMENT 'Rejection reason',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_withdraw_tickets_client_id (client_id),
  INDEX idx_withdraw_tickets_status (status),
  INDEX idx_withdraw_tickets_created_at (created_at),
  INDEX idx_withdraw_tickets_trx_id (trx_id),
  FOREIGN KEY (client_wallet_id) REFERENCES client_wallets(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_wallet_id) REFERENCES payment_wallets(id) ON DELETE SET NULL
);

-- =============================================================================
-- 2. WD series in general_entry_sequences (idempotent)
-- =============================================================================
INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('WD', 569000);

-- =============================================================================
-- 3. wallet_companies: min_withdraw, deposit_process_minutes, withdraw_process_minutes
-- Idempotent: skips if column already exists.
-- =============================================================================
SET @db := DATABASE();

-- min_withdraw: per-company minimum withdraw shown on client side (Rs)
SET @need_min := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'wallet_companies' AND COLUMN_NAME = 'min_withdraw'
);
SET @stmt_min := IF(@need_min = 0,
  'ALTER TABLE wallet_companies ADD COLUMN min_withdraw DECIMAL(12,2) NULL COMMENT ''Minimum withdraw amount (Rs) for client display'' AFTER available_for_withdraw',
  'SELECT 1');
PREPARE s1 FROM @stmt_min;
EXECUTE s1;
DEALLOCATE PREPARE s1;

-- deposit_process_minutes: DP ticket countdown time (minutes)
SET @need_dp := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'wallet_companies' AND COLUMN_NAME = 'deposit_process_minutes'
);
SET @stmt_dp := IF(@need_dp = 0,
  'ALTER TABLE wallet_companies ADD COLUMN deposit_process_minutes INT NULL COMMENT ''Deposit ticket process time (minutes) for countdown'' AFTER min_withdraw',
  'SELECT 1');
PREPARE s2 FROM @stmt_dp;
EXECUTE s2;
DEALLOCATE PREPARE s2;

-- withdraw_process_minutes: WD ticket countdown time (minutes)
SET @need_wd := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'wallet_companies' AND COLUMN_NAME = 'withdraw_process_minutes'
);
SET @stmt_wd := IF(@need_wd = 0,
  'ALTER TABLE wallet_companies ADD COLUMN withdraw_process_minutes INT NULL COMMENT ''Withdraw ticket process time (minutes) for countdown'' AFTER deposit_process_minutes',
  'SELECT 1');
PREPARE s3 FROM @stmt_wd;
EXECUTE s3;
DEALLOCATE PREPARE s3;
