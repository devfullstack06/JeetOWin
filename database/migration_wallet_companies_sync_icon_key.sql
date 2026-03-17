-- Sync icon_key from icon_path so both point to the same uploaded filename.
-- Run after migration_wallet_companies_icon_path.sql and after icons have been uploaded.

USE jeetowin;

UPDATE wallet_companies
SET icon_key = REPLACE(icon_path, '/uploads/wallets/', '')
WHERE icon_path IS NOT NULL AND icon_path != '';
