-- Payment wallets (deposit receiving accounts) per wallet company.
-- Run after wallet_companies and migration_wallet_companies_deposit_withdraw.

USE jeetowin;

CREATE TABLE IF NOT EXISTS payment_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL COMMENT 'Alphabetic only, max 20',
  number VARCHAR(30) NOT NULL COMMENT 'Alphanumeric, max 30',
  wallet_company_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Active = show on client',
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_withdraw DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_withdraw DECIMAL(12,2) NOT NULL DEFAULT 0,
  qr_image_path VARCHAR(500) NULL COMMENT 'QR image filename in uploads',
  available_for_deposit TINYINT NOT NULL DEFAULT 1,
  available_for_withdraw TINYINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_company_id) REFERENCES wallet_companies(id) ON DELETE RESTRICT
);
