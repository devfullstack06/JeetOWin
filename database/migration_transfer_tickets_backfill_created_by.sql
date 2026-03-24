-- Optional: client-created tickets left created_by_user_id NULL before client API fix.
-- Sets creator to the client user (same as client_id) so FK and reporting stay consistent.

USE jeetowin;

UPDATE transfer_tickets
SET created_by_user_id = client_id
WHERE created_by_user_id IS NULL;
