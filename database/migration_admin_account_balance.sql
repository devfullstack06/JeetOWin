-- Stored balance for Admin Account (avoids recalculating from general_entries).
-- Run after migration_general_entries.sql.
-- TopUp/Deduct and GET admin-account-balance use this table.

USE jeetowin;

CREATE TABLE IF NOT EXISTS admin_account_balance (
  id INT PRIMARY KEY DEFAULT 1,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ensure one row exists (balance = 0 for fresh install)
INSERT INTO admin_account_balance (id, balance) VALUES (1, 0)
ON DUPLICATE KEY UPDATE id = id;

-- Sync balance from general_entries (works even if general_entries is empty)
UPDATE admin_account_balance a
INNER JOIN (
  SELECT COALESCE(
    SUM(CASE WHEN to_account = 'Admin Account' THEN amount ELSE 0 END), 0
  ) - COALESCE(
    SUM(CASE WHEN from_account = 'Admin Account' THEN amount ELSE 0 END), 0
  ) AS bal FROM general_entries
) b ON 1=1
SET a.balance = b.bal
WHERE a.id = 1;
