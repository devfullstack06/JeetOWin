-- General entries (ledger-style transactions: from/to account, amount, narration).
-- Run after schema / other migrations as needed.

USE jeetowin;

CREATE TABLE IF NOT EXISTS general_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trx_id VARCHAR(64) NOT NULL COMMENT 'Transaction ID for reference',
  from_account VARCHAR(255) NOT NULL COMMENT 'Transaction from / account debited',
  to_account VARCHAR(255) NOT NULL COMMENT 'Transaction to / account credited',
  amount DECIMAL(15,2) NOT NULL,
  narration TEXT NULL COMMENT 'Notes added to the transaction',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_trx_id (trx_id),
  KEY idx_created_at (created_at),
  KEY idx_from (from_account(100)),
  KEY idx_to (to_account(100)),
  KEY idx_amount (amount)
);
