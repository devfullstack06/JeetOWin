-- Save brand-company ledger account type from brand_companies.type
-- so General Entries Type shows Master/Affiliate.

USE jeetowin;

-- 1) Extend accounts.type enum for brand company roles (keep legacy brand_company for safety).
ALTER TABLE accounts
  MODIFY COLUMN type ENUM('admin','payment_wallet','client','brand_company','master','affiliate')
  NOT NULL DEFAULT 'payment_wallet';

-- 2) Backfill accounts.type by reference_id -> brand_companies.id.
UPDATE accounts a
INNER JOIN brand_companies bc ON bc.id = a.reference_id
SET a.type = CASE
  WHEN LOWER(COALESCE(bc.type, 'master')) = 'affiliate' THEN 'affiliate'
  ELSE 'master'
END
WHERE a.type = 'brand_company';

