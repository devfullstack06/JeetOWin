-- client_wallets: client's registered bank/wallet accounts per wallet company.
-- Run after: wallet_companies exists.
-- Idempotent: CREATE TABLE IF NOT EXISTS (no-op if table exists).

USE jeetowin;

CREATE TABLE IF NOT EXISTS client_wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  wallet_company_id BIGINT UNSIGNED NOT NULL,
  account_title VARCHAR(50) NOT NULL,
  account_number VARCHAR(24) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_wallet_unique (client_id, wallet_company_id, account_number),
  KEY idx_client_wallets_client (client_id),
  KEY idx_client_wallets_company (wallet_company_id),
  CONSTRAINT fk_client_wallets_company FOREIGN KEY (wallet_company_id)
    REFERENCES wallet_companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
