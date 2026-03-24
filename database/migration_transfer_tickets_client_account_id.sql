-- Add client_accounts reference to transfer_tickets (for tickets created from client app).
-- Run after client_accounts and transfer_tickets exist.

USE jeetowin;

ALTER TABLE transfer_tickets
  ADD COLUMN client_account_id INT NULL COMMENT 'client_accounts.id when ticket created from client app' AFTER client_id,
  ADD KEY idx_tt_client_account (client_account_id),
  ADD CONSTRAINT fk_tt_client_account FOREIGN KEY (client_account_id) REFERENCES client_accounts(id) ON DELETE SET NULL;
