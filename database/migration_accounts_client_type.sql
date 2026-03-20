-- Extend accounts to support client ledger accounts.
-- Uses reference_id = clients.user_id for type='client'.

USE jeetowin;

-- 1) Add 'client' to accounts.type enum
ALTER TABLE accounts
  MODIFY COLUMN type ENUM('admin', 'payment_wallet', 'client') NOT NULL DEFAULT 'payment_wallet';

-- 2) Backfill one account per client (reference_id = clients.user_id)
-- name = username only; type = 'client' identifies ledger client accounts
INSERT INTO accounts (name, type, reference_id)
SELECT COALESCE(NULLIF(TRIM(u.username), ''), CONCAT('#', c.user_id)), 'client', c.user_id
FROM clients c
INNER JOIN users u ON u.id = c.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM accounts a
  WHERE a.type = 'client' AND a.reference_id = c.user_id
);
