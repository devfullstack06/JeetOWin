-- Add icon_path to wallet_companies for file-based wallet icons.
-- Run after migration_wallet_companies_add_icon_svg.sql.
-- Keeps icon_svg for backward compatibility (do not drop).

USE jeetowin;

ALTER TABLE wallet_companies
  ADD COLUMN icon_path VARCHAR(255) NULL COMMENT 'Path to uploaded icon e.g. /uploads/wallets/name.svg' AFTER icon_key;
