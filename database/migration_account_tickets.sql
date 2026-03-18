-- account_tickets: Pending / Overdue / Rejected tickets. Approved tickets are deleted after creating client_accounts.
-- Ensure table has: id, client_id, brand, suggested_username, status, reason, notes, created_at, updated_at

USE jeetowin;

CREATE TABLE IF NOT EXISTS account_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  brand VARCHAR(150) NOT NULL,
  suggested_username VARCHAR(150) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | rejected',
  reason TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
);

-- If table already exists, add missing columns (run one at a time; skip if column exists)
ALTER TABLE account_tickets ADD COLUMN notes TEXT NULL;
ALTER TABLE account_tickets ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP;
