-- General entries (ledger-style transactions: from/to account, amount, narration).
-- Run after schema / other migrations as needed.
--
-- Note: There is NO "type" column on this table. From/To *types* in the admin report
-- come from JOIN accounts ON from_account_id / to_account_id (accounts.type).
-- from_account_id / to_account_id link to accounts.id (see migration_accounts.sql).

USE jeetowin;

CREATE TABLE IF NOT EXISTS general_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(64) NOT NULL COMMENT 'Transaction No. (PWT/PWD/DP + seq); see general_entry_sequences',
  from_account VARCHAR(255) NOT NULL COMMENT 'Transaction from / account debited',
  from_account_id INT NULL COMMENT 'accounts.id (debit); used for type + filters',
  to_account VARCHAR(255) NOT NULL COMMENT 'Transaction to / account credited',
  to_account_id INT NULL COMMENT 'accounts.id (credit); used for type + filters',
  amount DECIMAL(15,2) NOT NULL,
  narration TEXT NULL COMMENT 'Notes added to the transaction',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_transaction_number (transaction_number),
  KEY idx_created_at (created_at),
  KEY idx_from (from_account(100)),
  KEY idx_to (to_account(100)),
  KEY idx_from_account_id (from_account_id),
  KEY idx_to_account_id (to_account_id),
  KEY idx_amount (amount)
);

-- Counters for transaction_number: PWT (top-up), PWD (deduct), DP (deposit); first issued = 569001
CREATE TABLE IF NOT EXISTS general_entry_sequences (
  series VARCHAR(16) NOT NULL PRIMARY KEY COMMENT 'PWT | PWD | DP',
  last_number BIGINT UNSIGNED NOT NULL COMMENT 'Last numeric suffix; next = last_number + 1'
) ENGINE=InnoDB;

INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('PWT', 569000),
  ('PWD', 569000),
  ('DP', 569000);
