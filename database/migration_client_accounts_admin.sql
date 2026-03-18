-- Alter client_accounts for admin Accounts > List: status, updated_at, notes, password, brand_id, brand_company_id.
-- Run after brands and brand_companies exist.
-- client_accounts may already have: id, client_id, brand, username, created_at

USE jeetowin;

-- Ensure client_accounts exists (minimal structure if created elsewhere)
CREATE TABLE IF NOT EXISTS client_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NULL,
  brand VARCHAR(150) NULL,
  username VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns (run one at a time; if a column already exists, skip that statement)
ALTER TABLE client_accounts ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active | inactive';
ALTER TABLE client_accounts ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE client_accounts ADD COLUMN notes TEXT NULL;
ALTER TABLE client_accounts ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE client_accounts ADD COLUMN brand_id INT NULL;
ALTER TABLE client_accounts ADD COLUMN brand_company_id INT NULL;

UPDATE client_accounts SET updated_at = created_at WHERE updated_at IS NULL;

-- Indexes for filters (skip if already exist)
ALTER TABLE client_accounts ADD INDEX idx_client_accounts_username (username);
ALTER TABLE client_accounts ADD INDEX idx_client_accounts_brand_id (brand_id);
ALTER TABLE client_accounts ADD INDEX idx_client_accounts_status (status);

-- Optional: foreign keys (uncomment if brands/brand_companies exist)
ALTER TABLE client_accounts ADD CONSTRAINT fk_ca_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE client_accounts ADD CONSTRAINT fk_ca_brand_company FOREIGN KEY (brand_company_id) REFERENCES brand_companies(id) ON DELETE SET NULL;
