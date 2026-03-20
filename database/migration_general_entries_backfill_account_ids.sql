-- Backfill general_entries.from_account_id / to_account_id from display names
-- so Reports → General Entries can resolve accounts.type (From type / To type).
-- Run after accounts + payment_wallets exist. Safe to re-run (only updates NULL ids).

USE jeetowin;

-- Admin Account (ledger id = 1 from migration_accounts.sql)
UPDATE general_entries SET from_account_id = 1
WHERE from_account_id IS NULL AND from_account = 'Admin Account';

UPDATE general_entries SET to_account_id = 1
WHERE to_account_id IS NULL AND to_account = 'Admin Account';

-- Payment wallet by "Name (number)" text
UPDATE general_entries ge
INNER JOIN payment_wallets pw ON ge.to_account = CONCAT(TRIM(pw.name), ' (', TRIM(pw.number), ')')
INNER JOIN accounts a ON a.type = 'payment_wallet' AND a.reference_id = pw.id
SET ge.to_account_id = a.id
WHERE ge.to_account_id IS NULL AND ge.to_account != 'Admin Account';

UPDATE general_entries ge
INNER JOIN payment_wallets pw ON ge.from_account = CONCAT(TRIM(pw.name), ' (', TRIM(pw.number), ')')
INNER JOIN accounts a ON a.type = 'payment_wallet' AND a.reference_id = pw.id
SET ge.from_account_id = a.id
WHERE ge.from_account_id IS NULL AND ge.from_account != 'Admin Account';

-- Client ledger: to_account / from_account stored as username only (no "Client: " prefix)
UPDATE general_entries ge
INNER JOIN users u ON u.username IS NOT NULL AND TRIM(u.username) <> '' AND ge.to_account = TRIM(u.username)
INNER JOIN accounts a ON a.type = 'client' AND a.reference_id = u.id
SET ge.to_account_id = a.id
WHERE ge.to_account_id IS NULL;

UPDATE general_entries ge
INNER JOIN users u ON u.username IS NOT NULL AND TRIM(u.username) <> '' AND ge.from_account = TRIM(u.username)
INNER JOIN accounts a ON a.type = 'client' AND a.reference_id = u.id
SET ge.from_account_id = a.id
WHERE ge.from_account_id IS NULL;
