-- deposit_tickets: client deposit requests. Admin approves/rejects.
-- Links: client_id (user), optional client_account_id; wallet_company_id, payment_wallet_id.
-- Slip/evidence paths relative to uploads (e.g. /uploads/deposit-slips/..., /uploads/deposit-evidence/...).

USE jeetowin;

CREATE TABLE IF NOT EXISTS deposit_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL COMMENT 'Client user this deposit is for',
  created_by_user_id INT NULL COMMENT 'User who created the ticket (client self-service or admin)',
  client_account_id INT NULL COMMENT 'Optional: which client_account (for display username)',
  wallet_company_id BIGINT UNSIGNED NOT NULL,
  payment_wallet_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected',
  trx_id VARCHAR(30) NULL COMMENT 'Alphanumeric, max 30, lowercase',
  ledger_transaction_number VARCHAR(64) NULL COMMENT 'general_entries transaction_number when approved (DP…)',
  slip_path VARCHAR(500) NULL COMMENT 'e.g. /uploads/deposit-slips/filename',
  evidence_path VARCHAR(500) NULL COMMENT 'e.g. /uploads/deposit-evidence/filename',
  reason TEXT NULL COMMENT 'Rejection reason',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deposit_tickets_client_id (client_id),
  INDEX idx_deposit_tickets_status (status),
  INDEX idx_deposit_tickets_created_at (created_at),
  INDEX idx_deposit_tickets_trx_id (trx_id),
  FOREIGN KEY (wallet_company_id) REFERENCES wallet_companies(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_wallet_id) REFERENCES payment_wallets(id) ON DELETE RESTRICT
);
