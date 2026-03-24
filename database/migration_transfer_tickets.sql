-- Transfer tickets (client <-> brand company), brand balances, process timers.
-- Run after: brands, brand_companies, users, clients, accounts (for GE account types).

USE jeetowin;

-- Brand company stored balance (OUT deduct / IN credit). May go negative.
ALTER TABLE brand_companies
  ADD COLUMN balance INT NOT NULL DEFAULT 0 AFTER notes;

-- Per-brand SLA timers for transfer countdown (admin + client UX)
ALTER TABLE brands
  ADD COLUMN in_process_minutes INT NOT NULL DEFAULT 15 AFTER sort_order,
  ADD COLUMN out_process_minutes INT NOT NULL DEFAULT 15 AFTER in_process_minutes;

-- Ledger account row per brand_company (reference_id = brand_companies.id)
ALTER TABLE accounts
  MODIFY COLUMN type ENUM('admin', 'payment_wallet', 'client', 'brand_company') NOT NULL DEFAULT 'payment_wallet';

CREATE TABLE IF NOT EXISTS transfer_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  client_account_id INT NULL COMMENT 'client_accounts.id when ticket created from client app',
  brand_companies_id INT NOT NULL,
  direction ENUM('IN','OUT') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reason TEXT NULL COMMENT 'required on reject',
  notes TEXT NULL COMMENT 'optional admin notes; editable when terminal',
  ledger_transaction_number VARCHAR(40) NULL,
  evidence_path VARCHAR(500) NULL,
  created_by_user_id INT NULL,
  updated_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tt_client (client_id),
  KEY idx_tt_client_account (client_account_id),
  KEY idx_tt_status (status),
  KEY idx_tt_brand_co (brand_companies_id),
  KEY idx_tt_created (created_at),
  CONSTRAINT fk_tt_client FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_tt_client_account FOREIGN KEY (client_account_id) REFERENCES client_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_tt_bc FOREIGN KEY (brand_companies_id) REFERENCES brand_companies(id),
  CONSTRAINT fk_tt_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tt_updater FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- If you already had a legacy transfer_tickets table (brand VARCHAR, username VARCHAR, admin_note),
-- migrate manually: add brand_companies_id, backfill from brands+brand_companies, then drop old columns.

-- Separate sequences: first issued id will be TRI569001 / TRO569001
INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('TRI', 569000),
  ('TRO', 569000);
