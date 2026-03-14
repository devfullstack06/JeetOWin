-- Add deposit/withdraw availability flags to wallet_companies.
-- Run after migration_wallet_companies.sql.

USE jeetowin;

ALTER TABLE wallet_companies
  ADD COLUMN available_for_deposit TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN available_for_withdraw TINYINT NOT NULL DEFAULT 1;
