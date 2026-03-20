-- Remove redundant "Client: " prefix from accounts.name where type = 'client'.
-- Safe to run multiple times (only rows matching the prefix are updated).

USE jeetowin;

UPDATE accounts
SET name = TRIM(SUBSTRING(name, 9))
WHERE type = 'client'
  AND name LIKE 'Client: %';

-- Optional: if general_entries.to_account still uses the old "Client: username" text, uncomment:
UPDATE general_entries
SET to_account = TRIM(SUBSTRING(to_account, 9))
WHERE to_account LIKE 'Client: %';
